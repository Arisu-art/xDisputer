import { redirect } from 'next/navigation';
import { requireUser } from '../../lib/supabase/roles';
import LetterGeneratorWorkspaceV2 from '../../components/LetterGeneratorWorkspaceV2';
import ApplicationRecoveryBoundary from '../../components/ApplicationRecoveryBoundary';
import SaasPortalShell from '../../components/SaasPortalShell';

export default async function ClientWorkspacePage() {
  const { user, profile } = await requireUser();

  if (profile?.role === 'admin') {
    redirect('/admin');
  }

  return (
    <SaasPortalShell
      role="client"
      email={profile?.email || user?.email}
      title="Client document workspace"
      subtitle="Prepare packets, upload source data, review outputs, and continue filing operations from your protected account."
    >
      <div className="saas-embedded-workspace">
        <ApplicationRecoveryBoundary>
          <LetterGeneratorWorkspaceV2 />
        </ApplicationRecoveryBoundary>
      </div>
    </SaasPortalShell>
  );
}
