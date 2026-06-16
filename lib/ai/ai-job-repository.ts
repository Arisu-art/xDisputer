import type { createSupabaseServerClient } from '../supabase/server';
import type { JsonObject } from './ai-types';
import { recordIdFrom } from './ai-db-utils';

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export async function createAiJob(input: {
  supabase: SupabaseServerClient;
  ownerId: string;
  jobType: string;
  payload: JsonObject;
}): Promise<{ id: string | null; errorMessage: string | null }> {
  const { data, error } = await input.supabase
    .from('ai_jobs')
    .insert({
      owner_id: input.ownerId,
      job_type: input.jobType,
      payload: input.payload,
      status: 'queued'
    })
    .select('id')
    .single();

  if (error) {
    return {
      id: null,
      errorMessage: error.message
    };
  }

  return {
    id: recordIdFrom(data),
    errorMessage: null
  };
}
