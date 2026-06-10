import { redirect } from 'next/navigation';
import { getCurrentUserProfile } from '../../lib/supabase/roles';
import { dashboardForRole } from '../../lib/saas/routes';

export default async function AppRoute() {
  const { user, profile } = await getCurrentUserProfile();

  if (!user) redirect('/login?next=/app');

  redirect(dashboardForRole(profile?.role));
}
