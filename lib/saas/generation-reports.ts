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

export type GenerationReportFilters = {
  startDate?: string;
  endDate?: string;
  status?: string;
  round?: string;
  query?: string;
  managerQuery?: string;
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

const allowedStatuses = new Set(['generated', 'downloaded', 'failed']);
const allowedRounds = new Set(['1st Round', '2nd Round', '3rd Round', 'Final']);

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanDate(value: unknown) {
  const raw = cleanText(value);
  if (!raw) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return '';
  return raw;
}

export function normalizeGenerationReportFilters(input?: Record<string, string | string[] | undefined>): GenerationReportFilters {
  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

  const status = cleanText(first(input?.status));
  const round = cleanText(first(input?.round));

  return {
    startDate: cleanDate(first(input?.startDate)),
    endDate: cleanDate(first(input?.endDate)),
    status: allowedStatuses.has(status) ? status : '',
    round: allowedRounds.has(round) ? round : '',
    query: cleanText(first(input?.query)).slice(0, 120),
    managerQuery: cleanText(first(input?.managerQuery)).slice(0, 120)
  };
}

export function generationReportQueryString(filters: GenerationReportFilters) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });

  const query = params.toString();
  return query ? `?${query}` : '';
}

export function activeGenerationFilterCount(filters: GenerationReportFilters) {
  return Object.values(filters).filter(Boolean).length;
}

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
  limit = 200,
  filters: GenerationReportFilters = {}
) {
  const rpcName = scope === 'master'
    ? 'access_master_generation_report_filtered'
    : 'access_manager_generation_report_filtered';

  const baseParams = {
    limit_count: limit,
    start_date_input: filters.startDate || null,
    end_date_input: filters.endDate || null,
    status_input: filters.status || null,
    round_input: filters.round || null,
    search_input: filters.query || null
  };

  const params = scope === 'master'
    ? { ...baseParams, manager_search_input: filters.managerQuery || null }
    : baseParams;

  const { data, error } = await supabase.rpc(rpcName, params);

  const rows = Array.isArray(data) ? (data as GenerationReportRow[]) : [];

  return {
    rows,
    summary: summarizeGenerationReport(rows),
    errorMessage: error?.message || null
  };
}

export function generationRowsToCsv(rows: GenerationReportRow[], scope: 'manager' | 'master') {
  const columns = scope === 'master'
    ? ['created_at', 'owner_email', 'owner_full_name', 'manager_email', 'client_name', 'round_label', 'output_status', 'run_id']
    : ['created_at', 'owner_email', 'owner_full_name', 'client_name', 'round_label', 'output_status', 'run_id'];

  const escapeCell = (value: unknown) => {
    const text = value === null || typeof value === 'undefined' ? '' : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };

  return [
    columns.join(','),
    ...rows.map((row) => columns.map((column) => escapeCell((row as unknown as Record<string, unknown>)[column])).join(','))
  ].join('\n');
}
