import { listAccessAuditEvents, readableAuditEventType, type AccessAuditEvent } from '../../../lib/saas/access-audit';
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

function formatMetadata(value: AccessAuditEvent['metadata_json']) {
  if (!value || Object.keys(value).length === 0) return '—';
  return JSON.stringify(value);
}

function AuditTable({ events }: { events: AccessAuditEvent[] }) {
  return (
    <div className="admin-monitor-table-wrap">
      <table className="admin-monitor-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Event</th>
            <th>Actor</th>
            <th>Target</th>
            <th>Detail</th>
            <th>Metadata</th>
          </tr>
        </thead>
        <tbody>
          {events.length ? events.map((event) => (
            <tr key={event.id}>
              <td data-label="Time">{formatDate(event.created_at)}</td>
              <td data-label="Event"><strong>{readableAuditEventType(event.event_type)}</strong></td>
              <td data-label="Actor">{event.actor_email || '—'}<small>{event.actor_role || '—'}</small></td>
              <td data-label="Target">{event.target_email || '—'}<small>{event.target_role || '—'}</small></td>
              <td data-label="Detail">{event.event_detail || '—'}</td>
              <td data-label="Metadata">{formatMetadata(event.metadata_json)}</td>
            </tr>
          )) : (
            <tr>
              <td colSpan={6} className="admin-monitor-empty">No audit events recorded yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default async function MasterAuditPage() {
  const { user, profile, supabase } = await requireRole('master');
  const { events, errorMessage } = await listAccessAuditEvents(supabase, 'master', 200);

  return (
    <main className="admin-monitor-page native-console master-ops-console">
      <aside className="admin-monitor-sidebar native-console-sidebar">
        <div className="admin-monitor-brand">
          <span>xD</span>
          <div><strong>xDisputer</strong><small>Master audit</small></div>
        </div>

        <div className="admin-sidebar-section-title">Operations</div>
        <nav aria-label="Master audit navigation">
          <a href="/master">Monitoring</a>
          <a href="/master/accounts">All accounts</a>
          <a href="/master/accounts?view=managers">Managers</a>
          <a href="/master/accounts?view=clients">Clients</a>
          <a href="/master/reports">Reports</a>
          <a className="active" href="/master/audit">Audit log</a>
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
            <p>Master audit log</p>
            <h1>Platform access history.</h1>
            <span>Review all manager/client access changes, promotions, invite joins, approvals, and invite rotations.</span>
          </div>
        </header>

        <section className="admin-monitor-card native-operation-card">
          <div className="admin-monitor-card-header">
            <div>
              <p>Audit events</p>
              <h2>Recent platform access activity</h2>
            </div>
            <span>{events.length} events</span>
          </div>

          {errorMessage ? (
            <div className="admin-monitor-empty">Could not load audit events: {errorMessage}</div>
          ) : (
            <AuditTable events={events} />
          )}
        </section>
      </section>
    </main>
  );
}
