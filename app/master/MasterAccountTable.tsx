import type { ManagedAccount } from '../../lib/saas/account-management';

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
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

function RelationshipBadge({ account }: { account: ManagedAccount }) {
  if (account.role === 'manager') return <span className="admin-relation-badge ready">Invite enabled</span>;
  if (account.role === 'client' && account.manager_id) return <span className="admin-relation-badge linked">Manager linked</span>;
  if (account.role === 'client') return <span className="admin-relation-badge open">Unassigned</span>;
  return <span className="admin-relation-badge owner">Owner</span>;
}

function AccountControls({ account, currentUserId }: { account: ManagedAccount; currentUserId: string }) {
  if (account.role === 'master') return <span className="admin-control-note">Protected owner</span>;

  return (
    <div className="admin-actions-row">
      {account.role === 'client' && <ControlForm profileId={account.id} intent="make_manager" label="Make manager" />}
      {account.role === 'manager' && <ControlForm profileId={account.id} intent="demote_client" label="Demote" />}
      {account.account_status === 'disabled' ? (
        <ControlForm profileId={account.id} intent="activate" label="Activate" />
      ) : (
        account.id !== currentUserId && <ControlForm profileId={account.id} intent="disable" label="Disable" />
      )}
      {account.role === 'client' && account.manager_id && <ControlForm profileId={account.id} intent="clear_manager" label="Remove manager" />}
    </div>
  );
}

export default function MasterAccountTable({ accounts, currentUserId, emptyText }: { accounts: ManagedAccount[]; currentUserId: string; emptyText: string }) {
  return (
    <div className="admin-monitor-table-wrap">
      <table className="admin-monitor-table">
        <thead>
          <tr>
            <th>Account</th>
            <th>Role</th>
            <th>Status</th>
            <th>Relationship</th>
            <th>Updated</th>
            <th>Controls</th>
          </tr>
        </thead>
        <tbody>
          {accounts.length ? accounts.map((item) => (
            <tr key={item.id}>
              <td><strong>{item.full_name || item.email || 'Unnamed user'}</strong><small>{item.email || 'Protected account'}</small></td>
              <td><span className={`admin-role-badge ${item.role}`}>{item.role === 'admin' ? 'manager' : item.role}</span></td>
              <td><span className={`admin-status-badge ${item.account_status || 'active'}`}>{item.account_status || 'active'}</span></td>
              <td><RelationshipBadge account={item} /></td>
              <td>{formatDate(item.updated_at)}</td>
              <td><AccountControls account={item} currentUserId={currentUserId} /></td>
            </tr>
          )) : (
            <tr><td colSpan={6} className="admin-monitor-empty">{emptyText}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
