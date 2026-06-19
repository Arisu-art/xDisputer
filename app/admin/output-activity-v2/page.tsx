import ConsoleShell from '../../../components/console/ConsoleShell';
import { listManagerClientDirectory } from '../../../lib/saas/account-directory';
import { listManagerOutputApprovals, listManagerUserSettings, payrollAmount } from '../../../lib/saas/manager-user-settings';
import { managerOperationsNavItems } from '../../../lib/manager-console/manager-operations-panels';
import { requireRole } from '../../../lib/saas/session';

function money(value: number) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value); }

export default async function ManagerOutputActivityV2Page() {
  const { user, profile, supabase } = await requireRole('manager');
  const active = await listManagerClientDirectory(supabase, { view: 'active', page: 1, pageSize: 25 });
  const ids = active.accounts.map((account) => account.id);
  const [settingsResult, activityResult] = await Promise.all([
    listManagerUserSettings(supabase, user.id, ids),
    listManagerOutputApprovals(supabase, user.id, ids)
  ]);

  return <ConsoleShell role="manager" mode="operations" email={profile?.email || user.email || 'Manager'} accountLabel="Manager account" brandSubtitle="Manager console" sidebarSectionTitle="Operations" navItems={managerOperationsNavItems('payroll')} switchTarget="/manager-workspace" switchTargetLabel="Manager workspace" navAriaLabel="Manager output activity navigation" activeNavUsesConsoleLink>
    <header className="admin-monitor-header native-command-hero manager-compact-hero"><div><p>Output Activity</p><h1>Confirm disputer output before payday.</h1><span>Generated outputs stay pending until manager confirmation.</span></div></header>
    <section className="manager-console-stack">
      {active.accounts.map((account) => {
        const setting = settingsResult.settings[account.id];
        const summary = activityResult.summary[account.id];
        const rows = activityResult.approvals.filter((item) => item.disputer_id === account.id).slice(0, 8);
        return <article key={account.id} className="manager-console-user-card">
          <header><div><strong>{account.full_name || account.email || 'Disputer'}</strong><span>Pending {summary?.pendingCount || 0} | Approved extra {money(summary?.approvedExtraPay || 0)}</span></div><span className="admin-status-badge active">Payday {money(payrollAmount(setting, summary))}</span></header>
          {rows.length ? <div className="manager-console-compact-list">{rows.map((row) => <div key={row.id}><strong>{row.output_label}</strong><span>{row.output_count} x {money(row.rate_amount)} | {row.status}</span>{row.status === 'pending' && <form action="/api/manager-output-decision" method="post" className="manager-user-settings-form"><input type="hidden" name="activityId" value={row.id} /><label><span>Extra rate</span><input name="rateAmount" inputMode="decimal" defaultValue={String(row.rate_amount || setting?.per_output_rate || 0)} /></label><button type="submit" name="action" value="confirm" className="admin-action-button primary">Confirm output</button><button type="submit" name="action" value="reject" className="admin-action-button">Return output</button></form>}{row.status === 'approved' && <form action="/api/manager-output-decision" method="post"><input type="hidden" name="activityId" value={row.id} /><button type="submit" name="action" value="paid" className="admin-action-button">Mark paid</button></form>}</div>)}</div> : <div className="admin-monitor-empty">No output tasks waiting for this user.</div>}
        </article>;
      })}
    </section>
  </ConsoleShell>;
}
