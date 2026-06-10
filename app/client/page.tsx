import { redirect } from 'next/navigation';
import { requireUser } from '../../lib/supabase/roles';
import LetterGeneratorWorkspaceV2 from '../../components/LetterGeneratorWorkspaceV2';
import ApplicationRecoveryBoundary from '../../components/ApplicationRecoveryBoundary';

export default async function ClientWorkspacePage() {
  const { profile } = await requireUser();

  if (profile?.role === 'admin') {
    redirect('/admin');
  }

  return (
    <ApplicationRecoveryBoundary>
      <LetterGeneratorWorkspaceV2 />
    </ApplicationRecoveryBoundary>
  );
}
