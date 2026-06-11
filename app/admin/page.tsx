import { ensureManagerInviteCode, listManagedAccounts } from '../../lib/saas/account-management';
import { requireRole } from '../../lib/saas/session';

type ManagerPanel = 'overview' | 'invite' | 'clients' | 'health' | 'review' | 'handoff';

type PageProps = {
  searchParams?: Promise<{
    panel?: string | string[];
    control?: string | string[];
    message?: string | string[];
  }>;
};

function normalizePanel(value: string | string[] | undefined): ManagerPanel {
  const panel = Array.isArray(value) ? value[0] : value;
  if (panel === 'invite' || panel === 'clients' || panel === 'health' || panel === 'review' || panel === 'handoff') return panel;
  return 'overview';
}

function stringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function ManagerSidebarLink({ panel, activePanel, children }: { panel: ManagerPanel; activePanel: ManagerPanel; children: string }) {
  return <a className={activePanel === panel ? 'active' : ''} href={`/admin?panel=${panel}`}>{children}</a>;
}

function ControlForm({ profileId, intent, label }: { profileId: string; intent: string; label: string }) {
  return (
    <form action="/api/control/profile" method="post">
      <input type="hidden" name="profileId" value={profileId} />
      <input type="hidden" name="intent" value={intent} />
      <button type="submit" className="admin-action-button">{label}</button>
    </form>
  );
}

export default async function AdminPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const activePanel = normalizePanel(params.panel);
  const controlStatus = stringParam(params.control);
  const controlMessage = stringParam(params.message);
  const { user, profile, supabase } = await requireRole('manager');
  const inviteCode = await ensureManagerInviteCode(supabase, user.id);
  const { accounts: profiles, errorMessage: queryError } = await listManagedAccounts(supabase, 'manager', user.id);

  const totalClients = profiles.length;
  const activeClients = profiles.filter((item) => (item.account_status || 'active') === 'active').length;
  const disabledClients = profiles.filter((item) => item.account_status === 'disabled').length;
  const needsReview = activeClients;
  const needsAction = disabledClients;

  return (
    <main className="admin-monitor-page native-console">
      <aside className="admin-monitor-sidebar native-console-sidebar">
        <div className="admin-monitor-brand">
          <span>xD</span>
          <div><strong>xDisputer</strong><small>Manager console</small></div>
        </div>

        <div className="admin-sidebar-section-title">Workflow</div>
        <nav aria-label="Manager navigation">
          <ManagerSidebarLink panel="overview" activePanel={activePanel}>Dashboard</ManagerSidebarLink>
          <ManagerSidebarLink panel="invite" activePanel={activePanel}>Invite command</ManagerSidebarLink>
          <ManagerSidebarLink panel="clients" activePanel={activePanel}>My clients</ManagerSidebarLink>
          <ManagerSidebarLink panel="health" activePanel={activePanel}>Health summary</ManagerSidebarLink>
          <ManagerSidebarLink panel="review" activePanel={activePanel}>Review queue</ManagerSidebarLink>
          <ManagerSidebarLink panel="handoff" activePanel={activePanel}>Handoff checklist</ManagerSidebarLink>
        </nav>

        <div className="admin-monitor-account">
          <strong>{profile?.email || user.email || 'Manager account'}</strong>
          <small>Manager account</small>
          <form action="/auth/sign-out" method="post"><button type="submit">Sign out</button></form>
        </div>
      </aside>

      <section className="admin-monitor-main native-console-main">
        <header className="admin-monitor-header native-command-hero">
          <div>
            <p>Manager operations</p>
            <h1>Monitor assigned clients.</h1>
            <span>Invite clients, review readiness, and control access without exposing backend records.</span>
          </div>
        </header>

        {controlStatus && (
          <section className={`admin-monitor-card admin-feedback-card ${controlStatus === 'ok' ? 'success' : 'error'}`}>
            <strong>{controlStatus === 'ok' ? 'Action completed' : 'Action failed'}</strong>
            <span>{controlStatus === 'ok' ? 'The console has refreshed with the latest account state.' : controlMessage || 'Unknown error.'}</span>
          </section>
        )}

        {queryError ? (
          <section className="admin-monitor-card"><div className="admin-monitor-empty">Could not load assigned client records: {queryError}</div></section>
        ) : (
          <>
            {activePanel === 'overview' && (
              <>
                <section className="admin-monitor-stats" aria-label="Client statistics">
                  <article><p>My clients</p><strong>{totalClients}</strong></article>
                  <article><p>Active</p><strong>{activeClients}</strong></article>
                  <article><p>Disabled</p><strong>{disabledClients}</strong></article>
                  <article><p>Needs review</p><strong>{needsReview}</strong></article>
                </section>
                <section className="admin-power-grid">
                  <article className="admin-monitor-card native-operation-card"><div className="admin-monitor-card-header"><div><p>Manager-only</p><h2>Review queue</h2></div></div><div className="admin-power-list"><span>{needsReview} active clients ready for operational review.</span><span>Use this to decide who needs support before generating documents.</span></div><div className="admin-power-links"><a href="/admin?panel=review">Open review queue</a></div></article>
                  <article className="admin-monitor-card native-operation-card"><div className="admin-monitor-card-header"><div><p>Manager-only</p><h2>Handoff checklist</h2></div></div><div className="admin-power-list"><span>Invite, connect, review, then monitor access.</span><span>Designed for manager-client operations only.</span></div><div className="admin-power-links"><a href="/admin?panel=handoff">Open checklist</a></div></article>
                </section>
              </>
            )}

            {activePanel === 'invite' && (
              <section className="admin-monitor-card native-operation-card">
                <div className="admin-monitor-card-header"><div><p>Invite command</p><h2>Client invite code</h2></div><span>Manager only</span></div>
                <div className="invite-code-card"><strong>{inviteCode}</strong><span>Share this code with a client. They join from their workspace manager dock.</span></div>
                <form action="/api/control/invite" method="post" className="admin-inline-form"><button type="submit" className="admin-action-button primary">Rotate invite code</button></form>
              </section>
            )}

            {activePanel === 'clients' && (
              <section className="admin-monitor-card">
                <div className="admin-monitor-card-header"><div><p>Client control</p><h2>Assigned client accounts</h2></div><span>{totalClients} clients</span></div>
                <div className="admin-monitor-table-wrap"><table className="admin-monitor-table"><thead><tr><th>Client</th><th>Status</th><th>Joined</th><th>Updated</th><th>Controls</th></tr></thead><tbody>{profiles.length ? profiles.map((item) => (<tr key={item.id}><td><strong>{item.full_name || item.email || 'Unnamed client'}</strong><small>{item.email || 'Client account'}</small></td><td><span className={`admin-status-badge ${item.account_status || 'active'}`}>{item.account_status || 'active'}</span></td><td>{formatDate(item.created_at)}</td><td>{formatDate(item.updated_at)}</td><td><div className="admin-actions-row">{item.account_status === 'disabled' ? <ControlForm profileId={item.id} intent="activate" label="Activate" /> : <ControlForm profileId={item.id} intent="disable" label="Disable" />}</div></td></tr>)) : (<tr><td colSpan={5} className="admin-monitor-empty">No clients assigned yet. Share your invite code with a client.</td></tr>)}</tbody></table></div>
              </section>
            )}

            {activePanel === 'health' && (
              <section className="admin-power-grid"><article className="admin-monitor-card"><div className="admin-monitor-card-header"><div><p>Health summary</p><h2>Client status map</h2></div></div><div className="admin-power-list"><span>Active clients: {activeClients}</span><span>Disabled clients: {disabledClients}</span><span>Needs action: {needsAction}</span></div></article><article className="admin-monitor-card"><div className="admin-monitor-card-header"><div><p>Access rule</p><h2>Manager authority</h2></div></div><div className="admin-power-list"><span>You can only control clients assigned to your manager account.</span><span>Master controls global roles. Client controls only the workspace.</span></div></article></section>
            )}

            {activePanel === 'review' && (
              <section className="admin-monitor-card native-operation-card"><div className="admin-monitor-card-header"><div><p>Manager-only feature</p><h2>Review queue</h2></div><span>{needsReview} ready</span></div><div className="admin-power-list"><span>1. Check client access status.</span><span>2. Confirm client is connected to your manager account.</span><span>3. Review document readiness before generation.</span><span>4. Disable access only when workflow risk requires blocking.</span></div></section>
            )}

            {activePanel === 'handoff' && (
              <section className="admin-monitor-card native-operation-card"><div className="admin-monitor-card-header"><div><p>Manager-only feature</p><h2>Client handoff checklist</h2></div></div><div className="admin-power-list"><span>Share invite code with client.</span><span>Client joins from workspace manager dock.</span><span>Verify client appears in My clients.</span><span>Review health summary before starting document support.</span></div></section>
            )}
          </>
        )}
      </section>
    </main>
  );
}
