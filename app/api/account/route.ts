import { NextResponse } from 'next/server';
import { getCurrentUserProfile } from '../../../lib/supabase/roles';
import { dashboardForRole } from '../../../lib/saas/routes';

export async function GET() {
  const { user, profile } = await getCurrentUserProfile();

  if (!user) {
    return NextResponse.json({
      authenticated: false,
      user: null,
      profile: null,
      dashboard: null
    });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email
    },
    profile,
    dashboard: dashboardForRole(profile?.role)
  });
}
