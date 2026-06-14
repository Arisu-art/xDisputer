import ConsoleNavLink from './ConsoleNavLink';
import ManagerWorkspaceSwitch from './ManagerWorkspaceSwitch';
import { readableAuditEventType, type AccessAuditEvent } from '../lib/saas/access-audit';

type Scope = 'master' | 'manager';

type Props = {
  scope: Scope;
  events: AccessAuditEvent[];
  errorMessage?: string | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
}

function eventCount(events: AccessAuditEvent[], pattern: RegExp) { return events.filter((event) => pattern.test(event.event_type)).length; }

function nav(scope: Scope) {
  if (scope === 'master') return <nav aria-label="Master audit navigation"><ConsoleNavLink href="/master">Monitoring</ConsoleNavLink><ConsoleNavLink href="/master/accounts">Accounts</ConsoleNavLink><ConsoleNavLink href="/master/reports">Reports</ConsoleNavLink><ConsoleNavLink className="active" href="/master/audit">Audit</ConsoleNavLink><ConsoleNavLink href="/master/system">System</ConsoleNavLink></nav>;
  return <nav aria-label="Manager audit navigation"><ConsoleNavLink href="/admin">Monitoring</ConsoleNavLink><ConsoleNavLink href="/admin/access">Access</ConsoleNavLink><ConsoleNavLink href="/admin?panel=intake">Intake</ConsoleNavLink><ConsoleNavLink href="/admin/reports">Reports</ConsoleNavLink><ConsoleNavLink className="active" href="/admin/audit">Audit</ConsoleNavLink></nav>;
}

export default function AccessAuditView({ scope, events, errorMessage }: Props) {
  const latest = events[0];
  const visibleEvents = events.slice(0, 24);
  const approvals = eventCount(events, /approve|approval|reactivate|activate/i);
  const restrictions = eventCount(events, /reject|disable|suspend|block/i);

  return <main className={`admin-monitor-page native-console ${scope === 'master' ? 'master-ops-console' : 'manager-ops-console'}`}>
    <aside className="admin-monitor-sidebar native-console-sidebar">
      <div className="admin-monitor-brand"><span>xD</span><div><strong>xDisputer</strong><small>{scope === 'master' ? 'Master audit' : 'Manager audit'}</small></div></div>
      <div className="admin-sidebar-section-title">Operations</div>
      {nav(scope)}
      {scope === 'manager' && <ManagerWorkspaceSwitch />}
    </aside>
    <section className="admin-monitor-main native-console-main"><header className="admin-monitor-header native-command-hero minimal-report-hero"><div><p>{scope === 'master' ? 'Master audit' : 'Manager audit'}</p><h1>Access activity.</h1><span>Minimal access history focused on who changed access, who was affected, and what happened.</span></div></header>{errorMessage ? <section className="admin-monitor-card"><div className="admin-monitor-empty">Could not load audit events: {errorMessage}</div></section> : <><section className="minimal-report-summary" aria-label="Access audit summary"><article><span>Events</span><strong>{events.length}</strong><small>Recent access changes</small></article><article><span>Approvals</span><strong>{approvals}</strong><small>Granted or restored</small></article><article className={restrictions ? 'attention' : 'complete'}><span>Restrictions</span><strong>{restrictions}</strong><small>{restrictions ? 'Review context' : 'None recent'}</small></article><article><span>Latest</span><strong>{latest ? formatDate(latest.created_at) : '—'}</strong><small>Most recent event</small></article></section><section className="admin-monitor-card native-operation-card minimal-activity-card"><div className="admin-monitor-card-header compact-card-header"><div><p>Audit stream</p><h2>Recent access events</h2></div><span>{events.length} events</span></div>{visibleEvents.length ? <div className="minimal-activity-list audit-event-list" role="list">{visibleEvents.map((event) => <article key={event.id} className="minimal-activity-row audit-event-row" role="listitem"><div><strong>{readableAuditEventType(event.event_type)}</strong><span>{event.event_detail || 'Access event'} · {formatDate(event.created_at)}</span></div><small>{event.actor_email || 'System'} → {event.target_email || 'Workspace'}</small><em className="admin-status-badge active">{event.target_role || event.actor_role || 'event'}</em></article>)}</div> : <div className="admin-monitor-empty">No access audit events are available yet.</div>}</section></>}</section>
  </main>;
}
