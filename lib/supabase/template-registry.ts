import type { SupabaseClient } from '@supabase/supabase-js';
import type { LetterType } from '../letter-engine';
import type { ExhibitKind } from '../template-exhibits';
import type { Round } from '../reference-store';

export type TemplateKind = 'LETTER' | 'EXHIBIT';

export type TemplateAssetRecord = {
  id: string;
  owner_id: string;
  round_label: Round;
  template_kind: TemplateKind;
  letter_type: LetterType | null;
  exhibit_kind: ExhibitKind | null;
  storage_bucket: string;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  file_size: number | null;
  contract_json: Record<string, unknown>;
  rule_json: Record<string, unknown>;
  version_number: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export function templateStoragePath(input: {
  userId: string;
  round: Round;
  kind: TemplateKind;
  type: LetterType | ExhibitKind;
  filename: string;
}) {
  const safeRound = input.round.replace(/\s+/g, '-').toLowerCase();
  const safeFile = input.filename.replace(/[^a-z0-9._-]+/gi, '-');
  return `${input.userId}/${safeRound}/${input.kind.toLowerCase()}/${input.type}/${Date.now()}-${safeFile}`;
}

export async function listActiveTemplateAssets(
  supabase: SupabaseClient,
  round: Round
) {
  return supabase
    .from('template_assets')
    .select('*')
    .eq('round_label', round)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
}
