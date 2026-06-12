import type { ManagedAccount } from '../../lib/saas/account-management';
import type { EntitlementLimitMap, EntitlementLimitRow } from '../../lib/saas/entitlement-limits';

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function statusText(value: string | null | undefined) {
  if (value === 'pending_manager_assignment') return 'Waiting';
  if (value === 'pending_manager_approval') return 'Pending';
  if (value === 'active') return 'Active';
  if (value === 'suspended') return 'Suspended';
  if (value === 'disabled') return 'Disabled';
  return value || 'Pending';
}

function formatLimit(value: number | null | undefined) {
  return typeof value === 'number' ? String(value) : 'Unlimited';
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
      <button type="submit" className="admin-action-button">Rotate</button>
    </form>
  );
}

function RelationshipBadge({ account }: { account: ManagedAccount }) {
  if (account.role === 'manager' || account.role === 'admin') return <span className="admin-relation-badge ready">Manager</span>;
  if (account.role === 'client' && account.manager_id) return <span className="admin-relation-badge linked">Linked</span>;
  if (account.role === 'client') return <span className="admin-relation-badge open">Unassigned</span>;
  return <span className="admin-relation-badge owner">Owner</span>;
}

function LimitEditor({ account, entitlement }: { account: ManagedAccount; entitlement?: EntitlementLimitRow }) {
  const isManager = account.role === 'manager' || account.role === 'admin';
  const isClient = account.role === 'client';

  if (!isManager && !isClient) return <span className="admin-control-note">—</span>;

  if (isManager) {
    return <form action="/api/master/entitlements" method="post" className="limit-editor-form">
      <input type="hidden" name="mode" value="manager" />
      <input type="hidden" name="profileId" value={account.id} />
      <div className="limit-meter"><strong>{entitlement?.current_clients || 0}/{formatLimit(entitlement?.max_clients)}</strong><small>clients</small></div>
      <label><span>Client limit</span><input name="maxClients" type="number" min="0" defaultValue={entitlement?.max_clients ?? ''} placeholder="Unlimited" /></label>
      <label><span>Default outputs</span><input name="defaultClientOutputLimit" type="number" min="0" defaultValue={entitlement?.default_client_output_limit ?? ''} placeholder="Unlimited" /></label>
      <input name="notes" type="text" defaultValue={entitlement?.entitlement_notes || ''} placeholder="Agreement note" />
      <button type="submit" className="admin-action-button primary">Save</button>
    </form>;
  }

  return <form action="/api/master/entitlements" method="post" className="limit-editor-form compact-limit-editor">
    <input type="hidden" name="mode" value="client" />
    <input type="hidden" name="profileId" value={account.id} />
    <div className="limit-meter"><strong>{entitlement?.output_used_this_month || 0}/{formatLimit(entitlement?.effective_output_limit)}</strong><small>outputs this month</small></div>
    <label><span>Output limit</span><input name="outputLimit" type="number" min="0" defaultValue={entitlement?.client_output_limit ?? ''} placeholder="Use manager default" /></label>
    <input name="notes" type="text" defaultValue={entitlement?.entitlement_notes || ''} placeholder="Agreement note" />
    <button type="submit" className="admin-action-button primary">Save</button>
  </form>;
}

function AccountControls({ account, currentUserId }: { account: ManagedAccount; currentUserId: string }) {
  if (account.role === 'master') return <span className="admin-control-note">Protected</span>;
  if (account.id === currentUserId) return <span className="admin-control-note">Current</span>;

  const isManager = account.role === 'manager' || account.role === 'admin';
  const isClient = account.role === 'client';
  const isBlocked = account.account_status === 'disabled' || account.account_status === 'suspended';

  return (
    <div className="admin-actions-row compact-actions">
      {isClient && (
        <ControlForm profileId={account.id} intent="make_manager" label="Promote" primary />
      )}

      {isManager && (
        <>
          <ControlForm profileId={account.id} intent="demote_client" label="Demote" />
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
        <ControlForm profileId={account.id} intent="clear_manager" label="Unlink" />
      )}
    </div>
  );
}

export default function MasterAccountTable({
  accounts,
  currentUserId,
  emptyText,
  entitlements = {}
}: {
  accounts: ManagedAccount[];
  currentUserId: string;
  emptyText: string;
  entitlements?: EntitlementLimitMap;
}) {
  return (
    <div className="admin-monitor-table-wrap">
      <table className="admin-monitor-table professional-data-table entitlement-table">
        <thead>
          <tr>
            <th>Account</th>
            <th>Role</th>
            <th>Status</th>
            <th>Link</th>
            <th>Limits</th>
            <th>Invite</th>
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
              <td data-label="Link"><RelationshipBadge account={item} /></td>
              <td data-label="Limits"><LimitEditor account={item} entitlement={entitlements[item.id]} /></td>
              <td data-label="Invite">{item.role === 'manager' || item.role === 'admin' ? item.manager_invite_code || 'Not created' : '—'}</td>
              <td data-label="Updated">{formatDate(item.updated_at)}</td>
              <td data-label="Controls"><AccountControls account={item} currentUserId={currentUserId} /></td>
            </tr>
          )) : (
            <tr>
              <td colSpan={8} className="admin-monitor-empty">{emptyText}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
