import { requireRole } from '../../lib/saas/session';
import LetterGeneratorWorkspaceV2 from '../../components/LetterGeneratorWorkspaceV2';
import ApplicationRecoveryBoundary from '../../components/ApplicationRecoveryBoundary';

export default async function WorkspacePage() {
  const { user, profile } = await requireRole('client');

  return (
    <ApplicationRecoveryBoundary>
      <LetterGeneratorWorkspaceV2 accountEmail={profile?.email || user.email || null} accountRole="client" />
    </ApplicationRecoveryBoundary>
  );
}
