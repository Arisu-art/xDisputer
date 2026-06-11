import {
  activeGenerationFilterCount,
  generationReportQueryString,
  listGenerationReport,
  normalizeGenerationReportFilters,
  type GenerationReportFilters,
  type GenerationReportRow
} from '../../../lib/saas/generation-reports';
import { requireRole } from '../../../lib/saas/session';

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

function ReportFilters({ filters, exportHref, activeCount }: { filters: GenerationReportFilters; exportHref: string; activeCount: number }) {
  return (
    <section className="admin-monitor-card native-operation-card report-filter-card">
      <div className="admin-monitor-card-header">
        <div>
          <p>Report filters</p>
          <h2>Find platform activity</h2>
        </div>
        <span>{activeCount} active</span>
      </div>

      <form action="/master/reports" method="get" className="report-filter-form minimal-report-filter-form">
        <label className="report-filter-search">
          <span>Search</span>
          <input name="query" type="search" placeholder="Client, round, or status" defaultValue={filters.query || ''} />
        </label>

        <label>
          <span>Period</span>
          <select name="period" defaultValue={filters.period || '30d'}>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
            <option value="custom">Custom range</option>
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

        <div className="report-filter-actions">
          <button type="submit" className="admin-action-button primary">Apply</button>
          <a className="admin-action-button" href="/master/reports">Reset</a>
          <a className="admin-action-button" href={exportHref}>Export CSV</a>
        </div>

        <details className="report-advanced-filters">
          <summary>Advanced filters</summary>
          <div>
            <label>
              <span>Start date</span>
              <input name="startDate" type="date" defaultValue={filters.startDate || ''} />
            </label>
            <label>
              <span>End date</span>
              <input name="endDate" type="date" defaultValue={filters.endDate || ''} />
            </label>
            <label>
              <span>Round</span>
              <select name="round" defaultValue={filters.round || ''}>
                <option value="">All rounds</option>
                <option value="1st Round">1st Round</option>
                <option value="2nd Round">2nd Round</option>
                <option value="3rd Round">3rd Round</option>
                <option value="Final">Final</option>
              </select>
            </label>
            <label>
              <span>Manager search</span>
              <input name="managerQuery" type="search" placeholder="Manager email or id" defaultValue={filters.managerQuery || ''} />
            </label>
          </div>
        </details>
      </form>
    </section>
  );
}

function StatGrid({ total, generated, downloaded, failed }: { total: number; generated: number; downloaded: number; failed: number }) {
  return (
    <section className="admin-monitor-stats master-monitoring-stats" aria-label="Platform generation report summary">
      <article><p>Total runs</p><strong>{total}</strong></article>
      <article><p>Generated</p><strong>{generated}</strong></article>
      <article><p>Downloaded</p><strong>{downloaded}</strong></article>
      <article><p>Failed</p><strong>{failed}</strong></article>
    </section>
  );
}

function CountList({ title, items, emptyText }: { title: string; items: Array<{ label: string; count: number }>; emptyText: string }) {
  return (
    <article className="admin-monitor-card native-operation-card">
      <div className="admin-monitor-card-header">
        <div><p>Breakdown</p><h2>{title}</h2></div>
        <span>{items.length} groups</span>
      </div>

      <div className="admin-power-list">
        {items.length ? items.slice(0, 10).map((item) => (
          <span key={item.label}><strong>{item.label}</strong><br />{item.count} run(s)</span>
        )) : (
          <span>{emptyText}</span>
        )}
      </div>
    </article>
  );
}

function RunsTable({ rows }: { rows: GenerationReportRow[] }) {
  return (
    <div className="admin-monitor-table-wrap">
      <table className="admin-monitor-table professional-data-table">
        <thead>
          <tr>
            <th>Created</th>
            <th>Client account</th>
            <th>Manager</th>
            <th>Client name</th>
            <th>Round</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row) => (
            <tr key={row.run_id}>
              <td data-label="Created">{formatDate(row.created_at)}</td>
              <td data-label="Client account">
                <strong>{row.owner_email || row.owner_full_name || 'Unknown client account'}</strong>
                <small>{row.owner_id || 'No owner id'}</small>
              </td>
              <td data-label="Manager">{row.manager_email || row.manager_id || 'Unassigned'}</td>
              <td data-label="Client name">{row.client_name || '—'}</td>
              <td data-label="Round">{row.round_label || '—'}</td>
              <td data-label="Status"><span className={`admin-status-badge ${row.output_status || 'unknown'}`}>{row.output_status || 'unknown'}</span></td>
            </tr>
          )) : (
            <tr>
              <td colSpan={6} className="admin-monitor-empty">No generation runs match the current filters.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default async function MasterReportsPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const filters = normalizeGenerationReportFilters(params);
  const activeCount = activeGenerationFilterCount(filters);
  const exportHref = `/master/reports/export${generationReportQueryString(filters)}`;

  const { user, profile, supabase } = await requireRole('master');
  const { rows, summary, errorMessage } = await listGenerationReport(supabase, 'master', 700, filters);

  return (
    <main className="admin-monitor-page native-console master-ops-console">
      <aside className="admin-monitor-sidebar native-console-sidebar">
        <div className="admin-monitor-brand">
          <span>xD</span>
          <div><strong>xDisputer</strong><small>Master reports</small></div>
        </div>

        <div className="admin-sidebar-section-title">Operations</div>
        <nav aria-label="Master reports navigation">
          <a href="/master">Monitoring</a>
          <a href="/master?panel=access">All accounts</a>
          <a href="/master?panel=managers">Managers</a>
          <a href="/master?panel=clients">Clients</a>
          <a className="active" href="/master/reports">Generation reports</a>
          <a href="/master/audit">Audit log</a>
        </nav>

        <div className="admin-monitor-account">
          <strong>{profile?.email || user.email || 'Master account'}</strong>
          <small>Owner account</small>
          <form action="/auth/sign-out" method="post"><button type="submit">Sign out</button></form>
        </div>
      </aside>

      <section className="admin-monitor-main native-console-main">
        <header className="admin-monitor-header native-command-hero master-compact-hero">
          <div>
            <p>Master generation report</p>
            <h1>Platform usage visibility.</h1>
            <span>Search, filter, and export read-only platform activity. No quota or output limit is enforced.</span>
          </div>
        </header>

        <ReportFilters filters={filters} exportHref={exportHref} activeCount={activeCount} />

        {errorMessage ? (
          <section className="admin-monitor-card">
            <div className="admin-monitor-empty">Could not load generation report: {errorMessage}</div>
          </section>
        ) : (
          <>
            <StatGrid total={summary.total} generated={summary.generated} downloaded={summary.downloaded} failed={summary.failed} />

            <section className="admin-power-grid">
              <CountList title="Runs by round" items={summary.byRound} emptyText="No round activity yet." />
              <CountList title="Runs by client" items={summary.byClient} emptyText="No client activity yet." />
              <CountList title="Runs by status" items={summary.byStatus} emptyText="No status activity yet." />
            </section>

            <section className="admin-monitor-card native-operation-card">
              <div className="admin-monitor-card-header">
                <div><p>Generation runs</p><h2>Filtered platform runs</h2></div>
                <span>{rows.length} runs</span>
              </div>
              <RunsTable rows={rows} />
            </section>
          </>
        )}
      </section>
    </main>
  );
}
