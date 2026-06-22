import ConsoleNavLink from '../../../components/ConsoleNavLink';
import ConsoleShell from '../../../components/console/ConsoleShell';
import { listManagerClientDirectory, type AccountDirectoryRow } from '../../../lib/saas/account-directory';
import {
  listManagerOutputApprovals,
  listManagerUserSettings,
  type ManagerOutputApproval,
  type OutputActivityFilter
} from '../../../lib/saas/manager-user-settings';
import { managerOperationsNavItems } from '../../../lib/manager-console/manager-operations-panels';
import { requireRole } from '../../../lib/saas/session';
import {
  normalizeOutputActivityFilter,
  outputActivityStatusLabel
} from '../../../src/features/manager-output-activity/output-activity-contract';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  searchParams?: Promise<{
    filter?: string | string[];
    control?: string | string[];
    message?: string | string[];
  }>;
};

type OutputActivityCounts = {
  totalCount: number;
  perOutputCount: number;
  fulltimeOutputCount: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
};

function numberText(value: number) {
  return new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 }).format(Math.round(value || 0));
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function clientLabel(account?: AccountDirectoryRow, row?: ManagerOutputApproval) {
  return row?.client_name || account?.full_name || account?.email || 'Client user';
}

function bossInfo(row: ManagerOutputApproval) {
  return row.notes || 'No note set';
}

function routeInfo(row: ManagerOutputApproval) {
  return row.letter_route || 'Generated letter';
}

function filterHref(filter: OutputActivityFilter) {
  return filter === 'all' ? '/admin/output-activity-v2' : `/admin/output-activity-v2?filter=${filter}`;
}

async function syncRecentGeneratedOutputActivity(supabase: Awaited<ReturnType<typeof import('../../../lib/supabase/server').createSupabaseServerClient>>, clientIds: string[]) {
  if (!clientIds.length) return;
  const runs = await supabase
    .from('generation_runs')
    .select('id')
    .in('owner_id', clientIds)
    .eq('output_status', 'generated')
    .order('created_at', { ascending: false })
    .limit(30);

  if (runs.error || !runs.data?.length) return;
  for (const run of runs.data) {
    if (!run.id) continue;
    await supabase.rpc('sync_generation_output_activity_v1', { generation_run_id_input: run.id }).catch(() => null);
  }
}

function FilterTabs({ active, counts }: { active: OutputActivityFilter; counts: OutputActivityCounts }) {
  const tabs: Array<{ value: OutputActivityFilter; label: string; detail: string; count: number }> = [
    { value: 'all', label: 'All', detail: 'All generated output', count: counts.totalCount },
    { value: 'per_output', label: 'Per output', detail: `${numberText(counts.pendingCount)} pending · ${numberText(counts.approvedCount)} confirmed`, count: counts.perOutputCount },
    { value: 'not_per_output', label: 'Fulltime Output', detail: 'No confirmation needed', count: counts.fulltimeOutputCount }
  ];

  return (
    <nav className="output-activity-filter-tabs output-activity-count-tabs" aria-label="Output activity filter">
      {tabs.map((tab) => (
        <ConsoleNavLink
          key={tab.value}
          href={filterHref(tab.value)}
          className={`output-activity-filter-tab ${active === tab.value ? 'active' : ''}`}
        >
          <span className="output-activity-filter-copy"><strong>{tab.label}</strong><small>{tab.detail}</small></span>
          <b aria-label={`${tab.label} count`}>{numberText(tab.count)}</b>
        </ConsoleNavLink>
      ))}
    </nav>
  );
}

function DecisionForm({ row, rateAmount }: { row: ManagerOutputApproval; rateAmount: number }) {
  if (!row.is_per_output) {
    return <span className="output-activity-readonly-note">Fulltime Output — no salary confirmation needed.</span>;
  }

  if (row.status === 'pending') {
    return (
      <form action="/api/manager-output-decision" method="post" className="manager-user-settings-form output-decision-form">
        <input type="hidden" name="activityId" value={row.id} />
        <label>
          <span>Rate</span>
          <input name="rateAmount" inputMode="decimal" defaultValue={String(Math.round(row.rate_amount || rateAmount || 0))} />
        </label>
        <button type="submit" name="action" value="confirm" aria-label="Confirm per-output" className="admin-action-button primary">Confirm</button>
        <button type="submit" name="action" value="reject" className="admin-action-button">Return</button>
      </form>
    );
  }

  return <span className="output-activity-readonly-note">{outputActivityStatusLabel(row.status, row.is_per_output)}</span>;
}

function ActivityRow({ row, account, rateAmount }: { row: ManagerOutputApproval; account?: AccountDirectoryRow; rateAmount: number }) {
  const isPerOutput = row.is_per_output;
  const statusLabel = outputActivityStatusLabel(row.status, isPerOutput);

  return (
    <article className={`output-activity-row ${isPerOutput ? 'payable' : 'recorded'}`} data-output-activity-kind={isPerOutput ? 'per-output' : 'fulltime-output'}>
      <header>
        <div>
          <strong>{isPerOutput ? 'Per-output generated letter' : 'Fulltime generated letter'}</strong>
          <span>{statusLabel}</span>
        </div>
        <span className={`admin-status-badge ${isPerOutput ? 'active' : 'pending'}`}>{isPerOutput ? 'Per output' : 'Fulltime Output'}</span>
      </header>
      <div className="output-activity-facts output-activity-facts-compact">
        <span><strong>Client user / Disputer</strong><small>{clientLabel(account, row)}</small></span>
        <span><strong>Boss</strong><small>{bossInfo(row)}</small></span>
        <span><strong>Round selected</strong><small>{row.round_label || 'Round not set'}</small></span>
        <span><strong>Output</strong><small>{numberText(row.output_count)} item(s) · {routeInfo(row)}</small></span>
      </div>
      <DecisionForm row={row} rateAmount={rateAmount} />
    </article>
  );
}

export default async function ManagerOutputActivityV2Page({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const filter = normalizeOutputActivityFilter(params.filter);
  const controlStatus = first(params.control);
  const controlMessage = first(params.message);
  const { user, profile, supabase } = await requireRole('manager');

  const active = await listManagerClientDirectory(supabase, { view: 'active', page: 1, pageSize: 25 });
  const ids = active.accounts.map((account) => account.id);
  await syncRecentGeneratedOutputActivity(supabase, ids);
  const [settingsResult, activityResult] = await Promise.all([
    listManagerUserSettings(supabase, user.id, ids),
    listManagerOutputApprovals(supabase, user.id, ids, filter)
  ]);

  const accountMap = new Map(active.accounts.map((account) => [account.id, account]));
  const counts: OutputActivityCounts = {
    totalCount: activityResult.totals.totalCount,
    perOutputCount: activityResult.totals.perOutputCount,
    fulltimeOutputCount: activityResult.totals.fulltimeOutputCount,
    pendingCount: activityResult.totals.pendingCount,
    approvedCount: activityResult.totals.approvedCount,
    rejectedCount: activityResult.totals.rejectedCount
  };

  return (
    <ConsoleShell
      role="manager"
      mode="operations"
      email={profile?.email || user.email || 'Manager'}
      accountLabel="Manager account"
      brandSubtitle="Manager console"
      sidebarSectionTitle="Operations"
      navItems={managerOperationsNavItems('payroll')}
      switchTarget="/manager-workspace"
      switchTargetLabel="Manager workspace"
      navAriaLabel="Manager output activity navigation"
      activeNavUsesConsoleLink
      header={{
        eyebrow: 'Output Activity',
        title: 'Generated output.',
        description: 'Use the filter cards to review all output, per-output confirmations, or fulltime output records.'
      }}
    >
      {controlStatus && (
        <section className={`admin-monitor-card admin-feedback-card ${controlStatus === 'ok' ? 'success' : 'error'}`}>
          <strong>{controlStatus === 'ok' ? 'Output activity updated' : 'Output activity error'}</strong>
          <span>{controlMessage || ''}</span>
        </section>
      )}
      {(active.errorMessage || settingsResult.errorMessage || activityResult.errorMessage) && (
        <section className="admin-monitor-card">
          <div className="admin-monitor-empty">Could not load output activity: {active.errorMessage || settingsResult.errorMessage || activityResult.errorMessage}</div>
        </section>
      )}
      <FilterTabs active={filter} counts={counts} />
      <section className="manager-console-stack output-activity-stack">
        {activityResult.approvals.length ? activityResult.approvals.map((row) => {
          const account = accountMap.get(row.disputer_id);
          const setting = settingsResult.settings[row.disputer_id];
          return <ActivityRow key={row.id} row={row} account={account} rateAmount={setting?.per_output_rate || setting?.rate || 0} />;
        }) : <div className="admin-monitor-empty">No generated outputs match this filter.</div>}
      </section>
    </ConsoleShell>
  );
}
