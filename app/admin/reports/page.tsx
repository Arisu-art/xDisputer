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
      <table className="admin-monitor-table">
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
              <td>{formatDate(row.created_at)}</td>
              <td>
                <strong>{row.owner_email || row.owner_full_name || 'Unknown client account'}</strong>
                <small>{row.owner_id || 'No owner id'}</small>
              </td>
              <td>{row.client_name || '—'}</td>
              <td>{row.round_label || '—'}</td>
              <td><span className={`admin-status-badge ${row.output_status || 'unknown'}`}>{row.output_status || 'unknown'}</span></td>
            </tr>
          )) : (
            <tr>
              <td colSpan={5} className="admin-monitor-empty">No generation runs found for your assigned clients yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default async function ManagerReportsPage() {
  const { user, profile, supabase } = await requireRole('manager');
  const { rows, summary, errorMessage } = await listGenerationReport(supabase, 'manager', 200);

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
          <form action="/auth/sign-out" method="post">
            <button type="submit">Sign out</button>
          </form>
        </div>
      </aside>

      <section className="admin-monitor-main native-console-main">
        <header className="admin-monitor-header native-command-hero manager-compact-hero">
          <div>
            <p>Manager generation report</p>
            <h1>Assigned client activity.</h1>
            <span>Read-only generation activity for clients assigned to your manager account. This report does not enforce quotas or limits.</span>
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
            </section>

            <section className="admin-monitor-card native-operation-card">
              <div className="admin-monitor-card-header">
                <div><p>Generation runs</p><h2>Recent assigned-client runs</h2></div>
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
