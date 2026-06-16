import type { createSupabaseServerClient } from '../supabase/server';
import type { AiChunkMatch, JsonObject } from './ai-types';
import { isRecoverableAiSchemaError } from './ai-db-utils';

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type AiChunkRow = {
  id?: string;
  document_id?: string;
  content?: string;
  metadata?: JsonObject;
};

function escapeLikePattern(value: string): string {
  return value.replace(/[%_\\]/g, (match) => `\\${match}`);
}

export async function searchDocumentChunksText(input: {
  supabase: SupabaseServerClient;
  ownerId: string;
  query: string;
  documentIds: string[];
  limit: number;
}): Promise<{ chunks: AiChunkMatch[]; errorMessage: string | null }> {
  const limit = Math.max(1, Math.min(Math.floor(input.limit), 20));
  const likePattern = `%${escapeLikePattern(input.query.slice(0, 120))}%`;
  let query = input.supabase
    .from('ai_chunks')
    .select('id,document_id,content,metadata')
    .eq('owner_id', input.ownerId)
    .ilike('content', likePattern)
    .limit(limit);

  if (input.documentIds.length > 0) {
    query = query.in('document_id', input.documentIds);
  }

  const { data, error } = await query;

  if (error) {
    return {
      chunks: [],
      errorMessage: isRecoverableAiSchemaError(error) ? null : error.message
    };
  }

  const rows = Array.isArray(data) ? data as AiChunkRow[] : [];

  return {
    chunks: rows
      .filter((row) => row.id && row.document_id && row.content)
      .map((row) => ({
        id: String(row.id),
        documentId: String(row.document_id),
        content: String(row.content),
        metadata: row.metadata || {},
        score: 0.5
      })),
    errorMessage: null
  };
}
