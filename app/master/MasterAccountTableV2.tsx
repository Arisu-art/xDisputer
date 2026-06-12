import TableFlyout from '../../components/TableFlyout';
import type { ManagedAccount } from '../../lib/saas/account-management';
import type { EntitlementLimitMap, EntitlementLimitRow } from '../../lib/saas/entitlement-limits';

function dateText(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function statusText(value?: string | null) {
  if (value === 'pending_manager_assignment') return 'Waiting';
  if (value === 'pending_manager_approval') return 'Pending';
  if (value === 'active') return 'Active';
  if (value === 'suspended') return 'Suspended';
  if (value === 'disabled') return 'Disabled';
  return value || 'Pending';
}

function numberText(value?: number | null) { return typeof value === 'number' ? String(value) : 'Default'; }
function isManager(account: ManagedAccount) { return account.role === 'manager' || account.role === 'admin'; }
function dayUsed(limit?: EntitlementLimitRow) { return limit?.output_used_today ?? 0; }
function agreementSummary(account: ManagedAccount, limit?: EntitlementLimitRow) {
  if (isManager(account)) return `${limit?.current_clients || 0}/${numberText(limit?.max_clients)} clients`;
  if (account.role === 'client') return `${dayUsed(limit)}/${numberText(limit?.effective_output_limit)} outputs today`;
  return 'Protected';
}
function canEditLimits(account: ManagedAccount) { return isManager(account) || account.role === 'client'; }

function ControlForm({ profileId, intent, label, primary = false }: { profileId: string; intent: string; label: string; primary?: boolean }) {
  return <form action="/api/control/profile" method="post"><input type="hidden" name="profileId" value={profileId} /><input type="hidden" name="intent" value={intent} /><button type="submit" className={`admin-action-button ${primary ? 'primary' : ''}`}>{label}</button></form>;
}

function RotateInvite({ managerId }: { managerId: string }) {
  return <form action="/api/master/rotate-invite" method="post"><input type="hidden" name="managerId" value={managerId} /><button type="submit" className="admin-action-button">Rotate invite</button></form>;
}

function LinkBadge({ account }: { account: ManagedAccount }) {
  if (isManager(account)) return <span className="admin-relation-badge ready">Manager</span>;
  if (account.role === 'client' && account.manager_id) return <span className="admin-relation-badge linked">Linked</span>;
  if (account.role === 'client') return <span className="admin-relation-badge open">Unassigned</span>;
  return <span className="admin-relation-badge owner">Owner</span>;
}

function LimitForm({ account, limit, formId }: { account: ManagedAccount; limit?: EntitlementLimitRow; formId: string }) {
  if (isManager(account)) return <form id={formId} action="/api/master/entitlements" method="post" className="limit-editor-form flyout-form"><input type="hidden" name="mode" value="manager" /><input type="hidden" name="profileId" value={account.id} /><div className="limit-meter"><strong>{limit?.current_clients || 0}/{numberText(limit?.max_clients)}</strong><small>active clients</small></div><label><span>Client limit</span><input name="maxClients" type="number" min="0" defaultValue={limit?.max_clients ?? ''} placeholder="Default" /></label><label><span>Default outputs per client/day</span><input name="defaultClientOutputLimit" type="number" min="0" defaultValue={limit?.default_client_output_limit ?? ''} placeholder="Default" /></label></form>;
  if (account.role === 'client') return <form id={formId} action="/api/master/entitlements" method="post" className="limit-editor-form flyout-form"><input type="hidden" name="mode" value="client" /><input type="hidden" name="profileId" value={account.id} /><div className="limit-meter"><strong>{dayUsed(limit)}/{numberText(limit?.effective_output_limit)}</strong><small>outputs today</small></div><label><span>Daily output limit</span><input name="outputLimit" type="number" min="0" defaultValue={limit?.client_output_limit ?? ''} placeholder="Manager default" /></label></form>;
  return <p className="flyout-muted">Master account limits are protected.</p>;
}

function ActionForms({ account, currentUserId }: { account: ManagedAccount; currentUserId: string }) {
  if (account.role === 'master') return <p className="flyout-muted">Master account is protected.</p>;
  if (account.id === currentUserId) return <p className="flyout-muted">Current signed-in account.</p>;
  const blocked = account.account_status === 'disabled' || account.account_status === 'suspended';
  return <div className="admin-actions-row flyout-actions">{account.role === 'client' && <ControlForm profileId={account.id} intent="make_manager" label="Promote" primary />}{isManager(account) && <><ControlForm profileId={account.id} intent="demote_client" label="Demote" /><RotateInvite managerId={account.id} /></>}{blocked ? <ControlForm profileId={account.id} intent="reactivate" label="Reactivate" primary /> : <><ControlForm profileId={account.id} intent="suspend" label="Suspend" /><ControlForm profileId={account.id} intent="disable" label="Disable" /></>}{account.role === 'client' && account.manager_id && <ControlForm profileId={account.id} intent="clear_manager" label="Unlink" />}</div>;
}

function Flyout({ account, currentUserId, limit }: { account: ManagedAccount; currentUserId: string; limit?: EntitlementLimitRow }) {
  const formId = `limit-form-${account.id}`;
  const saveAction = canEditLimits(account) ? <button type="submit" form={formId} className="admin-action-button primary flyout-save-button">Save limits</button> : null;

  return <TableFlyout eyebrow="Account controls" title={account.full_name || account.email || 'Account'} summary={agreementSummary(account, limit)} actionLabel="Manage" headerAction={saveAction}><section className="table-flyout-section"><strong>Daily agreement limits</strong><LimitForm account={account} limit={limit} formId={formId} /></section><section className="table-flyout-section"><strong>Actions</strong><ActionForms account={account} currentUserId={currentUserId} /></section></TableFlyout>;
}

export default function MasterAccountTableV2({ accounts, currentUserId, emptyText, entitlements = {} }: { accounts: ManagedAccount[]; currentUserId: string; emptyText: string; entitlements?: EntitlementLimitMap }) {
  return <div className="admin-monitor-table-wrap"><table className="admin-monitor-table professional-data-table entitlement-table flyout-data-table"><thead><tr><th>Account</th><th>Role</th><th>Status</th><th>Link</th><th>Agreement</th><th>Invite</th><th>Updated</th></tr></thead><tbody>{accounts.length ? accounts.map((item) => <tr key={item.id}><td data-label="Account"><strong>{item.full_name || item.email || 'Unnamed user'}</strong><small>{item.email || 'Protected account'}</small></td><td data-label="Role"><span className={`admin-role-badge ${item.role}`}>{item.role === 'admin' ? 'manager' : item.role}</span></td><td data-label="Status"><span className={`admin-status-badge ${item.account_status || 'pending'}`}>{statusText(item.account_status)}</span></td><td data-label="Link"><LinkBadge account={item} /></td><td data-label="Agreement"><Flyout account={item} currentUserId={currentUserId} limit={entitlements[item.id]} /></td><td data-label="Invite">{isManager(item) ? item.manager_invite_code || 'Not created' : '—'}</td><td data-label="Updated">{dateText(item.updated_at)}</td></tr>) : <tr><td colSpan={7} className="admin-monitor-empty">{emptyText}</td></tr>}</tbody></table></div>;
}
