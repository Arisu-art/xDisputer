import { NextResponse } from 'next/server';
import { getSessionContext } from '../../../lib/saas/session';

export async function GET() {
  const session = await getSessionContext();

  if (!session.user) {
    return NextResponse.json({
      authenticated: false,
      user: null,
      profile: null,
      role: null,
      isMaster: false,
      isAdmin: false,
      isClient: false,
      dashboard: null
    });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: session.user.id,
      email: session.user.email
    },
    profile: session.profile,
    role: session.role,
    isMaster: session.isMaster,
    isAdmin: session.isAdmin,
    isClient: session.isClient,
    dashboard: session.dashboardPath
  });
}
