import AccessAuditView from '../../../components/AccessAuditView';
import { listAccessAuditEvents } from '../../../lib/saas/access-audit';
import { requireRole } from '../../../lib/saas/session';

export default async function AdminAuditPage() {
  const { supabase } = await requireRole('manager');
  const result = await listAccessAuditEvents(supabase, 'manager', 80);

  return <AccessAuditView scope="manager" events={result.events} errorMessage={result.errorMessage} />;
}
