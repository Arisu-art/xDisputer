import { requireRole } from '../../lib/saas/session';
import { requireWorkspaceAccess } from '../../lib/saas/access-entitlement';
import LetterGeneratorWorkspaceV2 from '../../components/LetterGeneratorWorkspaceV2';
import ApplicationRecoveryBoundary from '../../components/ApplicationRecoveryBoundary';

type PageProps = {
  searchParams?: Promise<{
    control?: string | string[];
    message?: string | string[];
  }>;
};

function stringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function WorkspacePage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const controlStatus = stringParam(params.control);
  const controlMessage = stringParam(params.message);
  await requireWorkspaceAccess();
  const { user, profile } = await requireRole('client');
  const managerConnected = Boolean(profile?.manager_id);

  return (
    <ApplicationRecoveryBoundary>
      <LetterGeneratorWorkspaceV2 accountEmail={profile?.email || user.email || null} accountRole="client" />

      <aside className={`client-manager-dock ${managerConnected ? 'connected collapsed' : ''}`} aria-label="Client manager connection">
        <div className="client-manager-dock-header">
          <div>
            <p>Manager access</p>
            <h2>{managerConnected ? 'Connected' : 'Join a manager'}</h2>
            {!managerConnected && <span>Your manager must send an invite link and approve this account.</span>}
          </div>
          <strong className="client-manager-status">{managerConnected ? 'On' : 'Off'}</strong>
        </div>

        {controlStatus && (
          <div className={`client-manager-dock-details ${controlStatus === 'error' ? 'error' : 'success'}`}>
            {controlStatus === 'ok' ? 'Manager connection updated.' : `Manager connection failed: ${controlMessage || 'Unknown error.'}`}
          </div>
        )}

        <div className="client-manager-collapsed-note">
          {managerConnected ? 'Manager approval is active.' : 'Waiting for manager invite approval.'}
        </div>
      </aside>
    </ApplicationRecoveryBoundary>
  );
}
