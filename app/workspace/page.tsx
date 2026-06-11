import { joinManager } from './actions';
import { requireRole } from '../../lib/saas/session';
import LetterGeneratorWorkspaceV2 from '../../components/LetterGeneratorWorkspaceV2';
import ApplicationRecoveryBoundary from '../../components/ApplicationRecoveryBoundary';

export default async function WorkspacePage() {
  const { user, profile } = await requireRole('client');

  return (
    <ApplicationRecoveryBoundary>
      <section className="client-manager-card">
        <div>
          <p>Client manager</p>
          <h2>{profile?.manager_id ? 'Manager connected' : 'Join a manager'}</h2>
          <span>
            {profile?.manager_id
              ? `Your manager id is ${profile.manager_id}.`
              : 'Enter the invite code from your manager so they can monitor and support your account.'}
          </span>
        </div>
        <form action={joinManager} className="client-manager-form">
          <input name="inviteCode" placeholder="Manager invite code" required />
          <button type="submit">Join manager</button>
        </form>
      </section>
      <LetterGeneratorWorkspaceV2 accountEmail={profile?.email || user.email || null} accountRole="client" />
    </ApplicationRecoveryBoundary>
  );
}
