import { fail, ok, safeMessage, type Result } from '../core/result';
import type { createSupabaseServerClient } from '../supabase/server';
import { fallbackAnswerForMode, normalizeAiMessage } from './ai-guardrails';
import { configuredFallbackProviderResult, isAiProviderConfigured, runConfiguredAiProvider } from './ai-provider';
import { completeAiRequestRecord, createAiRequestRecord, failAiRequestRecord } from './ai-request-repository';
import { runCreateBackgroundJobAction, runSearchDocumentsAction } from './ai-tools';
import type { AiAction, AiCitation, AiChunkMatch, AiRequestInput, AiResponseOutput, AiUsage, JsonObject, JsonValue } from './ai-types';

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type AiServiceContext = {
  supabase: SupabaseServerClient;
  userId: string;
};

function emptyUsage(): AiUsage {
  return {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0
  };
}

function stringMetadata(metadata: JsonObject, key: string): string | null {
  const value: JsonValue | undefined = metadata[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function objectMetadata(metadata: JsonObject, key: string): JsonObject {
  const value: JsonValue | undefined = metadata[key];
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : {};
}

function citationsFromChunks(chunks: AiChunkMatch[]): AiCitation[] {
  return chunks.map((chunk) => ({
    documentId: chunk.documentId,
    chunkId: chunk.id,
    score: chunk.score
  }));
}

function contextFromChunks(chunks: AiChunkMatch[]): string {
  return chunks
    .slice(0, 8)
    .map((chunk, index) => `[${index + 1}] document=${chunk.documentId} chunk=${chunk.id}\n${chunk.content}`)
    .join('\n\n');
}

function responsePayload(input: {
  answer: string;
  mode: AiRequestInput['mode'];
  requestId: string | null;
  modelName: string | null;
  usage: AiUsage;
  latencyMs: number;
  citations?: AiCitation[];
  actions?: AiAction[];
}): AiResponseOutput {
  return {
    answer: input.answer,
    mode: input.mode,
    citations: input.citations || [],
    actions: input.actions || [],
    requestId: input.requestId,
    modelName: input.modelName,
    usage: input.usage,
    latencyMs: Math.round(input.latencyMs)
  };
}

export async function runAiRequest(
  rawInput: AiRequestInput,
  context: AiServiceContext
): Promise<Result<AiResponseOutput>> {
  const startedAt = Date.now();
  const input: AiRequestInput = {
    ...rawInput,
    message: normalizeAiMessage(rawInput.message)
  };

  const requestRecord = await createAiRequestRecord(context.supabase, context.userId, input);
  const actions: AiAction[] = [];
  const citations: AiCitation[] = [];
  let trustedContext = '';

  if (requestRecord.errorMessage) {
    return fail('DATABASE_ERROR', requestRecord.errorMessage);
  }

  try {
    if (input.mode === 'background_job') {
      const jobType = stringMetadata(input.metadata, 'jobType') || 'long_ai_planner';
      const job = await runCreateBackgroundJobAction(
        {
          supabase: context.supabase,
          ownerId: context.userId,
          requestId: requestRecord.id
        },
        {
          jobType,
          payload: {
            message: input.message,
            metadata: input.metadata
          }
        }
      );

      if (!job.ok) {
        await failAiRequestRecord(context.supabase, requestRecord.id, job.error.message, Date.now() - startedAt);
        return fail(job.error.code, job.error.message, job.error.details);
      }

      actions.push(job.data.action);
      const output = responsePayload({
        answer: fallbackAnswerForMode(input.mode),
        mode: input.mode,
        requestId: requestRecord.id,
        modelName: null,
        usage: emptyUsage(),
        latencyMs: Date.now() - startedAt,
        actions
      });

      await completeAiRequestRecord(context.supabase, requestRecord.id, output);
      return ok(output);
    }

    if (input.mode === 'rag_answer') {
      const search = await runSearchDocumentsAction(
        {
          supabase: context.supabase,
          ownerId: context.userId,
          requestId: requestRecord.id
        },
        {
          query: input.message,
          documentIds: input.documentIds,
          limit: 8
        }
      );

      if (search.ok) {
        actions.push(search.data.action.action);
        citations.push(...citationsFromChunks(search.data.chunks));
        trustedContext = contextFromChunks(search.data.chunks);
      } else if (search.error.code !== 'DATABASE_ERROR') {
        await failAiRequestRecord(context.supabase, requestRecord.id, search.error.message, Date.now() - startedAt);
        return fail(search.error.code, search.error.message, search.error.details);
      }
    }

    if (input.mode === 'tool_action') {
      const requestedAction = stringMetadata(input.metadata, 'action');

      if (requestedAction === 'searchDocuments') {
        const search = await runSearchDocumentsAction(
          {
            supabase: context.supabase,
            ownerId: context.userId,
            requestId: requestRecord.id
          },
          {
            query: stringMetadata(input.metadata, 'query') || input.message,
            documentIds: input.documentIds,
            limit: 8
          }
        );

        if (!search.ok) {
          await failAiRequestRecord(context.supabase, requestRecord.id, search.error.message, Date.now() - startedAt);
          return fail(search.error.code, search.error.message, search.error.details);
        }

        actions.push(search.data.action.action);
        citations.push(...citationsFromChunks(search.data.chunks));
        trustedContext = contextFromChunks(search.data.chunks);
      } else if (requestedAction === 'createBackgroundJob') {
        const job = await runCreateBackgroundJobAction(
          {
            supabase: context.supabase,
            ownerId: context.userId,
            requestId: requestRecord.id
          },
          {
            jobType: stringMetadata(input.metadata, 'jobType') || 'long_ai_planner',
            payload: objectMetadata(input.metadata, 'payload')
          }
        );

        if (!job.ok) {
          await failAiRequestRecord(context.supabase, requestRecord.id, job.error.message, Date.now() - startedAt);
          return fail(job.error.code, job.error.message, job.error.details);
        }

        actions.push(job.data.action);
      } else {
        actions.push({
          type: 'action.blocked',
          label: 'No registered safe action was requested',
          status: 'blocked'
        });
      }
    }

    const provider = isAiProviderConfigured()
      ? await runConfiguredAiProvider({
          mode: input.mode,
          message: input.message,
          context: trustedContext || undefined
        })
      : ok(configuredFallbackProviderResult(fallbackAnswerForMode(input.mode)));

    if (!provider.ok) {
      await failAiRequestRecord(context.supabase, requestRecord.id, provider.error.message, Date.now() - startedAt);
      return fail(provider.error.code, provider.error.message, provider.error.details);
    }

    const output = responsePayload({
      answer: provider.data.answer,
      mode: input.mode,
      requestId: requestRecord.id,
      modelName: provider.data.modelName,
      usage: provider.data.usage,
      latencyMs: Date.now() - startedAt,
      citations,
      actions
    });

    await completeAiRequestRecord(context.supabase, requestRecord.id, output);
    return ok(output);
  } catch (error) {
    await failAiRequestRecord(context.supabase, requestRecord.id, error, Date.now() - startedAt);
    return fail('AI_ERROR', safeMessage(error, 'AI request failed.'));
  }
}
