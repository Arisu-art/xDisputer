import ConsoleNavLink from '../../components/ConsoleNavLink';
import ManagerConsoleShell from '../../components/ManagerConsoleShell';
import { headers } from 'next/headers';
import { ensureManagerInviteCode } from '../../lib/saas/account-management';
import {
  getManagerClientSummary,
  listManagerClientDirectory,
  type AccountDirectoryListResult,
  type AccountDirectoryRow
} from '../../lib/saas/account-directory';
import { listEntitlementLimits, type EntitlementLimitMap } from '../../lib/saas/entitlement-limits';
import { defaultManagerUserSetting, listManagerUserSettings, payrollAmount, type ManagerUserSettingMap } from '../../lib/saas/manager-user-settings';
import { requireRole } from '../../lib/saas/session';
import { managerOperationsNavItems, normalizeManagerOperationsPanel } from '../../lib/manager-console/manager-operations-panels';

type PageProps = {
  searchParams?: Promise<{
    panel?: string | string[];
    control?: string | string[];
    message?: string | string[];
  }>;
};

const emptyDirectoryResult: AccountDirectoryListResult = { accounts: [], total: 0, page: 1, pageSize: 8, errorMessage: null };

function stringParam(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
function formatDate(value: string | null | undefined) { if (!value) return '—'; const date = new Date(value); if (Number.isNaN(date.getTime())) return '—'; return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date); }
function money(value: number) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value); }
function statusText(value: string | null | undefined) { if (value === 'pending_manager_assignment') return 'Waiting for invite'; if (value === 'pending_manager_approval') return 'Pending approval'; if (value === 'active') return 'Active'; if (value === 'suspended') return 'Paused'; if (value === 'disabled') return 'Disabled'; return value || 'Pending'; }
function outputUsage(entitlements: EntitlementLimitMap, accountId: string) { const row = entitlements[accountId]; return `${row?.output_used_today || 0}/${typeof row?.effective_output_limit === 'number' ? row.effective_output_limit : 'Default'} outputs today`; }
function uniqueAccounts(...groups: AccountDirectoryRow[][]) { const map = new Map<string, AccountDirectoryRow>(); groups.flat().forEach((account) => map.set(account.id, account)); return Array.from(map.values()); }
function hasActiveState(item: { active?: boolean }) { return item.active === true; }

function ControlForm({ profileId, intent, label, primary = false }: { profileId: string; intent: string; label: string; primary?: boolean }) { return <form action="/api/control/profile" method="post"><input type="hidden" name="profileId" value={profileId} /><input type="hidden" name="intent" value={intent} /><button type="submit" className={`admin-action-button ${primary ? 'primary' : ''}`}>{label}</button></form>; }
function PayrollSettingsForm({ managerId, accountId, settings }: { managerId: string; accountId: string; settings: ManagerUserSettingMap[string] | undefined }) { const current = settings || defaultManagerUserSetting(managerId, accountId); return <form action="/api/manager-console/payroll" method="post" className="manager-user-settings-form"><input type="hidden" name="profileId" value={accountId} /><label><span>Regular</span><select name="isRegular" defaultValue={current.is_regular ? 'true' : 'false'}><option value="true">Regular</option><option value="false">Non-regular</option></select></label><label><span>Rate/output</span><input name="rate" inputMode="decimal" defaultValue={String(current.rate || 0)} /></label><label><span>Salary</span><input name="salary" inputMode="decimal" defaultValue={String(current.salary || 0)} /></label><label className="manager-user-settings-notes"><span>Note</span><input name="notes" defaultValue={current.notes || ''} placeholder="Optional payroll or access note" /></label><button type="submit" className="admin-action-button primary">Save metadata</button></form>; }
function ManagerAccountCard({ account, managerId, entitlements, settings }: { account: AccountDirectoryRow; managerId: string; entitlements: EntitlementLimitMap; settings: ManagerUserSettingMap }) { const payroll = payrollAmount(settings[account.id], entitlements[account.id]?.output_used_today || 0); return <article className="manager-console-user-card"><header><div><strong>{account.full_name || account.email || 'Unnamed user'}</strong><span>{account.email || 'No email'} • Updated {formatDate(account.updated_at)}</span></div><span className={`admin-status-badge ${account.account_status || 'pending'}`}>{statusText(account.account_status)}</span></header><div className="manager-console-user-metrics"><span>{outputUsage(entitlements, account.id)}</span><span>{settings[account.id]?.is_regular === false ? 'Non-regular' : 'Regular'}</span><span>Payroll estimate {money(payroll)}</span></div><div className="manager-console-actions-row">{account.account_status === 'pending_manager_approval' && <><ControlForm profileId={account.id} intent="approve" label="Accept" primary /><ControlForm profileId={account.id} intent="reject" label="Reject" /></>}{account.account_status === 'active' && <><ControlForm profileId={account.id} intent="suspend" label="Pause" /><ControlForm profileId={account.id} intent="clear_manager" label="Unlink" /></>}{(account.account_status === 'disabled' || account.account_status === 'suspended') && <ControlForm profileId={account.id} intent="activate" label="Reactivate" primary />}</div><PayrollSettingsForm managerId={managerId} accountId={account.id} settings={settings[account.id]} /></article>; }
function EmptyState({ children }: { children: string }) { return <div className="admin-monitor-empty manager-console-empty">{children}</div>; }

function MonitoringPanel({ summary, pending, active, entitlements }: { summary: Awaited<ReturnType<typeof getManagerClientSummary>>['summary']; pending: AccountDirectoryListResult; active: AccountDirectoryListResult; entitlements: EntitlementLimitMap }) { const outputToday = active.accounts.reduce((sum, account) => sum + (entitlements[account.id]?.output_used_today || 0), 0); return <><section className="manager-console-kpi-grid"><article><span>Assigned users</span><strong>{summary.clients}</strong><small>Manager scope</small></article><article><span>Pending requests</span><strong>{summary.pending}</strong><small>Need confirmation</small></article><article><span>Active users</span><strong>{summary.active}</strong><small>Can generate outputs</small></article><article><span>Outputs today</span><strong>{outputToday}</strong><small>Visible active sample</small></article></section><section className="manager-console-two-column"><article className="admin-monitor-card native-operation-card"><header className="manager-console-card-header"><div><p>Monitoring</p><h2>Active output status</h2></div><ConsoleNavLink className="dashboard-card-link" href="/admin/output-queue">Open queue</ConsoleNavLink></header>{active.accounts.length ? <div className="manager-console-compact-list">{active.accounts.map((account) => <div key={account.id}><strong>{account.full_name || account.email || 'Client'}</strong><span>{outputUsage(entitlements, account.id)}</span></div>)}</div> : <EmptyState>No active users to monitor yet.</EmptyState>}</article><article className="admin-monitor-card native-operation-card"><header className="manager-console-card-header"><div><p>Request</p><h2>Pending confirmation</h2></div><ConsoleNavLink className="dashboard-card-link" href="/admin?panel=requests">Review</ConsoleNavLink></header>{pending.accounts.length ? <div className="manager-console-compact-list">{pending.accounts.map((account) => <div key={account.id}><strong>{account.full_name || account.email || 'Client'}</strong><span>{statusText(account.account_status)}</span></div>)}</div> : <EmptyState>No pending confirmations.</EmptyState>}</article></section></>; }
function AccessPanel({ accounts, managerId, entitlements, settings }: { accounts: AccountDirectoryRow[]; managerId: string; entitlements: EntitlementLimitMap; settings: ManagerUserSettingMap }) { return <section className="manager-console-stack">{accounts.length ? accounts.map((account) => <ManagerAccountCard key={account.id} account={account} managerId={managerId} entitlements={entitlements} settings={settings} />) : <EmptyState>No users are assigned to this manager workspace yet.</EmptyState>}</section>; }
function ReportPanel({ summary, accounts, entitlements }: { summary: Awaited<ReturnType<typeof getManagerClientSummary>>['summary']; accounts: AccountDirectoryRow[]; entitlements: EntitlementLimitMap }) { const outputs = accounts.reduce((sum, account) => sum + (entitlements[account.id]?.output_used_today || 0), 0); return <section className="admin-monitor-card native-operation-card manager-console-report"><header className="manager-console-card-header"><div><p>Report</p><h2>Manager operations summary</h2></div><ConsoleNavLink className="dashboard-card-link" href="/admin/reports">Full reports</ConsoleNavLink></header><div className="manager-console-report-grid"><span>Total clients <strong>{summary.clients}</strong></span><span>Active <strong>{summary.active}</strong></span><span>Pending <strong>{summary.pending}</strong></span><span>Blocked <strong>{summary.blocked}</strong></span><span>Outputs today <strong>{outputs}</strong></span><span>Unassigned <strong>{summary.unassigned}</strong></span></div><div className="manager-console-compact-list">{accounts.slice(0, 8).map((account) => <div key={account.id}><strong>{account.full_name || account.email || 'Client'}</strong><span>{statusText(account.account_status)} • {outputUsage(entitlements, account.id)}</span></div>)}</div></section>; }
function PayrollPanel({ accounts, managerId, entitlements, settings }: { accounts: AccountDirectoryRow[]; managerId: string; entitlements: EntitlementLimitMap; settings: ManagerUserSettingMap }) { const total = accounts.reduce((sum, account) => sum + payrollAmount(settings[account.id], entitlements[account.id]?.output_used_today || 0), 0); return <section className="admin-monitor-card native-operation-card manager-console-report"><header className="manager-console-card-header"><div><p>Output Activity</p><h2>Confirmed disputer output pay</h2></div><strong>{money(total)}</strong></header><div className="manager-console-stack">{accounts.length ? accounts.map((account) => <ManagerAccountCard key={account.id} account={account} managerId={managerId} entitlements={entitlements} settings={settings} />) : <EmptyState>No active users for output activity computation.</EmptyState>}</div></section>; }
function RequestsPanel({ pending, blocked, managerId, entitlements, settings }: { pending: AccountDirectoryListResult; blocked: AccountDirectoryListResult; managerId: string; entitlements: EntitlementLimitMap; settings: ManagerUserSettingMap }) { const requests = uniqueAccounts(pending.accounts, blocked.accounts); return <section className="manager-console-stack">{requests.length ? requests.map((account) => <ManagerAccountCard key={account.id} account={account} managerId={managerId} entitlements={entitlements} settings={settings} />) : <EmptyState>No pending confirmations or blocked users.</EmptyState>}</section>; }

export default async function AdminPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const activePanel = normalizeManagerOperationsPanel(params.panel);
  const controlStatus = stringParam(params.control);
  const controlMessage = stringParam(params.message);
  const { user, profile, supabase } = await requireRole('manager');

  const [summaryResult, pendingResult, activeResult, blockedResult, inviteCode] = await Promise.all([
    getManagerClientSummary(supabase),
    listManagerClientDirectory(supabase, { view: 'pending', page: 1, pageSize: 8 }),
    listManagerClientDirectory(supabase, { view: 'active', page: 1, pageSize: 8 }),
    listManagerClientDirectory(supabase, { view: 'blocked', page: 1, pageSize: 8 }),
    activePanel === 'requests' ? ensureManagerInviteCode(supabase, user.id) : Promise.resolve('')
  ]);

  const allAccounts = uniqueAccounts(pendingResult.accounts, activeResult.accounts, blockedResult.accounts);
  const entitlementResult = await listEntitlementLimits(supabase, [user.id, ...allAccounts.map((account) => account.id)]);
  const settingsResult = await listManagerUserSettings(supabase, user.id, allAccounts.map((account) => account.id));
  const summary = summaryResult.summary;
  const queryError = summaryResult.errorMessage || pendingResult.errorMessage || activeResult.errorMessage || blockedResult.errorMessage || entitlementResult.errorMessage || settingsResult.errorMessage;
  const activeDefinition = managerOperationsNavItems(activePanel).find(hasActiveState);

  let inviteLink = '';
  if (activePanel === 'requests') {
    const requestHeaders = await headers();
    const host = requestHeaders.get('x-forwarded-host') || requestHeaders.get('host') || 'x-disputer.vercel.app';
    const protocol = requestHeaders.get('x-forwarded-proto') || 'https';
    inviteLink = `${protocol}://${host}/signup?invite=${encodeURIComponent(inviteCode)}`;
  }

  return <ManagerConsoleShell
    mode="operations"
    email={profile?.email || user.email}
    accountName={profile?.full_name || user.user_metadata?.full_name as string | null | undefined}
    accountLabel="Manager account"
    navItems={managerOperationsNavItems(activePanel)}
    header={{ eyebrow: 'Manager console', title: activeDefinition?.label || 'Monitoring', description: activeDefinition?.label === 'Output Activity' ? 'Confirm generated output before it affects payday pay.' : activeDefinition?.label === 'Access control of user' ? 'Manage user account status and operational metadata.' : activeDefinition?.label === 'Request' ? 'Review pending confirmations and invite requests.' : activeDefinition?.label === 'Report' ? 'Generate a clean operational report.' : 'Monitor outputs and user status from one clean panel.' }}
  >
    {controlStatus && <section className={`admin-monitor-card admin-feedback-card ${controlStatus === 'ok' ? 'success' : 'error'}`}><strong>{controlStatus === 'ok' ? 'Action completed' : 'Action failed'}</strong><span>{controlStatus === 'ok' ? controlMessage || 'The manager console refreshed with the latest state.' : controlMessage || 'Unknown error.'}</span></section>}
    {queryError && <section className="admin-monitor-card"><div className="admin-monitor-empty">Could not load a manager console dataset: {queryError}</div></section>}
    {activePanel === 'monitoring' && <MonitoringPanel summary={summary} pending={pendingResult} active={activeResult} entitlements={entitlementResult.entitlements} />}
    {activePanel === 'access' && <AccessPanel accounts={allAccounts} managerId={user.id} entitlements={entitlementResult.entitlements} settings={settingsResult.settings} />}
    {activePanel === 'reports' && <ReportPanel summary={summary} accounts={allAccounts} entitlements={entitlementResult.entitlements} />}
    {activePanel === 'payroll' && <PayrollPanel accounts={activeResult.accounts} managerId={user.id} entitlements={entitlementResult.entitlements} settings={settingsResult.settings} />}
    {activePanel === 'requests' && <><section className="admin-monitor-card native-operation-card manager-console-report"><header className="manager-console-card-header"><div><p>Request</p><h2>Manager invite link</h2></div><span>{inviteCode || 'Ready'}</span></header><p>Share this link with users who should request access. They stay pending until accepted.</p><code>{inviteLink}</code></section><RequestsPanel pending={pendingResult} blocked={blockedResult} managerId={user.id} entitlements={entitlementResult.entitlements} settings={settingsResult.settings} /></>}
  </ManagerConsoleShell>;
}
