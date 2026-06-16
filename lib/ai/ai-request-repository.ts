import type { createSupabaseServerClient } from '../supabase/server';
import type { AiRequestInput, AiRequestRecord, AiResponseOutput } from './ai-types';
import { isRecoverableAiSchemaError, recordIdFrom, safeAiErrorMessage, usagePayload } from './ai-db-utils';

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export async function createAiRequestRecord(
  supabase: SupabaseServerClient,
  ownerId: string,
  input: AiRequestInput
): Promise<AiRequestRecord> {
  const { data, error } = await supabase
    .from('ai_requests')
    .insert({
      owner_id: ownerId,
      mode: input.mode,
      input: {
        message: input.message,
        documentIds: input.documentIds,
        metadata: input.metadata,
        stream: input.stream
      },
      status: 'running'
    })
    .select('id')
    .single();

  if (error) {
    return {
      id: null,
      errorMessage: isRecoverableAiSchemaError(error) ? null : error.message
    };
  }

  return {
    id: recordIdFrom(data),
    errorMessage: null
  };
}

export async function completeAiRequestRecord(
  supabase: SupabaseServerClient,
  requestId: string | null,
  output: AiResponseOutput
): Promise<string | null> {
  if (!requestId) return null;

  const { error } = await supabase
    .from('ai_requests')
    .update({
      output: {
        answer: output.answer,
        citations: output.citations,
        actions: output.actions,
        usage: usagePayload(output.usage)
      },
      status: 'completed',
      model_name: output.modelName,
      prompt_tokens: output.usage.promptTokens,
      completion_tokens: output.usage.completionTokens,
      total_tokens: output.usage.totalTokens,
      latency_ms: output.latencyMs,
      completed_at: new Date().toISOString()
    })
    .eq('id', requestId);

  return error && !isRecoverableAiSchemaError(error) ? error.message : null;
}

export async function failAiRequestRecord(
  supabase: SupabaseServerClient,
  requestId: string | null,
  error: unknown,
  latencyMs: number
): Promise<string | null> {
  if (!requestId) return null;

  const { error: updateError } = await supabase
    .from('ai_requests')
    .update({
      status: 'failed',
      error_message: safeAiErrorMessage(error),
      latency_ms: Math.round(latencyMs),
      completed_at: new Date().toISOString()
    })
    .eq('id', requestId);

  return updateError && !isRecoverableAiSchemaError(updateError) ? updateError.message : null;
}
