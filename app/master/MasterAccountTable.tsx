import type { ManagedAccount } from '../../lib/saas/account-management';

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function statusText(value: string | null | undefined) {
  if (value === 'pending_manager_assignment') return 'Waiting for invite';
  if (value === 'pending_manager_approval') return 'Pending manager approval';
  if (value === 'active') return 'Active';
  if (value === 'suspended') return 'Suspended';
  if (value === 'disabled') return 'Disabled';
  return value || 'Pending';
}

function ControlForm({
  profileId,
  intent,
  label,
  primary = false
}: {
  profileId: string;
  intent: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <form action="/api/control/profile" method="post">
      <input type="hidden" name="profileId" value={profileId} />
      <input type="hidden" name="intent" value={intent} />
      <button type="submit" className={`admin-action-button ${primary ? 'primary' : ''}`}>{label}</button>
    </form>
  );
}

function RotateInviteForm({ managerId }: { managerId: string }) {
  return (
    <form action="/api/master/rotate-invite" method="post">
      <input type="hidden" name="managerId" value={managerId} />
      <button type="submit" className="admin-action-button">Rotate invite</button>
    </form>
  );
}

function RelationshipBadge({ account }: { account: ManagedAccount }) {
  if (account.role === 'manager') return <span className="admin-relation-badge ready">Manager access</span>;
  if (account.role === 'client' && account.manager_id) return <span className="admin-relation-badge linked">Manager linked</span>;
  if (account.role === 'client') return <span className="admin-relation-badge open">Unassigned</span>;
  return <span className="admin-relation-badge owner">Owner</span>;
}

function AccountControls({ account, currentUserId }: { account: ManagedAccount; currentUserId: string }) {
  if (account.role === 'master') return <span className="admin-control-note">Protected owner</span>;
  if (account.id === currentUserId) return <span className="admin-control-note">Current account</span>;

  const isManager = account.role === 'manager' || account.role === 'admin';
  const isClient = account.role === 'client';
  const isBlocked = account.account_status === 'disabled' || account.account_status === 'suspended';

  return (
    <div className="admin-actions-row">
      {isClient && (
        <ControlForm profileId={account.id} intent="make_manager" label="Promote manager" primary />
      )}

      {isManager && (
        <>
          <ControlForm profileId={account.id} intent="demote_client" label="Demote client" />
          <RotateInviteForm managerId={account.id} />
        </>
      )}

      {isBlocked ? (
        <ControlForm profileId={account.id} intent="reactivate" label="Reactivate" primary />
      ) : (
        <>
          <ControlForm profileId={account.id} intent="suspend" label="Suspend" />
          <ControlForm profileId={account.id} intent="disable" label="Disable" />
        </>
      )}

      {isClient && account.manager_id && (
        <ControlForm profileId={account.id} intent="clear_manager" label="Remove manager" />
      )}
    </div>
  );
}

export default function MasterAccountTable({
  accounts,
  currentUserId,
  emptyText
}: {
  accounts: ManagedAccount[];
  currentUserId: string;
  emptyText: string;
}) {
  return (
    <div className="admin-monitor-table-wrap">
      <table className="admin-monitor-table">
        <thead>
          <tr>
            <th>Account</th>
            <th>Role</th>
            <th>Status</th>
            <th>Relationship</th>
            <th>Invite code</th>
            <th>Updated</th>
            <th>Controls</th>
          </tr>
        </thead>
        <tbody>
          {accounts.length ? accounts.map((item) => (
            <tr key={item.id}>
              <td data-label="Account">
                <strong>{item.full_name || item.email || 'Unnamed user'}</strong>
                <small>{item.email || 'Protected account'}</small>
              </td>
              <td data-label="Role">
                <span className={`admin-role-badge ${item.role}`}>
                  {item.role === 'admin' ? 'manager' : item.role}
                </span>
              </td>
              <td data-label="Status">
                <span className={`admin-status-badge ${item.account_status || 'pending'}`}>
                  {statusText(item.account_status)}
                </span>
              </td>
              <td data-label="Relationship"><RelationshipBadge account={item} /></td>
              <td data-label="Invite code">{item.role === 'manager' || item.role === 'admin' ? item.manager_invite_code || 'Not created yet' : '—'}</td>
              <td data-label="Updated">{formatDate(item.updated_at)}</td>
              <td data-label="Controls"><AccountControls account={item} currentUserId={currentUserId} /></td>
            </tr>
          )) : (
            <tr>
              <td colSpan={7} className="admin-monitor-empty">{emptyText}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
