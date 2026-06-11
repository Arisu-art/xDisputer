import { listGenerationReport, type GenerationReportRow } from '../../../lib/saas/generation-reports';
import { requireRole } from '../../../lib/saas/session';

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

function StatGrid({
  total,
  generated,
  downloaded,
  failed
}: {
  total: number;
  generated: number;
  downloaded: number;
  failed: number;
}) {
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
      <table className="admin-monitor-table">
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
              <td colSpan={6} className="admin-monitor-empty">No generation runs found yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default async function MasterReportsPage() {
  const { user, profile, supabase } = await requireRole('master');
  const { rows, summary, errorMessage } = await listGenerationReport(supabase, 'master', 500);

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
          <form action="/auth/sign-out" method="post">
            <button type="submit">Sign out</button>
          </form>
        </div>
      </aside>

      <section className="admin-monitor-main native-console-main">
        <header className="admin-monitor-header native-command-hero master-compact-hero">
          <div>
            <p>Master generation report</p>
            <h1>Platform usage visibility.</h1>
            <span>Read-only platform-wide generation activity. This report does not enforce quotas or output limits.</span>
          </div>
        </header>

        {errorMessage ? (
          <section className="admin-monitor-card">
            <div className="admin-monitor-empty">Could not load generation report: {errorMessage}</div>
          </section>
        ) : (
          <>
            <StatGrid
              total={summary.total}
              generated={summary.generated}
              downloaded={summary.downloaded}
              failed={summary.failed}
            />

            <section className="admin-power-grid">
              <CountList title="Runs by round" items={summary.byRound} emptyText="No round activity yet." />
              <CountList title="Runs by client" items={summary.byClient} emptyText="No client activity yet." />
              <CountList title="Runs by status" items={summary.byStatus} emptyText="No status activity yet." />
            </section>

            <section className="admin-monitor-card native-operation-card">
              <div className="admin-monitor-card-header">
                <div><p>Generation runs</p><h2>Recent platform runs</h2></div>
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
