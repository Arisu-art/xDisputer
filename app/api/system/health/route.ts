import { NextResponse } from 'next/server';
import { getSystemHealthReport } from '../../../../lib/saas/system-health';

export async function GET() {
  const report = await getSystemHealthReport();
  return NextResponse.json(report, { status: report.summary.status === 'fail' ? 500 : 200 });
}
