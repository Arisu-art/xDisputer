import TableFlyout from '../../components/TableFlyout';
import type { ManagedAccount } from '../../lib/saas/account-management';
import type { EntitlementLimitMap, EntitlementLimitRow } from '../../lib/saas/entitlement-limits';
import { displayAccountRole, displayAccountRoleLower } from '../../lib/saas/display-terminology';

export type BossOption = { id: string; label: string; email: string | null };

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
function canEditLimits(account: ManagedAccount) { return isManager(account) || account.role === 'client'; }

function agreementSummary(account: ManagedAccount, limit?: EntitlementLimitRow) {
  if (isManager(account)) return `${limit?.current_clients || 0}/${numberText(limit?.max_clients)} disputers`;
  if (account.role === 'client') return `${dayUsed(limit)}/${numberText(limit?.effective_output_limit)} outputs today`;
  return 'Protected';
}

function roleLabel(account: ManagedAccount) {
  return displayAccountRoleLower(account.role);
}

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
  if (isManager(account)) return <form id={formId} action="/api/master/entitlements" method="post" className="limit-editor-form flyout-form"><input type="hidden" name="mode" value="manager" /><input type="hidden" name="profileId" value={account.id} /><div className="limit-meter"><strong>{limit?.current_clients || 0}/{numberText(limit?.max_clients)}</strong><small>active disputers</small></div><label><span>Disputer limit</span><input name="maxClients" type="number" min="0" defaultValue={limit?.max_clients ?? ''} placeholder="Default" /></label><label><span>Default outputs per disputer/day</span><input name="defaultClientOutputLimit" type="number" min="0" defaultValue={limit?.default_client_output_limit ?? ''} placeholder="Default" /></label></form>;
  if (account.role === 'client') return <form id={formId} action="/api/master/entitlements" method="post" className="limit-editor-form flyout-form"><input type="hidden" name="mode" value="client" /><input type="hidden" name="profileId" value={account.id} /><div className="limit-meter"><strong>{dayUsed(limit)}/{numberText(limit?.effective_output_limit)}</strong><small>outputs today</small></div><label><span>Daily output limit</span><input name="outputLimit" type="number" min="0" defaultValue={limit?.client_output_limit ?? ''} placeholder="Blank uses manager default" /></label></form>;
  return <p className="flyout-muted">Master account limits are protected.</p>;
}

function BossAssignmentForm({ account, bossOptions }: { account: ManagedAccount; bossOptions: BossOption[] }) {
  if (account.role !== 'client') return null;
  return <form action="/api/master/assign-manager" method="post" className="boss-assignment-form flyout-form"><input type="hidden" name="clientId" value={account.id} /><label><span>Boss / manager</span><select name="managerId" defaultValue={account.manager_id || ''}><option value="" disabled>Choose manager boss</option>{bossOptions.map((boss) => <option key={boss.id} value={boss.id}>{boss.label}{boss.email ? ` · ${boss.email}` : ''}</option>)}</select></label><button type="submit" className="admin-action-button primary">Save boss</button></form>;
}

function ActionForms({ account, currentUserId }: { account: ManagedAccount; currentUserId: string }) {
  if (account.role === 'master') return <p className="flyout-muted">Master account is protected.</p>;
  if (account.id === currentUserId) return <p className="flyout-muted">Current signed-in account.</p>;
  const blocked = account.account_status === 'disabled' || account.account_status === 'suspended';
  return <div className="admin-actions-row flyout-actions">{account.role === 'client' && <ControlForm key="promote" profileId={account.id} intent="make_manager" label="Promote" primary />}{isManager(account) && <span key="manager-actions" className="flyout-action-group"><ControlForm profileId={account.id} intent="demote_client" label="Demote" /><RotateInvite managerId={account.id} /></span>}{blocked ? <ControlForm key="reactivate" profileId={account.id} intent="reactivate" label="Reactivate" primary /> : <span key="block-actions" className="flyout-action-group"><ControlForm profileId={account.id} intent="suspend" label="Suspend" /><ControlForm profileId={account.id} intent="disable" label="Disable" /></span>}{account.role === 'client' && account.manager_id && <ControlForm key="unlink" profileId={account.id} intent="clear_manager" label="Unlink" />}</div>;
}

function AccountTrigger({ account, limit }: { account: ManagedAccount; limit?: EntitlementLimitRow }) {
  return <span className="account-control-trigger-grid master-account-trigger-v3"><span className="account-control-identity master-account-identity"><strong>{account.full_name || account.email || `Unnamed ${displayAccountRoleLower(account.role)}`}</strong><small>{account.email || `${displayAccountRole(account.role)} account`}</small></span><span className="master-account-status-cluster"><span className={`admin-role-badge ${account.role}`}>{roleLabel(account)}</span><span className={`admin-status-badge ${account.account_status || 'pending'}`}>{statusText(account.account_status)}</span><LinkBadge account={account} /></span><span className="account-control-agreement master-account-limit"><strong>{agreementSummary(account, limit)}</strong><small>{isManager(account) ? 'disputer control' : account.role === 'client' ? 'daily output' : 'protected'}</small></span><span className="master-account-open">Open controls</span><span className="account-control-meta"><small>Invite</small><strong>{isManager(account) ? account.manager_invite_code || 'Not created' : '—'}</strong></span><span className="account-control-meta"><small>Updated</small><strong>{dateText(account.updated_at)}</strong></span></span>;
}

function AccountControlCard({ account, currentUserId, limit, bossOptions }: { account: ManagedAccount; currentUserId: string; limit?: EntitlementLimitRow; bossOptions: BossOption[] }) {
  const formId = `limit-form-${account.id}`;
  const saveAction = canEditLimits(account) ? <button key={`save-limits-${account.id}`} type="submit" form={formId} className="admin-action-button primary flyout-save-button">Save limits</button> : null;

  return <TableFlyout eyebrow="Account controls" title={account.full_name || account.email || 'Account'} summary={agreementSummary(account, limit)} actionLabel="Open" triggerClassName="account-control-row-trigger master-account-row-v3" trigger={<AccountTrigger account={account} limit={limit} />} headerAction={saveAction}>
    <div className="account-control-flyout-content" data-account-control-flyout-content="key-safe-wrapper">
      <section className="table-flyout-section"><strong>Daily agreement limits</strong><LimitForm account={account} limit={limit} formId={formId} /></section>
      {account.role === 'client' && <section className="table-flyout-section"><strong>Boss assignment</strong><BossAssignmentForm account={account} bossOptions={bossOptions} /></section>}
      <section className="table-flyout-section"><strong>Actions</strong><ActionForms account={account} currentUserId={currentUserId} /></section>
    </div>
  </TableFlyout>;
}

export default function MasterAccountTableV2({ accounts, currentUserId, emptyText, entitlements = {}, bossOptions = [] }: { accounts: ManagedAccount[]; currentUserId: string; emptyText: string; entitlements?: EntitlementLimitMap; bossOptions?: BossOption[] }) {
  if (!accounts.length) return <div className="admin-monitor-empty">{emptyText}</div>;
  return <div className="account-control-list master-account-list-v3">{accounts.map((item) => <AccountControlCard key={item.id} account={item} currentUserId={currentUserId} limit={entitlements[item.id]} bossOptions={bossOptions} />)}</div>;
}
