import { activateAccount, clearManagerAssignment, demoteToClient, disableAccount, promoteToManager } from './actions';
import type { ManagedAccount } from '../../lib/saas/account-management';

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function AccountActionButton({ profileId, action, label }: { profileId: string; action: (formData: FormData) => Promise<void>; label: string }) {
  return (
    <form action={action}>
      <input type="hidden" name="profileId" value={profileId} />
      <button type="submit" className="admin-action-button">{label}</button>
    </form>
  );
}

function AccountControls({ account, currentUserId }: { account: ManagedAccount; currentUserId: string }) {
  if (account.role === 'master') return <span className="admin-control-note">Protected owner</span>;

  return (
    <div className="admin-actions-row">
      {account.role === 'client' && <AccountActionButton profileId={account.id} action={promoteToManager} label="Make manager" />}
      {account.role === 'manager' && <AccountActionButton profileId={account.id} action={demoteToClient} label="Demote" />}
      {account.account_status === 'disabled' ? (
        <AccountActionButton profileId={account.id} action={activateAccount} label="Activate" />
      ) : (
        account.id !== currentUserId && <AccountActionButton profileId={account.id} action={disableAccount} label="Disable" />
      )}
      {account.role === 'client' && account.manager_id && <AccountActionButton profileId={account.id} action={clearManagerAssignment} label="Remove manager" />}
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
