import ConsoleNavLink from './ConsoleNavLink';
import ManagerWorkspaceSwitch from './ManagerWorkspaceSwitch';
import type { GenerationReportFilters, GenerationReportRow, GenerationReportSummary } from '../lib/saas/generation-reports';

type Scope = 'master' | 'manager';

type Props = {
  scope: Scope;
  action: string;
  exportHref: string;
  filters: GenerationReportFilters;
  activeCount: number;
  rows: GenerationReportRow[];
  summary: GenerationReportSummary;
  title: string;
  eyebrow: string;
  description: string;
  errorMessage?: string | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
}

function percent(value: number, total: number) {
  if (!total) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

function topLabel(items: Array<{ label: string; count: number }>, fallback: string) {
  return items[0] ? `${items[0].label} · ${items[0].count}` : fallback;
}

function statusLabel(value: string | null | undefined) {
  if (value === 'generated') return 'Generated';
  if (value === 'downloaded') return 'Downloaded';
  if (value === 'failed') return 'Failed';
  return value || 'Unknown';
}

function ReportNavigation({ scope }: { scope: Scope }) {
  if (scope === 'master') {
    return <nav aria-label="Master reports navigation">
      <ConsoleNavLink href="/master">Monitoring</ConsoleNavLink>
      <ConsoleNavLink href="/master/accounts">Accounts</ConsoleNavLink>
      <ConsoleNavLink className="active" href="/master/reports">Reports</ConsoleNavLink>
      <ConsoleNavLink href="/master/audit">Audit</ConsoleNavLink>
      <ConsoleNavLink href="/master/system">System</ConsoleNavLink>
    </nav>;
  }

  return <nav aria-label="Manager reports navigation">
    <ConsoleNavLink href="/admin">Monitoring</ConsoleNavLink>
    <ConsoleNavLink href="/admin/access">Access</ConsoleNavLink>
    <ConsoleNavLink href="/admin?panel=intake">Intake</ConsoleNavLink>
    <ConsoleNavLink className="active" href="/admin/reports">Reports</ConsoleNavLink>
    <ConsoleNavLink href="/admin/audit">Audit</ConsoleNavLink>
  </nav>;
}

function ReportFilters({ action, exportHref, filters, activeCount }: Pick<Props, 'action' | 'exportHref' | 'filters' | 'activeCount'>) {
  return <section className="admin-monitor-card native-operation-card minimal-report-filter-card compact-report-filter-card">
    <div className="admin-monitor-card-header compact-card-header">
      <div><p>Filters</p><h2>Refine activity</h2></div>
      <span>{activeCount} active</span>
    </div>
    <form action={action} method="get" className="minimal-report-toolbar compact-report-toolbar">
      <label className="report-filter-search">
        <span>Search</span>
        <input name="query" type="search" placeholder="Client, round, or status" defaultValue={filters.query || ''} />
      </label>
      <label>
        <span>Period</span>
        <select name="period" defaultValue={filters.period || '30d'}>
          <option value="7d">7 days</option>
          <option value="30d">30 days</option>
          <option value="90d">90 days</option>
          <option value="all">All time</option>
        </select>
      </label>
      <label>
        <span>Status</span>
        <select name="status" defaultValue={filters.status || ''}>
          <option value="">All</option>
          <option value="generated">Generated</option>
          <option value="downloaded">Downloaded</option>
          <option value="failed">Failed</option>
        </select>
      </label>
      <div className="report-filter-actions compact-report-actions">
        <button type="submit" className="admin-action-button primary">Apply</button>
        <ConsoleNavLink className="admin-action-button" href={action}>Reset</ConsoleNavLink>
        <a className="admin-action-button" href={exportHref}>Export</a>
      </div>
    </form>
  </section>;
}

function ReportHeroMetrics({ summary }: { summary: GenerationReportSummary }) {
  const successful = summary.generated + summary.downloaded;

  return <aside className="report-side-summary" aria-label="Generation report summary">
    <div className="report-side-summary-top">
      <article><span>Runs</span><strong>{summary.total}</strong><small>{summary.downloaded} downloaded</small></article>
      <article><span>Done</span><strong>{percent(successful, summary.total)}</strong><small>{successful} successful</small></article>
      <article className={summary.failed ? 'attention' : 'complete'}><span>Failures</span><strong>{summary.failed}</strong><small>{summary.failed ? 'Needs review' : 'No failures'}</small></article>
    </div>
    <dl className="report-side-summary-list">
      <div><dt>Top round</dt><dd>{topLabel(summary.byRound, 'No activity')}</dd></div>
      <div><dt>Top client</dt><dd>{topLabel(summary.byClient, 'No client activity')}</dd></div>
      <div><dt>State</dt><dd>{topLabel(summary.byStatus, 'No status yet')}</dd></div>
    </dl>
  </aside>;
}

function ActivityStream({ rows, scope }: { rows: GenerationReportRow[]; scope: Scope }) {
  return <section className="admin-monitor-card native-operation-card minimal-activity-card report-dataset-card">
    <div className="admin-monitor-card-header compact-card-header report-dataset-header">
      <div><p>Activity</p><h2>Recent generation events</h2></div>
      <span>{rows.length} total</span>
    </div>
    {rows.length ? <div className="minimal-activity-list report-dataset-scroll" role="list" tabIndex={0} aria-label="Scrollable generation report activity">
      {rows.map((row) => <article key={row.run_id} className="minimal-activity-row" role="listitem">
        <div>
          <strong>{row.client_name || row.owner_email || 'Client activity'}</strong>
          <span>{row.round_label || 'Round not set'} · {formatDate(row.created_at)}</span>
        </div>
        {scope === 'master' && <small>{row.manager_email || 'No manager'}</small>}
        <em className={`admin-status-badge ${row.output_status || 'unknown'}`}>{statusLabel(row.output_status)}</em>
      </article>)}
    </div> : <div className="admin-monitor-empty">No generation activity matches the current filters.</div>}
  </section>;
}

export default function GenerationReportView({ scope, action, exportHref, filters, activeCount, rows, summary, title, eyebrow, description, errorMessage }: Props) {
  return <main className={`admin-monitor-page native-console ${scope === 'master' ? 'master-ops-console' : 'manager-ops-console'}`}>
    <aside className="admin-monitor-sidebar native-console-sidebar">
      <div className="admin-monitor-brand"><span>xD</span><div><strong>xDisputer</strong><small>{scope === 'master' ? 'Master reports' : 'Manager reports'}</small></div></div>
      <div className="admin-sidebar-section-title">Operations</div>
      <ReportNavigation scope={scope} />{scope === 'manager' && <ManagerWorkspaceSwitch />}
    </aside>

    <section className="admin-monitor-main native-console-main">
      <header className="admin-monitor-header native-command-hero master-compact-hero minimal-report-hero compact-report-hero compact-report-hero-slim">
        <div className="compact-report-hero-copy"><p>{eyebrow}</p><h1>{title}</h1><span>{description}</span></div>
        {!errorMessage && <ReportHeroMetrics summary={summary} />}
      </header>

      <ReportFilters action={action} exportHref={exportHref} filters={filters} activeCount={activeCount} />

      {errorMessage ? <section className="admin-monitor-card"><div className="admin-monitor-empty">Could not load generation report: {errorMessage}</div></section> : <ActivityStream rows={rows} scope={scope} />}
    </section>
  </main>;
}
