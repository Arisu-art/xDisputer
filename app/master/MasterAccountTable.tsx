import { activateAccount, clearManagerAssignment, demoteToClient, disableAccount, promoteToManager } from './actions';
import type { ManagedAccount } from '../../lib/saas/account-management';

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function HiddenProfileId({ profileId }: { profileId: string }) {
  return <input type="hidden" name="profileId" value={profileId} />;
}

function AccountControls({ account, currentUserId }: { account: ManagedAccount; currentUserId: string }) {
  if (account.role === 'master') return <span className="admin-control-note">Protected owner</span>;

  return (
    <div className="admin-actions-row">
      {account.role === 'client' && (
        <form action={promoteToManager}>
          <HiddenProfileId profileId={account.id} />
          <button type="submit" className="admin-action-button">Make manager</button>
        </form>
      )}

      {account.role === 'manager' && (
        <form action={demoteToClient}>
          <HiddenProfileId profileId={account.id} />
          <button type="submit" className="admin-action-button">Demote</button>
        </form>
      )}

      {account.account_status === 'disabled' ? (
        <form action={activateAccount}>
          <HiddenProfileId profileId={account.id} />
          <button type="submit" className="admin-action-button">Activate</button>
        </form>
      ) : (
        account.id !== currentUserId && (
          <form action={disableAccount}>
            <HiddenProfileId profileId={account.id} />
            <button type="submit" className="admin-action-button">Disable</button>
          </form>
        )
      )}

      {account.role === 'client' && account.manager_id && (
        <form action={clearManagerAssignment}>
          <HiddenProfileId profileId={account.id} />
          <button type="submit" className="admin-action-button">Remove manager</button>
        </form>
      )}
    </div>
  );
}

export default function MasterAccountTable({ accounts, currentUserId, emptyText }: { accounts: ManagedAccount[]; currentUserId: string; emptyText: string }) {
  return (
    <div className="admin-monitor-table-wrap">
      <table className="admin-monitor-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Role</th>
            <th>Status</th>
            <th>Manager</th>
            <th>Updated</th>
            <th>Controls</th>
          </tr>
        </thead>
        <tbody>
          {accounts.length ? accounts.map((item) => (
            <tr key={item.id}>
              <td><strong>{item.full_name || item.email || 'Unnamed user'}</strong><small>{item.email || item.id}</small></td>
              <td><span className={`admin-role-badge ${item.role}`}>{item.role}</span></td>
              <td><span className={`admin-status-badge ${item.account_status || 'active'}`}>{item.account_status || 'active'}</span></td>
              <td><small>{item.manager_id || item.manager_invite_code || '—'}</small></td>
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
