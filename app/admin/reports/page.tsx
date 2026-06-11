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

function ReportFilters({
  filters,
  exportHref,
  activeCount
}: {
  filters: GenerationReportFilters;
  exportHref: string;
  activeCount: number;
}) {
  return (
    <section className="admin-monitor-card native-operation-card report-filter-card">
      <div className="admin-monitor-card-header">
        <div>
          <p>Report filters</p>
          <h2>Refine assigned-client activity</h2>
        </div>
        <span>{activeCount} active</span>
      </div>

      <form action="/admin/reports" method="get" className="report-filter-form">
        <label>
          <span>Start date</span>
          <input name="startDate" type="date" defaultValue={filters.startDate || ''} />
        </label>

        <label>
          <span>End date</span>
          <input name="endDate" type="date" defaultValue={filters.endDate || ''} />
        </label>

        <label>
          <span>Status</span>
          <select name="status" defaultValue={filters.status || ''}>
            <option value="">All statuses</option>
            <option value="generated">Generated</option>
            <option value="downloaded">Downloaded</option>
            <option value="failed">Failed</option>
          </select>
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

        <label className="report-filter-search">
          <span>Search client / round / status</span>
          <input name="query" type="search" placeholder="Client email, name, round, or status" defaultValue={filters.query || ''} />
        </label>

        <div className="report-filter-actions">
          <button type="submit" className="admin-action-button primary">Apply filters</button>
          <a className="admin-action-button" href="/admin/reports">Reset</a>
          <a className="admin-action-button" href={exportHref}>Export CSV</a>
        </div>
      </form>
    </section>
  );
}

function StatGrid({ total, generated, downloaded, failed }: { total: number; generated: number; downloaded: number; failed: number }) {
  return (
    <section className="admin-monitor-stats" aria-label="Generation report summary">
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
              <td data-label="Client name">{row.client_name || '—'}</td>
              <td data-label="Round">{row.round_label || '—'}</td>
              <td data-label="Status"><span className={`admin-status-badge ${row.output_status || 'unknown'}`}>{row.output_status || 'unknown'}</span></td>
            </tr>
          )) : (
            <tr>
              <td colSpan={5} className="admin-monitor-empty">No generation runs match the current filters.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default async function ManagerReportsPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const filters = normalizeGenerationReportFilters(params);
  const activeCount = activeGenerationFilterCount(filters);
  const exportHref = `/admin/reports/export${generationReportQueryString(filters)}`;

  const { user, profile, supabase } = await requireRole('manager');
  const { rows, summary, errorMessage } = await listGenerationReport(supabase, 'manager', 300, filters);

  return (
    <main className="admin-monitor-page native-console manager-ops-console">
      <aside className="admin-monitor-sidebar native-console-sidebar">
        <div className="admin-monitor-brand">
          <span>xD</span>
          <div><strong>xDisputer</strong><small>Manager reports</small></div>
        </div>

        <div className="admin-sidebar-section-title">Operations</div>
        <nav aria-label="Manager reports navigation">
          <a href="/admin">Monitoring</a>
          <a href="/admin?panel=access">Access control</a>
          <a href="/admin?panel=intake">Client intake</a>
          <a className="active" href="/admin/reports">Generation reports</a>
          <a href="/admin/audit">Audit log</a>
        </nav>

        <div className="admin-monitor-account">
          <strong>{profile?.email || user.email || 'Manager account'}</strong>
          <small>Manager account</small>
          <form action="/auth/sign-out" method="post"><button type="submit">Sign out</button></form>
        </div>
      </aside>

      <section className="admin-monitor-main native-console-main">
        <header className="admin-monitor-header native-command-hero manager-compact-hero">
          <div>
            <p>Manager generation report</p>
            <h1>Assigned client activity.</h1>
            <span>Filter, search, and export read-only generation activity for assigned clients. No quota or output limit is enforced.</span>
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
            </section>

            <section className="admin-monitor-card native-operation-card">
              <div className="admin-monitor-card-header">
                <div><p>Generation runs</p><h2>Filtered assigned-client runs</h2></div>
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
