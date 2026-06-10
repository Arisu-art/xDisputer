import { redirect } from 'next/navigation';
import { requireUser } from '../../lib/supabase/roles';
import { getStaticIntegrationHealth } from '../../lib/saas/integration-health';
import SaasPortalShell from '../../components/SaasPortalShell';
import SaasClientDashboard from '../../components/SaasClientDashboard';

export default async function ClientPortalPage() {
  const { user, profile } = await requireUser();

  if (profile?.role === 'admin') redirect('/admin');

  return (
    <SaasPortalShell
      role="client"
      email={profile?.email || user?.email}
      title="Client portal"
      subtitle="A secure dashboard for account access, workspace launch, and connected platform status."
    >
      <SaasClientDashboard email={profile?.email || user?.email} integrations={getStaticIntegrationHealth()} />
    </SaasPortalShell>
  );
}
