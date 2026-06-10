import { redirect } from 'next/navigation';
import { requireUser, roleForEmail } from '../../../lib/supabase/roles';
import LetterGeneratorWorkspaceV2 from '../../../components/LetterGeneratorWorkspaceV2';
import ApplicationRecoveryBoundary from '../../../components/ApplicationRecoveryBoundary';

export default async function ClientDocumentWorkspacePage() {
  const { user, profile } = await requireUser();
  const resolvedRole = profile?.role || roleForEmail(user?.email);

  if (resolvedRole === 'admin') {
    redirect('/admin');
  }

  return (
    <ApplicationRecoveryBoundary>
      <LetterGeneratorWorkspaceV2 accountEmail={profile?.email || user?.email || null} accountRole="client" />
    </ApplicationRecoveryBoundary>
  );
}
