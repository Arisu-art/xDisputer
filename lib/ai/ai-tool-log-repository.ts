import type { createSupabaseServerClient } from '../supabase/server';
import type { JsonObject } from './ai-types';
import { isRecoverableAiSchemaError } from './ai-db-utils';

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export async function logAiToolCall(input: {
  supabase: SupabaseServerClient;
  requestId: string | null;
  ownerId: string;
  toolName: string;
  toolInput: JsonObject;
  toolOutput: JsonObject;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'blocked';
  latencyMs?: number;
  errorMessage?: string | null;
}): Promise<string | null> {
  if (!input.requestId) return null;

  const { error } = await input.supabase
    .from('ai_tool_calls')
    .insert({
      request_id: input.requestId,
      owner_id: input.ownerId,
      tool_name: input.toolName,
      input: input.toolInput,
      output: input.toolOutput,
      status: input.status,
      latency_ms: typeof input.latencyMs === 'number' ? Math.round(input.latencyMs) : null,
      error_message: input.errorMessage || null
    });

  return error && !isRecoverableAiSchemaError(error) ? error.message : null;
}
