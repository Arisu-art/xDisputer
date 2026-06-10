import { redirect } from 'next/navigation';
import { getCurrentUserProfile } from '../lib/supabase/roles';

export default async function Page() {
  const { user, profile } = await getCurrentUserProfile();

  if (!user) redirect('/login');
  if (profile?.role === 'admin') redirect('/admin');

  redirect('/client');
}
