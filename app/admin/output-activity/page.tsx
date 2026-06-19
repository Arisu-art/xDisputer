import ConsoleShell from '../../../components/console/ConsoleShell';
import ConsoleNavLink from '../../../components/ConsoleNavLink';
import { listManagerClientDirectory, type AccountDirectoryRow } from '../../../lib/saas/account-directory';
import { listEntitlementLimits } from '../../../lib/saas/entitlement-limits';
import { listManagerOutputApprovals, listManagerUserSettings, payrollAmount } from '../../../lib/saas/manager-user-settings';
import { managerOperationsNavItems } from '../../../lib/manager-console/manager-operations-panels';
import { requireRole } from '../../../lib/saas/session';

function money(value: number) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value); }
function label(account: AccountDirectoryRow) { return account.full_name || account.email || 'Disputer'; }

function ActivityForm({ accountId, defaultRate }: { accountId: string; defaultRate: number }) {
  return <form action="/api/manager-console/output-activity" method="post" className="manager-user-settings-form"><input type="hidden" name="intent" value="create" /><input type="hidden" name="disputerId" value={accountId} /><label><span>Output task</span><input name="outputLabel" defaultValue="Confirmed output task" /></label><label><span>Output count</span><input name="outputCount" inputMode="numeric" defaultValue="1" /></label><label><span>Rate</span><input name="rateAmount" inputMode="decimal" defaultValue={String(defaultRate || 0)} /></label><label><span>Payday label</span><input name="paydayLabel" placeholder="June payday" /></label><button type="submit" className="admin-action-button primary">Add for confirmation</button></form>;
}

function ActivityAction({ id, intent, label }: { id: string; intent: string; label: string }) {
  return <form action="/api/manager-console/output-activity" method="post"><input type="hidden" name="activityId" value={id} /><input type="hidden" name="intent" value={intent} /><button type="submit" className="admin-action-button">{label}</button></form>;
}

export default async function ManagerOutputActivityPage() {
  const { user, profile, supabase } = await requireRole('manager');
  const active = await listManagerClientDirectory(supabase, { view: 'active', page: 1, pageSize: 25 });
  const ids = active.accounts.map((account) => account.id);
  const [settingsResult, activityResult, entitlementResult] = await Promise.all([
    listManagerUserSettings(supabase, user.id, ids),
    listManagerOutputApprovals(supabase, user.id, ids),
    listEntitlementLimits(supabase, ids)
  ]);

  return <ConsoleShell role="manager" mode="operations" email={profile?.email || user.email || 'Manager'} accountLabel="Manager account" brandSubtitle="Manager console" sidebarSectionTitle="Operations" navItems={managerOperationsNavItems('payroll')} switchTarget="/manager-workspace" switchTargetLabel="Manager workspace" navAriaLabel="Manager output activity navigation" activeNavUsesConsoleLink>
    <header className="admin-monitor-header native-command-hero manager-compact-hero"><div><p>Per-user output</p><h1>Output activity confirmation.</h1><span>Managers confirm output tasks before they become extra pay on payday.</span></div><ConsoleNavLink className="directory-header-action" href="/admin?panel=payroll">Payroll</ConsoleNavLink></header>
    {(active.errorMessage || settingsResult.errorMessage || activityResult.errorMessage || entitlementResult.errorMessage) && <section className="admin-monitor-card"><div className="admin-monitor-empty">Could not load output activity: {active.errorMessage || settingsResult.errorMessage || activityResult.errorMessage || entitlementResult.errorMessage}</div></section>}
    <section className="manager-console-stack">{active.accounts.length ? active.accounts.map((account) => { const setting = settingsResult.settings[account.id]; const summary = activityResult.summary[account.id]; const rows = activityResult.approvals.filter((item) => item.disputer_id === account.id).slice(0, 5); return <article key={account.id} className="manager-console-user-card"><header><div><strong>{label(account)}</strong><span>{account.email || 'Disputer account'} • approved extra {money(summary?.approvedExtraPay || 0)}</span></div><span className="admin-status-badge active">Payday {money(payrollAmount(setting, summary))}</span></header><ActivityForm accountId={account.id} defaultRate={setting?.per_output_rate || 0} />{rows.length ? <div className="manager-console-compact-list">{rows.map((row) => <div key={row.id}><strong>{row.output_label}</strong><span>{row.output_count} × {money(row.rate_amount)} • {row.status}</span>{row.status === 'pending' && <span className="manager-console-actions-row"><ActivityAction id={row.id} intent="approve" label="Accept output" /><ActivityAction id={row.id} intent="reject" label="Reject" /></span>}{row.status === 'approved' && <span className="manager-console-actions-row"><ActivityAction id={row.id} intent="paid" label="Mark paid" /></span>}</div>)}</div> : <div className="admin-monitor-empty">No output tasks recorded yet.</div>}</article>; }) : <div className="admin-monitor-empty">No active disputers available.</div>}</section>
  </ConsoleShell>;
}
