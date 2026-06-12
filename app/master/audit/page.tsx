import AccessAuditView from '../../../components/AccessAuditView';
import { listAccessAuditEvents } from '../../../lib/saas/access-audit';
import { requireRole } from '../../../lib/saas/session';

const MASTER_AUDIT_LIMIT = 80;

export default async function MasterAuditPage() {
  const { supabase } = await requireRole('master');
  const { events, errorMessage } = await listAccessAuditEvents(supabase, 'master', MASTER_AUDIT_LIMIT);

  return <AccessAuditView scope="master" events={events} errorMessage={errorMessage} />;
}
