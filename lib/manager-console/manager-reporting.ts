import type { createSupabaseServerClient } from '../supabase/server';
import { listManagerClientDirectory, type AccountDirectoryRow } from '../saas/account-directory';
import { listEntitlementLimits, type EntitlementLimitMap } from '../saas/entitlement-limits';
import { listManagerUserSettings, type ManagerUserSetting, type ManagerUserSettingMap } from '../saas/manager-user-settings';

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type ManagerReportType = 'summary' | 'salary' | 'users' | 'outputs';
export type ManagerReportRange = { fromDate: string; toDate: string; startIso: string; endIso: string };
export type ManagerReportInput = { type: ManagerReportType; range: ManagerReportRange };

export type ManagerReportOutputRow = { id: string; disputerId: string; disputerName: string; disputerEmail: string; clientName: string; roundLabel: string; status: string; outputType: string; outputCount: number; rateAmount: number; estimatedPay: number; createdAt: string };
export type ManagerReportUserRow = { id: string; name: string; email: string; status: string; employmentType: string; baseSalary: number; perOutputRate: number; outputLimit: number | null; outputs: number; approvedOutputs: number; pendingOutputs: number; returnedOutputs: number; estimatedPay: number };
export type ManagerReportTotals = { userCount: number; activeUsers: number; blockedUsers: number; totalOutputRows: number; totalOutputItems: number; approvedRows: number; pendingRows: number; returnedRows: number; fulltimeRows: number; baseSalaryTotal: number; approvedExtraPay: number; pendingExtraPay: number; estimatedPayTotal: number };
export type ManagerReportData = { input: ManagerReportInput; accounts: AccountDirectoryRow[]; entitlements: EntitlementLimitMap; settings: ManagerUserSettingMap; outputs: ManagerReportOutputRow[]; users: ManagerReportUserRow[]; totals: ManagerReportTotals; errorMessage: string | null };

type RawOutputApproval = { id: string; disputer_id: string; generation_run_id: string | null; output_label: string | null; output_count: number | null; rate_amount: number | null; status: string | null; notes: string | null; round_label: string | null; letter_route: string | null; client_name: string | null; is_per_output: boolean | null; approved_at: string | null; rejected_at: string | null; created_at: string | null };

const REPORT_TYPES = new Set<ManagerReportType>(['summary', 'salary', 'users', 'outputs']);
const OUTPUT_COLUMNS = 'id,disputer_id,generation_run_id,output_label,output_count,rate_amount,status,notes,round_label,letter_route,client_name,is_per_output,approved_at,rejected_at,created_at';

function dateOnly(date: Date) { return date.toISOString().slice(0, 10); }
function addDays(date: Date, days: number) { const next = new Date(date); next.setUTCDate(next.getUTCDate() + days); return next; }
function safeDate(value: string | null | undefined) { if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null; const date = new Date(`${value}T00:00:00.000Z`); return Number.isNaN(date.getTime()) ? null : date; }
function positiveMoney(value: unknown) { const number = Number(value || 0); return Number.isFinite(number) ? Math.max(0, number) : 0; }
function accountName(account?: AccountDirectoryRow) { return account?.full_name || account?.email || 'Disputer'; }
function accountStatus(account?: AccountDirectoryRow) { return account?.account_status || 'unknown'; }
function employmentType(setting?: ManagerUserSetting) { return setting?.employment_type === 'output_based' || setting?.is_regular === false ? 'Per-output' : 'Full-time'; }

export function moneyText(value: number) { return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value || 0); }

export function defaultManagerReportRange(now = new Date()): ManagerReportRange {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const from = addDays(today, -6);
  return { fromDate: dateOnly(from), toDate: dateOnly(today), startIso: from.toISOString(), endIso: addDays(today, 1).toISOString() };
}

export function parseManagerReportInput(search: { reportType?: string | string[]; from?: string | string[]; to?: string | string[] }): ManagerReportInput {
  const first = (value?: string | string[]) => Array.isArray(value) ? value[0] : value;
  const reportType = first(search.reportType) as ManagerReportType | undefined;
  const type = reportType && REPORT_TYPES.has(reportType) ? reportType : 'summary';
  const fallback = defaultManagerReportRange();
  const fromDate = safeDate(first(search.from));
  const toDate = safeDate(first(search.to));
  if (!fromDate || !toDate || fromDate > toDate) return { type, range: fallback };
  return { type, range: { fromDate: dateOnly(fromDate), toDate: dateOnly(toDate), startIso: fromDate.toISOString(), endIso: addDays(toDate, 1).toISOString() } };
}

function rowPay(row: RawOutputApproval, setting?: ManagerUserSetting) {
  if (row.is_per_output !== true || (row.status !== 'approved' && row.status !== 'paid')) return 0;
  return Math.max(1, Number(row.output_count || 1)) * positiveMoney(row.rate_amount || setting?.per_output_rate || setting?.rate || 0);
}

function emptyTotals(): ManagerReportTotals { return { userCount: 0, activeUsers: 0, blockedUsers: 0, totalOutputRows: 0, totalOutputItems: 0, approvedRows: 0, pendingRows: 0, returnedRows: 0, fulltimeRows: 0, baseSalaryTotal: 0, approvedExtraPay: 0, pendingExtraPay: 0, estimatedPayTotal: 0 }; }

export async function listManagerReportData(supabase: SupabaseServerClient, managerId: string, input: ManagerReportInput): Promise<ManagerReportData> {
  const accountsResult = await listManagerClientDirectory(supabase, { view: 'all', page: 1, pageSize: 250 });
  const accounts = accountsResult.accounts;
  const ids = accounts.map((account) => account.id).filter(Boolean);
  const [settingsResult, entitlementsResult] = await Promise.all([listManagerUserSettings(supabase, managerId, ids), listEntitlementLimits(supabase, ids)]);
  const outputQuery = await supabase.from('manager_disputer_output_approvals').select(OUTPUT_COLUMNS).eq('manager_id', managerId).gte('created_at', input.range.startIso).lt('created_at', input.range.endIso).order('created_at', { ascending: false });
  const errorMessage = accountsResult.errorMessage || settingsResult.errorMessage || entitlementsResult.errorMessage || outputQuery.error?.message || null;
  const rawOutputs = Array.isArray(outputQuery.data) ? outputQuery.data as RawOutputApproval[] : [];
  const accountMap = new Map(accounts.map((account) => [account.id, account]));
  const outputs = rawOutputs.map((row) => {
    const account = accountMap.get(row.disputer_id);
    const setting = settingsResult.settings[row.disputer_id];
    const outputCount = Math.max(1, Number(row.output_count || 1));
    const rateAmount = positiveMoney(row.rate_amount || setting?.per_output_rate || setting?.rate || 0);
    return { id: row.id, disputerId: row.disputer_id, disputerName: accountName(account), disputerEmail: account?.email || '', clientName: row.client_name || 'Not set', roundLabel: row.round_label || 'Not set', status: row.status || 'recorded', outputType: row.is_per_output ? 'Per-output' : 'Full-time record', outputCount, rateAmount, estimatedPay: rowPay(row, setting), createdAt: row.created_at || '' };
  });
  const outputsByUser = new Map<string, ManagerReportOutputRow[]>();
  for (const row of outputs) outputsByUser.set(row.disputerId, [...(outputsByUser.get(row.disputerId) || []), row]);
  const totals = emptyTotals();
  totals.userCount = accounts.length;
  totals.activeUsers = accounts.filter((account) => account.account_status === 'active').length;
  totals.blockedUsers = accounts.filter((account) => account.account_status === 'disabled' || account.account_status === 'suspended').length;
  totals.totalOutputRows = outputs.length;
  totals.totalOutputItems = outputs.reduce((sum, row) => sum + row.outputCount, 0);
  totals.approvedRows = outputs.filter((row) => row.status === 'approved' || row.status === 'paid').length;
  totals.pendingRows = outputs.filter((row) => row.status === 'pending').length;
  totals.returnedRows = outputs.filter((row) => row.status === 'rejected').length;
  totals.fulltimeRows = outputs.filter((row) => row.outputType === 'Full-time record').length;
  const users = accounts.map((account) => {
    const setting = settingsResult.settings[account.id];
    const userOutputs = outputsByUser.get(account.id) || [];
    const isOutputBased = setting?.employment_type === 'output_based' || setting?.is_regular === false;
    const baseSalary = isOutputBased ? 0 : positiveMoney(setting?.base_salary || setting?.salary || 0);
    const approvedPay = userOutputs.reduce((sum, row) => sum + row.estimatedPay, 0);
    const pendingPay = userOutputs.filter((row) => row.status === 'pending').reduce((sum, row) => sum + row.outputCount * row.rateAmount, 0);
    const estimatedPay = baseSalary + approvedPay;
    totals.baseSalaryTotal += baseSalary; totals.approvedExtraPay += approvedPay; totals.pendingExtraPay += pendingPay; totals.estimatedPayTotal += estimatedPay;
    return { id: account.id, name: accountName(account), email: account.email || '', status: accountStatus(account), employmentType: employmentType(setting), baseSalary, perOutputRate: positiveMoney(setting?.per_output_rate || setting?.rate || 0), outputLimit: entitlementsResult.entitlements[account.id]?.effective_output_limit || null, outputs: userOutputs.reduce((sum, row) => sum + row.outputCount, 0), approvedOutputs: userOutputs.filter((row) => row.status === 'approved' || row.status === 'paid').reduce((sum, row) => sum + row.outputCount, 0), pendingOutputs: userOutputs.filter((row) => row.status === 'pending').reduce((sum, row) => sum + row.outputCount, 0), returnedOutputs: userOutputs.filter((row) => row.status === 'rejected').reduce((sum, row) => sum + row.outputCount, 0), estimatedPay };
  });
  return { input, accounts, entitlements: entitlementsResult.entitlements, settings: settingsResult.settings, outputs, users, totals, errorMessage };
}
