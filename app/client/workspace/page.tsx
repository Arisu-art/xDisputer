import { redirect } from 'next/navigation';
import { requireUser } from '../../../lib/supabase/roles';
import LetterGeneratorWorkspaceV2 from '../../../components/LetterGeneratorWorkspaceV2';
import ApplicationRecoveryBoundary from '../../../components/ApplicationRecoveryBoundary';

export default async function ClientDocumentWorkspacePage() {
  const { user, profile } = await requireUser();

  if (profile?.role === 'admin') {
    redirect('/admin');
  }

  return (
    <ApplicationRecoveryBoundary>
      <LetterGeneratorWorkspaceV2 accountEmail={profile?.email || user?.email || null} accountRole={profile?.role || 'client'} />
    </ApplicationRecoveryBoundary>
  );
}
