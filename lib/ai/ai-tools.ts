import { fail, ok, type Result } from '../core/result';
import type { createSupabaseServerClient } from '../supabase/server';
import { createAiJob } from './ai-job-repository';
import { searchDocumentChunksText } from './ai-document-repository';
import { logAiToolCall } from './ai-tool-log-repository';
import type { AiChunkMatch, AiToolActionResult, JsonObject } from './ai-types';

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type ActionContext = {
  supabase: SupabaseServerClient;
  ownerId: string;
  requestId: string | null;
};

const SAFE_JOB_TYPES = [
  'generate_embeddings',
  'parse_uploaded_file',
  'generate_report',
  'long_ai_planner'
] as const;

type SafeJobType = typeof SAFE_JOB_TYPES[number];

function isSafeJobType(value: string): value is SafeJobType {
  return SAFE_JOB_TYPES.includes(value as SafeJobType);
}

function metadataFromChunks(chunks: AiChunkMatch[]): JsonObject {
  return {
    count: chunks.length,
    chunks: chunks.map((chunk) => ({
      id: chunk.id,
      documentId: chunk.documentId,
      score: chunk.score
    }))
  };
}

export async function runSearchDocumentsAction(
  context: ActionContext,
  input: { query: string; documentIds: string[]; limit?: number }
): Promise<Result<{ chunks: AiChunkMatch[]; action: AiToolActionResult }>> {
  const startedAt = Date.now();
  const query = input.query.trim();

  if (!query) {
    return fail('VALIDATION_ERROR', 'Document search requires a non-empty query.');
  }

  const result = await searchDocumentChunksText({
    supabase: context.supabase,
    ownerId: context.ownerId,
    query,
    documentIds: input.documentIds,
    limit: input.limit || 8
  });

  const output = metadataFromChunks(result.chunks);

  await logAiToolCall({
    supabase: context.supabase,
    requestId: context.requestId,
    ownerId: context.ownerId,
    toolName: 'searchDocuments',
    toolInput: { query, documentIds: input.documentIds, limit: input.limit || 8 },
    toolOutput: output,
    status: result.errorMessage ? 'failed' : 'completed',
    latencyMs: Date.now() - startedAt,
    errorMessage: result.errorMessage
  });

  if (result.errorMessage) {
    return fail('DATABASE_ERROR', result.errorMessage);
  }

  return ok({
    chunks: result.chunks,
    action: {
      action: {
        type: 'action.searchDocuments',
        label: `Searched ${result.chunks.length} document chunks`,
        status: 'executed'
      },
      output
    }
  });
}

export async function runCreateBackgroundJobAction(
  context: ActionContext,
  input: { jobType: string; payload: JsonObject }
): Promise<Result<AiToolActionResult>> {
  const startedAt = Date.now();

  if (!isSafeJobType(input.jobType)) {
    await logAiToolCall({
      supabase: context.supabase,
      requestId: context.requestId,
      ownerId: context.ownerId,
      toolName: 'createBackgroundJob',
      toolInput: { jobType: input.jobType, payload: input.payload },
      toolOutput: {},
      status: 'blocked',
      latencyMs: Date.now() - startedAt,
      errorMessage: 'Unsupported background job type.'
    });

    return fail('VALIDATION_ERROR', 'Unsupported background job type.');
  }

  const result = await createAiJob({
    supabase: context.supabase,
    ownerId: context.ownerId,
    jobType: input.jobType,
    payload: input.payload
  });

  const output: JsonObject = {
    jobId: result.id,
    status: result.errorMessage ? 'failed' : 'queued'
  };

  await logAiToolCall({
    supabase: context.supabase,
    requestId: context.requestId,
    ownerId: context.ownerId,
    toolName: 'createBackgroundJob',
    toolInput: { jobType: input.jobType, payload: input.payload },
    toolOutput: output,
    status: result.errorMessage ? 'failed' : 'completed',
    latencyMs: Date.now() - startedAt,
    errorMessage: result.errorMessage
  });

  if (result.errorMessage) {
    return fail('DATABASE_ERROR', result.errorMessage);
  }

  return ok({
    action: {
      type: 'action.createBackgroundJob',
      label: result.id ? `Queued job ${result.id}` : 'Queued background job',
      status: 'executed'
    },
    output
  });
}
