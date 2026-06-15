import { requireRole } from '../../lib/saas/session';
import { requireWorkspaceAccess } from '../../lib/saas/access-entitlement';
import LetterGeneratorWorkspaceV2 from '../../components/LetterGeneratorWorkspaceV2';
import ClientOutputLimitBoundary from '../../components/ClientOutputLimitBoundary';
import ApplicationRecoveryBoundary from '../../components/ApplicationRecoveryBoundary';
import ClientTemplateRuntimeDashboard from '../../components/client-template-runtime/ClientTemplateRuntimeDashboard';
import { getClientTemplateRuntimeContext } from '../../lib/client-template-runtime';

export default async function WorkspacePage() {
  await requireWorkspaceAccess();
  const { user, profile, supabase } = await requireRole('client');
  const clientTemplateContext = await getClientTemplateRuntimeContext({ supabase, clientUserId: user.id });

  return (
    <ApplicationRecoveryBoundary>
      <ClientOutputLimitBoundary>
        <ClientTemplateRuntimeDashboard context={clientTemplateContext} />
        <LetterGeneratorWorkspaceV2 accountEmail={profile?.email || user.email || null} accountRole="client" />
      </ClientOutputLimitBoundary>
    </ApplicationRecoveryBoundary>
  );
}
