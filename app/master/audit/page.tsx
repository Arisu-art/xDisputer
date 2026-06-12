import AccessAuditView from '../../../components/AccessAuditView';
import { listAccessAuditEvents } from '../../../lib/saas/access-audit';
import { requireRole } from '../../../lib/saas/session';

export default async function MasterAuditPage() {
  const { supabase } = await requireRole('master');
  const { events, errorMessage } = await listAccessAuditEvents(supabase, 'master', 120);

  return <AccessAuditView scope="master" events={events} errorMessage={errorMessage} />;
}
