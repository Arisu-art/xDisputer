import ConsoleNavLink from '../../../components/ConsoleNavLink';
import { requireRole } from '../../../lib/saas/session';
import { listMasterGenerationErrorEvents, listMasterGenerationRunSnapshots } from '../../../lib/saas/generation-snapshots';

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

function shortHash(value: string | null | undefined) {
  return value ? value.slice(0, 12) : '—';
}

function statusClass(value: string | null | undefined) {
  if (value === 'error' || value === 'failed' || value === 'open') return 'disabled';
  if (value === 'warning') return 'pending_manager_approval';
  return 'active';
}

export default async function MasterRecoveryPage() {
  const { user, profile, supabase } = await requireRole('master');

  const [snapshotResult, errorResult] = await Promise.all([
    listMasterGenerationRunSnapshots(supabase, 80),
    listMasterGenerationErrorEvents(supabase, 80)
  ]);

  return (
    <main className="admin-monitor-page native-console master-ops-console">
      <aside className="admin-monitor-sidebar native-console-sidebar">
        <div className="admin-monitor-brand">
          <span>xD</span>
          <div><strong>xDisputer</strong><small>Recovery ledger</small></div>
        </div>

        <div className="admin-sidebar-section-title">Operations</div>
        <nav aria-label="Master recovery navigation">
          <ConsoleNavLink href="/master">Monitoring</ConsoleNavLink>
          <ConsoleNavLink href="/master/accounts">All accounts</ConsoleNavLink>
          <ConsoleNavLink href="/master/reports">Reports</ConsoleNavLink>
          <ConsoleNavLink href="/master/audit">Audit log</ConsoleNavLink>
          <ConsoleNavLink href="/master/system">System health</ConsoleNavLink>
          <ConsoleNavLink className="active" href="/master/recovery">Recovery ledger</ConsoleNavLink>
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
            <p>Recovery</p>
            <h1>Generation snapshot and error ledger.</h1>
            <span>Inspect non-blocking run snapshots, hashes, and recovery events without changing generated document output.</span>
          </div>
        </header>

        <section className="admin-monitor-stats master-monitoring-stats" aria-label="Recovery summary">
          <article><p>Snapshots</p><strong>{snapshotResult.snapshots.length}</strong></article>
          <article><p>Errors</p><strong>{errorResult.events.length}</strong></article>
          <article><p>Open recovery</p><strong>{errorResult.events.filter((event) => event.recovery_status === 'open').length}</strong></article>
          <article><p>Failed snapshots</p><strong>{snapshotResult.snapshots.filter((snapshot) => snapshot.integrity_status === 'failed').length}</strong></article>
        </section>

        {(snapshotResult.errorMessage || errorResult.errorMessage) && (
          <section className="admin-monitor-card">
            <div className="admin-monitor-empty">{snapshotResult.errorMessage || errorResult.errorMessage}</div>
          </section>
        )}

        <section className="master-access-stack">
          <article className="admin-monitor-card native-operation-card">
            <div className="admin-monitor-card-header">
              <div><p>Snapshots</p><h2>Recent generation snapshots</h2></div>
              <span>{snapshotResult.snapshots.length} records</span>
            </div>

            <div className="admin-monitor-table-wrap">
              <table className="admin-monitor-table professional-data-table">
                <thead>
                  <tr>
                    <th>Created</th>
                    <th>Run</th>
                    <th>Status</th>
                    <th>Source</th>
                    <th>Template</th>
                    <th>Output</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshotResult.snapshots.length ? snapshotResult.snapshots.map((snapshot) => (
                    <tr key={snapshot.id}>
                      <td data-label="Created">{formatDate(snapshot.created_at)}</td>
                      <td data-label="Run"><small>{snapshot.generation_run_id}</small></td>
                      <td data-label="Status"><span className={`admin-status-badge ${statusClass(snapshot.integrity_status)}`}>{snapshot.integrity_status}</span></td>
                      <td data-label="Source"><small>{shortHash(snapshot.source_hash)}</small></td>
                      <td data-label="Template"><small>{shortHash(snapshot.template_hash)}</small></td>
                      <td data-label="Output"><small>{shortHash(snapshot.output_hash)}</small></td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6} className="admin-monitor-empty">No generation snapshots recorded yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <article className="admin-monitor-card native-operation-card">
            <div className="admin-monitor-card-header">
              <div><p>Errors</p><h2>Generation recovery events</h2></div>
              <span>{errorResult.events.length} events</span>
            </div>

            <div className="admin-monitor-table-wrap">
              <table className="admin-monitor-table professional-data-table">
                <thead>
                  <tr>
                    <th>Created</th>
                    <th>Route</th>
                    <th>Run</th>
                    <th>Recovery</th>
                    <th>Stack</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {errorResult.events.length ? errorResult.events.map((event) => (
                    <tr key={event.id}>
                      <td data-label="Created">{formatDate(event.created_at)}</td>
                      <td data-label="Route">{event.route_path}</td>
                      <td data-label="Run"><small>{event.generation_run_id || '—'}</small></td>
                      <td data-label="Recovery"><span className={`admin-status-badge ${statusClass(event.recovery_status)}`}>{event.recovery_status}</span></td>
                      <td data-label="Stack"><small>{shortHash(event.stack_hash)}</small></td>
                      <td data-label="Message">{event.safe_message || '—'}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6} className="admin-monitor-empty">No generation errors recorded yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
