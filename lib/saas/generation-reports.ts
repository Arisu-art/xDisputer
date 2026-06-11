import type { createSupabaseServerClient } from '../supabase/server';

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type GenerationReportRow = {
  run_id: string;
  owner_id: string | null;
  owner_email: string | null;
  owner_full_name: string | null;
  manager_id?: string | null;
  manager_email?: string | null;
  client_name: string | null;
  round_label: string | null;
  output_status: string | null;
  created_at: string;
};

export type GenerationReportSummary = {
  total: number;
  generated: number;
  downloaded: number;
  failed: number;
  byRound: Array<{ label: string; count: number }>;
  byClient: Array<{ label: string; count: number }>;
  byStatus: Array<{ label: string; count: number }>;
};

function countBy(rows: GenerationReportRow[], key: (row: GenerationReportRow) => string | null | undefined) {
  const counts = new Map<string, number>();

  rows.forEach((row) => {
    const label = key(row) || 'Unknown';
    counts.set(label, (counts.get(label) || 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function summarizeGenerationReport(rows: GenerationReportRow[]): GenerationReportSummary {
  return {
    total: rows.length,
    generated: rows.filter((row) => row.output_status === 'generated').length,
    downloaded: rows.filter((row) => row.output_status === 'downloaded').length,
    failed: rows.filter((row) => row.output_status === 'failed').length,
    byRound: countBy(rows, (row) => row.round_label),
    byClient: countBy(rows, (row) => row.owner_email || row.owner_full_name || row.client_name),
    byStatus: countBy(rows, (row) => row.output_status)
  };
}

export async function listGenerationReport(
  supabase: SupabaseServerClient,
  scope: 'manager' | 'master',
  limit = 200
) {
  const rpcName = scope === 'master'
    ? 'access_master_generation_report'
    : 'access_manager_generation_report';

  const { data, error } = await supabase.rpc(rpcName, {
    limit_count: limit
  });

  const rows = Array.isArray(data) ? (data as GenerationReportRow[]) : [];

  return {
    rows,
    summary: summarizeGenerationReport(rows),
    errorMessage: error?.message || null
  };
}
