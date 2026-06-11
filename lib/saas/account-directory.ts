import type { createSupabaseServerClient } from '../supabase/server';
import type { ManagedAccount } from './account-management';

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type DirectoryView = 'all' | 'pending' | 'active' | 'blocked' | 'managers' | 'clients';

export type AccountDirectoryRow = ManagedAccount & {
  total_count?: number;
};

export type AccountDirectorySummary = {
  total: number;
  pending: number;
  active: number;
  blocked: number;
  managers: number;
  clients: number;
  linked: number;
  unassigned: number;
};

export type AccountDirectoryOptions = {
  view: DirectoryView;
  query?: string;
  page?: number;
  pageSize?: number;
};

function safeNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.floor(parsed));
}

export function normalizeDirectoryParams(params?: Record<string, string | string[] | undefined>) {
  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
  const viewInput = first(params?.view) || 'overview';

  return {
    view: viewInput,
    query: (first(params?.q) || '').trim().slice(0, 120),
    page: safeNumber(first(params?.page), 1),
    pageSize: Math.min(100, Math.max(10, safeNumber(first(params?.pageSize), 25)))
  };
}

export function directoryQueryString(input: { view?: string; q?: string; page?: number; pageSize?: number }) {
  const params = new URLSearchParams();

  if (input.view) params.set('view', input.view);
  if (input.q) params.set('q', input.q);
  if (input.page && input.page > 1) params.set('page', String(input.page));
  if (input.pageSize && input.pageSize !== 25) params.set('pageSize', String(input.pageSize));

  const query = params.toString();
  return query ? `?${query}` : '';
}

function normalizeAccount(row: AccountDirectoryRow): AccountDirectoryRow {
  return {
    ...row,
    role: row.role === 'admin' ? 'manager' : row.role,
    account_status: row.account_status || 'active'
  };
}

export async function getManagerClientSummary(supabase: SupabaseServerClient): Promise<{
  summary: AccountDirectorySummary;
  errorMessage: string | null;
}> {
  const { data, error } = await supabase.rpc('access_manager_client_summary');
  const row = Array.isArray(data) ? data[0] : null;

  return {
    summary: {
      total: Number(row?.total_clients || 0),
      pending: Number(row?.pending_clients || 0),
      active: Number(row?.active_clients || 0),
      blocked: Number(row?.blocked_clients || 0),
      managers: 0,
      clients: Number(row?.total_clients || 0),
      linked: Number(row?.total_clients || 0),
      unassigned: 0
    },
    errorMessage: error?.message || null
  };
}

export async function listManagerClientDirectory(
  supabase: SupabaseServerClient,
  options: AccountDirectoryOptions
) {
  const { data, error } = await supabase.rpc('access_manager_client_directory', {
    view_input: options.view,
    search_input: options.query || null,
    page_input: options.page || 1,
    page_size_input: options.pageSize || 25
  });

  const accounts = Array.isArray(data) ? (data as AccountDirectoryRow[]).map(normalizeAccount) : [];
  const total = Number(accounts[0]?.total_count || 0);

  return {
    accounts,
    total,
    page: options.page || 1,
    pageSize: options.pageSize || 25,
    errorMessage: error?.message || null
  };
}

export async function getMasterAccountSummary(supabase: SupabaseServerClient): Promise<{
  summary: AccountDirectorySummary;
  errorMessage: string | null;
}> {
  const { data, error } = await supabase.rpc('access_master_account_summary');
  const row = Array.isArray(data) ? data[0] : null;

  return {
    summary: {
      total: Number(row?.total_users || 0),
      pending: Number(row?.pending_clients || 0),
      active: 0,
      blocked: Number(row?.blocked_accounts || 0),
      managers: Number(row?.manager_accounts || 0),
      clients: Number(row?.client_accounts || 0),
      linked: Number(row?.linked_clients || 0),
      unassigned: Number(row?.unassigned_clients || 0)
    },
    errorMessage: error?.message || null
  };
}

export async function listMasterAccountDirectory(
  supabase: SupabaseServerClient,
  options: AccountDirectoryOptions
) {
  const { data, error } = await supabase.rpc('access_master_account_directory', {
    view_input: options.view,
    search_input: options.query || null,
    page_input: options.page || 1,
    page_size_input: options.pageSize || 25
  });

  const accounts = Array.isArray(data) ? (data as AccountDirectoryRow[]).map(normalizeAccount) : [];
  const total = Number(accounts[0]?.total_count || 0);

  return {
    accounts,
    total,
    page: options.page || 1,
    pageSize: options.pageSize || 25,
    errorMessage: error?.message || null
  };
}
