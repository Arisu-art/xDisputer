import ConsoleNavLink from '../../../components/ConsoleNavLink';
import { listMasterGenerationIntegrityEvents } from '../../../lib/saas/integrity-ledger';
import { requireRole } from '../../../lib/saas/session';
import { listMasterSystemEvents } from '../../../lib/saas/system-observability';

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

function statusClass(value: string | null | undefined) {
  if (value === 'error' || value === 'failed') return 'disabled';
  if (value === 'warning') return 'pending_manager_approval';
  return 'active';
}

export default async function MasterSystemPage() {
  const { user, profile, supabase } = await requireRole('master');

  const [{ events, errorMessage: systemError }, { events: integrityEvents, errorMessage: integrityError }] = await Promise.all([
    listMasterSystemEvents(supabase, 60),
    listMasterGenerationIntegrityEvents(supabase, 60)
  ]);

  const errorEvents = events.filter((event) => event.event_status === 'error').length;
  const warningEvents = events.filter((event) => event.event_status === 'warning').length;
  const failedIntegrity = integrityEvents.filter((event) => event.integrity_status === 'failed').length;

  return (
    <main className="admin-monitor-page native-console master-ops-console">
      <aside className="admin-monitor-sidebar native-console-sidebar">
        <div className="admin-monitor-brand">
          <span>xD</span>
          <div><strong>xDisputer</strong><small>System health</small></div>
        </div>

        <div className="admin-sidebar-section-title">Operations</div>
        <nav aria-label="Master system navigation">
          <ConsoleNavLink href="/master">Monitoring</ConsoleNavLink>
          <ConsoleNavLink href="/master/accounts">All accounts</ConsoleNavLink>
          <ConsoleNavLink href="/master/reports">Reports</ConsoleNavLink>
          <ConsoleNavLink href="/master/audit">Audit log</ConsoleNavLink>
          <ConsoleNavLink className="active" href="/master/system">System health</ConsoleNavLink>
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
            <p>System health</p>
            <h1>Operational flight recorder.</h1>
            <span>Review API events, route failures, and generation integrity records without affecting user output.</span>
          </div>
        </header>

        <section className="admin-monitor-stats master-monitoring-stats" aria-label="System health summary">
          <article><p>System events</p><strong>{events.length}</strong></article>
          <article><p>Errors</p><strong>{errorEvents}</strong></article>
          <article><p>Warnings</p><strong>{warningEvents}</strong></article>
          <article><p>Integrity failures</p><strong>{failedIntegrity}</strong></article>
        </section>

        {(systemError || integrityError) && (
          <section className="admin-monitor-card">
            <div className="admin-monitor-empty">{systemError || integrityError}</div>
          </section>
        )}

        <section className="master-access-stack">
          <article className="admin-monitor-card native-operation-card">
            <div className="admin-monitor-card-header">
              <div><p>Observability</p><h2>Recent system events</h2></div>
              <span>{events.length} events</span>
            </div>

            <div className="admin-monitor-table-wrap">
              <table className="admin-monitor-table professional-data-table">
                <thead>
                  <tr>
                    <th>Created</th>
                    <th>Route</th>
                    <th>Event</th>
                    <th>Status</th>
                    <th>Duration</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {events.length ? events.map((event) => (
                    <tr key={event.id}>
                      <td data-label="Created">{formatDate(event.created_at)}</td>
                      <td data-label="Route">{event.route_path}</td>
                      <td data-label="Event">{event.event_type}</td>
                      <td data-label="Status"><span className={`admin-status-badge ${statusClass(event.event_status)}`}>{event.event_status}</span></td>
                      <td data-label="Duration">{typeof event.duration_ms === 'number' ? `${event.duration_ms}ms` : '—'}</td>
                      <td data-label="Message">{event.safe_message || '—'}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="admin-monitor-empty">No system events recorded yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <article className="admin-monitor-card native-operation-card">
            <div className="admin-monitor-card-header">
              <div><p>Integrity</p><h2>Recent generation integrity records</h2></div>
              <span>{integrityEvents.length} records</span>
            </div>

            <div className="admin-monitor-table-wrap">
              <table className="admin-monitor-table professional-data-table">
                <thead>
                  <tr>
                    <th>Created</th>
                    <th>Run</th>
                    <th>Event</th>
                    <th>Status</th>
                    <th>Manifest hash</th>
                    <th>Rules hash</th>
                  </tr>
                </thead>
                <tbody>
                  {integrityEvents.length ? integrityEvents.map((event) => (
                    <tr key={event.id}>
                      <td data-label="Created">{formatDate(event.created_at)}</td>
                      <td data-label="Run">{event.generation_run_id || '—'}</td>
                      <td data-label="Event">{event.event_type}</td>
                      <td data-label="Status"><span className={`admin-status-badge ${statusClass(event.integrity_status)}`}>{event.integrity_status}</span></td>
                      <td data-label="Manifest hash"><small>{event.manifest_hash || '—'}</small></td>
                      <td data-label="Rules hash"><small>{event.rules_hash || '—'}</small></td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="admin-monitor-empty">No generation integrity records yet.</td>
                    </tr>
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
