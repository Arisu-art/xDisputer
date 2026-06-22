import type { createSupabaseServerClient } from '../supabase/server';

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type ManagerEmploymentType = 'full_time' | 'output_based';

export type ManagerUserSetting = {
  manager_id: string;
  user_id: string;
  is_regular: boolean;
  employment_type: ManagerEmploymentType;
  rate: number;
  salary: number;
  base_salary: number;
  per_output_rate: number;
  payday_frequency: string;
  notes: string | null;
  updated_at: string | null;
};

export type ManagerOutputApprovalStatus = 'pending' | 'approved' | 'rejected' | 'paid';

export type ManagerOutputApproval = {
  id: string;
  manager_id: string;
  disputer_id: string;
  output_label: string;
  output_count: number;
  rate_amount: number;
  status: ManagerOutputApprovalStatus;
  source: string;
  payday_label: string | null;
  notes: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  paid_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type ManagerOutputSummary = {
  pendingCount: number;
  approvedCount: number;
  paidCount: number;
  approvedOutputCount: number;
  approvedExtraPay: number;
  pendingExtraPay: number;
};

export type ManagerUserSettingMap = Record<string, ManagerUserSetting>;
export type ManagerOutputSummaryMap = Record<string, ManagerOutputSummary>;

const MANAGER_USER_SETTING_COLUMNS = 'manager_id,user_id,is_regular,employment_type,rate,salary,base_salary,per_output_rate,payday_frequency,notes,updated_at';
const MANAGER_OUTPUT_APPROVAL_COLUMNS = 'id,manager_id,disputer_id,output_label,output_count,rate_amount,status,source,payday_label,notes,approved_at,rejected_at,paid_at,created_at,updated_at';

function isMissingTable(message: string | undefined) {
  return Boolean(message && (
    message.includes('manager_user_settings') ||
    message.includes('manager_disputer_output_approvals') ||
    message.includes('does not exist') ||
    message.includes('schema cache')
  ));
}

function normalizeEmploymentType(value: unknown, isRegular?: boolean): ManagerEmploymentType {
  if (value === 'full_time') return 'full_time';
  if (value === 'output_based') return 'output_based';
  return isRegular ? 'full_time' : 'output_based';
}

function normalizeSetting(row: Record<string, unknown>): ManagerUserSetting {
  const isRegular = row.is_regular === true;
  const baseSalary = Number(row.base_salary ?? row.salary ?? 0);
  const perOutputRate = Number(row.per_output_rate ?? row.rate ?? 0);
  return {
    manager_id: String(row.manager_id || ''),
    user_id: String(row.user_id || ''),
    is_regular: isRegular,
    employment_type: normalizeEmploymentType(row.employment_type, isRegular),
    rate: Number(row.rate ?? perOutputRate ?? 0),
    salary: Number(row.salary ?? baseSalary ?? 0),
    base_salary: Number.isFinite(baseSalary) ? baseSalary : 0,
    per_output_rate: Number.isFinite(perOutputRate) ? perOutputRate : 0,
    payday_frequency: String(row.payday_frequency || 'manual'),
    notes: typeof row.notes === 'string' ? row.notes : null,
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : null
  };
}

function normalizeApproval(row: Record<string, unknown>): ManagerOutputApproval {
  const status = row.status === 'approved' || row.status === 'rejected' || row.status === 'paid' ? row.status : 'pending';
  return {
    id: String(row.id || ''),
    manager_id: String(row.manager_id || ''),
    disputer_id: String(row.disputer_id || ''),
    output_label: String(row.output_label || 'Manual output task'),
    output_count: Math.max(1, Number(row.output_count || 1)),
    rate_amount: Math.max(0, Number(row.rate_amount || 0)),
    status,
    source: String(row.source || 'manual'),
    payday_label: typeof row.payday_label === 'string' ? row.payday_label : null,
    notes: typeof row.notes === 'string' ? row.notes : null,
    approved_at: typeof row.approved_at === 'string' ? row.approved_at : null,
    rejected_at: typeof row.rejected_at === 'string' ? row.rejected_at : null,
    paid_at: typeof row.paid_at === 'string' ? row.paid_at : null,
    created_at: typeof row.created_at === 'string' ? row.created_at : null,
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : null
  };
}

export function defaultManagerUserSetting(managerId: string, userId: string): ManagerUserSetting {
  return { manager_id: managerId, user_id: userId, is_regular: true, employment_type: 'full_time', rate: 0, salary: 0, base_salary: 0, per_output_rate: 0, payday_frequency: 'manual', notes: null, updated_at: null };
}

export function payrollAmount(settings: ManagerUserSetting | undefined, outputCount: number) {
  if (!settings) return 0;
  if (settings.employment_type === 'output_based' || settings.is_regular === false) return Math.max(0, outputCount) * Math.max(0, settings.per_output_rate || settings.rate || 0);
  return Math.max(0, settings.base_salary || settings.salary || 0);
}

export async function listManagerUserSettings(supabase: SupabaseServerClient, managerId: string, userIds: string[]) {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (!managerId || !ids.length) return { settings: {} as ManagerUserSettingMap, errorMessage: null as string | null };

  const { data, error } = await supabase
    .from('manager_user_settings')
    .select(MANAGER_USER_SETTING_COLUMNS)
    .eq('manager_id', managerId)
    .in('user_id', ids);

  if (error) return { settings: {} as ManagerUserSettingMap, errorMessage: isMissingTable(error.message) ? null : error.message };

  const rows = Array.isArray(data) ? data.map((row) => normalizeSetting(row as Record<string, unknown>)).filter((row) => row.user_id) : [];
  return { settings: Object.fromEntries(rows.map((row) => [row.user_id, row])), errorMessage: null };
}

export async function listManagerOutputApprovals(supabase: SupabaseServerClient, managerId: string, userIds: string[]) {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (!managerId || !ids.length) return { approvals: [] as ManagerOutputApproval[], summary: {} as ManagerOutputSummaryMap, errorMessage: null as string | null };

  const { data, error } = await supabase
    .from('manager_disputer_output_approvals')
    .select(MANAGER_OUTPUT_APPROVAL_COLUMNS)
    .eq('manager_id', managerId)
    .in('disputer_id', ids)
    .order('created_at', { ascending: false });

  if (error) return { approvals: [] as ManagerOutputApproval[], summary: {} as ManagerOutputSummaryMap, errorMessage: isMissingTable(error.message) ? null : error.message };

  const approvals = Array.isArray(data) ? data.map((row) => normalizeApproval(row as Record<string, unknown>)).filter((row) => row.id) : [];
  const summary: ManagerOutputSummaryMap = {};
  for (const approval of approvals) {
    const current = summary[approval.disputer_id] || { pendingCount: 0, approvedCount: 0, paidCount: 0, approvedOutputCount: 0, approvedExtraPay: 0, pendingExtraPay: 0 };
    if (approval.status === 'pending') current.pendingCount += 1;
    if (approval.status === 'approved') current.approvedCount += 1;
    if (approval.status === 'paid') current.paidCount += 1;
    if (approval.status === 'approved' || approval.status === 'paid') {
      current.approvedOutputCount += approval.output_count;
      current.approvedExtraPay += approval.output_count * approval.rate_amount;
    }
    if (approval.status === 'pending') current.pendingExtraPay += approval.output_count * approval.rate_amount;
    summary[approval.disputer_id] = current;
  }
  return { approvals, summary, errorMessage: null };
}
