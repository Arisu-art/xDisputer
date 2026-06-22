import ConsoleNavLink from '../../../components/ConsoleNavLink';
import ConsoleShell from '../../../components/console/ConsoleShell';
import { listManagerClientDirectory, type AccountDirectoryRow } from '../../../lib/saas/account-directory';
import { listManagerOutputApprovals, listManagerUserSettings, type ManagerOutputApproval, type OutputActivityFilter } from '../../../lib/saas/manager-user-settings';
import { managerOperationsNavItems } from '../../../lib/manager-console/manager-operations-panels';
import { requireRole } from '../../../lib/saas/session';
import { normalizeOutputActivityFilter, outputActivityStatusLabel } from '../../../src/features/manager-output-activity/output-activity-contract';

type PageProps = { searchParams?: Promise<{ filter?: string | string[]; control?: string | string[]; message?: string | string[] }> };

function money(value: number) { return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(value); }
function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
function clientLabel(account?: AccountDirectoryRow, row?: ManagerOutputApproval) { return row?.client_name || account?.full_name || account?.email || 'Client user'; }
function bossNote(row: ManagerOutputApproval, name?: string | null, email?: string | null) { return row.notes || name || email || 'Manager note not set'; }
function activityPay(row: ManagerOutputApproval) { return row.is_per_output ? row.output_count * row.rate_amount : 0; }
function filterHref(filter: OutputActivityFilter) { return filter === 'all' ? '/admin/output-activity-v2' : `/admin/output-activity-v2?filter=${filter}`; }

function FilterTabs({ active }: { active: OutputActivityFilter }) {
  const tabs: Array<{ value: OutputActivityFilter; label: string; detail: string }> = [
    { value: 'all', label: 'All', detail: 'Per-output and fulltime output' },
    { value: 'per_output', label: 'Per output', detail: 'Needs confirmation' },
    { value: 'not_per_output', label: 'Fulltime Output', detail: 'No confirmation' }
  ];
  return <nav className="output-activity-filter-tabs" aria-label="Output activity filter">{tabs.map((tab) => <ConsoleNavLink key={tab.value} href={filterHref(tab.value)} className={`output-activity-filter-tab ${active === tab.value ? 'active' : ''}`}><strong>{tab.label}</strong><small>{tab.detail}</small></ConsoleNavLink>)}</nav>;
}

function DecisionForm({ row, rateAmount }: { row: ManagerOutputApproval; rateAmount: number }) {
  if (!row.is_per_output) return <span className="output-activity-readonly-note">Fulltime Output — no salary confirmation needed.</span>;
  if (row.status === 'pending') return <form action="/api/manager-output-decision" method="post" className="manager-user-settings-form output-decision-form"><input type="hidden" name="activityId" value={row.id} /><label><span>Extra rate</span><input name="rateAmount" inputMode="decimal" defaultValue={String(row.rate_amount || rateAmount || 0)} /></label><button type="submit" name="action" value="confirm" className="admin-action-button primary">Confirm per-output</button><button type="submit" name="action" value="reject" className="admin-action-button">Return</button></form>;
  if (row.status === 'approved') return <form action="/api/manager-output-decision" method="post" className="manager-console-actions-row"><input type="hidden" name="activityId" value={row.id} /><button type="submit" name="action" value="paid" className="admin-action-button">Mark paid</button></form>;
  return <span className="output-activity-readonly-note">{outputActivityStatusLabel(row.status, row.is_per_output)}</span>;
}

function ActivityRow({ row, account, bossName, bossEmail, rateAmount }: { row: ManagerOutputApproval; account?: AccountDirectoryRow; bossName?: string | null; bossEmail?: string | null; rateAmount: number }) {
  return <article className={`output-activity-row ${row.is_per_output ? 'payable' : 'recorded'}`} data-output-activity-kind={row.is_per_output ? 'per-output' : 'fulltime-output'}>
    <header><div><strong>{row.is_per_output ? 'Per-output task' : 'Fulltime output task'}</strong><span>{clientLabel(account, row)} • {row.round_label || 'Round not set'} • {outputActivityStatusLabel(row.status, row.is_per_output)}</span></div><span className={`admin-status-badge ${row.is_per_output ? 'active' : 'pending'}`}>{row.is_per_output ? 'Per output' : 'Fulltime Output'}</span></header>
    <div className="output-activity-facts output-activity-facts-compact"><span><strong>Client user / Disputer</strong><small>{clientLabel(account, row)}</small></span><span><strong>Boss / Note</strong><small>{bossNote(row, bossName, bossEmail)}</small></span><span><strong>Round selected</strong><small>{row.round_label || 'Round not set'}</small></span>{row.is_per_output && <span><strong>Salary add</strong><small>{money(activityPay(row))}</small></span>}</div>
    <DecisionForm row={row} rateAmount={rateAmount} />
  </article>;
}

export default async function ManagerOutputActivityV2Page({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const filter = normalizeOutputActivityFilter(params.filter);
  const controlStatus = first(params.control);
  const controlMessage = first(params.message);
  const { user, profile, supabase } = await requireRole('manager');
  const active = await listManagerClientDirectory(supabase, { view: 'active', page: 1, pageSize: 25 });
  const ids = active.accounts.map((account) => account.id);
  const [settingsResult, activityResult] = await Promise.all([
    listManagerUserSettings(supabase, user.id, ids),
    listManagerOutputApprovals(supabase, user.id, ids, filter)
  ]);
  const accountMap = new Map(active.accounts.map((account) => [account.id, account]));
  const pendingCount = Object.values(activityResult.summary).reduce((sum, item) => sum + item.pendingCount, 0);
  const fulltimeOutputCount = Object.values(activityResult.summary).reduce((sum, item) => sum + item.recordedCount, 0);
  const approvedPay = Object.values(activityResult.summary).reduce((sum, item) => sum + item.approvedExtraPay, 0);

  return <ConsoleShell role="manager" mode="operations" email={profile?.email || user.email || 'Manager'} accountLabel="Manager account" brandSubtitle="Manager console" sidebarSectionTitle="Operations" navItems={managerOperationsNavItems('payroll')} switchTarget="/manager-workspace" switchTargetLabel="Manager workspace" navAriaLabel="Manager output activity navigation" activeNavUsesConsoleLink header={{ eyebrow: 'Output Activity', title: 'Confirm per-output letters.', description: 'Generated letters appear here. Per-output items need manager confirmation; Fulltime Output items are read-only.' }}>
    {controlStatus && <section className={`admin-monitor-card admin-feedback-card ${controlStatus === 'ok' ? 'success' : 'error'}`}><strong>{controlStatus === 'ok' ? 'Output activity updated' : 'Output activity error'}</strong><span>{controlMessage || ''}</span></section>}
    {(active.errorMessage || settingsResult.errorMessage || activityResult.errorMessage) && <section className="admin-monitor-card"><div className="admin-monitor-empty">Could not load output activity: {active.errorMessage || settingsResult.errorMessage || activityResult.errorMessage}</div></section>}
    <section className="minimal-report-summary output-activity-summary" aria-label="Output activity summary"><article><span>Pending per-output</span><strong>{pendingCount}</strong><small>Needs confirmation</small></article><article><span>Fulltime Output</span><strong>{fulltimeOutputCount}</strong><small>No confirmation</small></article><article><span>Approved salary add</span><strong>{money(approvedPay)}</strong><small>Per-output only</small></article></section>
    <FilterTabs active={filter} />
    <section className="manager-console-stack output-activity-stack">{activityResult.approvals.length ? activityResult.approvals.map((row) => { const account = accountMap.get(row.disputer_id); const setting = settingsResult.settings[row.disputer_id]; return <ActivityRow key={row.id} row={row} account={account} bossName={profile?.full_name} bossEmail={profile?.email || user.email} rateAmount={setting?.per_output_rate || setting?.rate || 0} />; }) : <div className="admin-monitor-empty">No generated outputs match this filter.</div>}</section>
  </ConsoleShell>;
}
