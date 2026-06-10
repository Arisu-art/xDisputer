import { requireUser } from '../../lib/supabase/roles';
import LetterGeneratorWorkspaceV2 from '../../components/LetterGeneratorWorkspaceV2';
import ApplicationRecoveryBoundary from '../../components/ApplicationRecoveryBoundary';

export default async function ClientWorkspacePage() {
  await requireUser();

  return (
    <ApplicationRecoveryBoundary>
      <LetterGeneratorWorkspaceV2 />
    </ApplicationRecoveryBoundary>
  );
}
