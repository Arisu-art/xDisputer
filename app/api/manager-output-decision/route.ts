import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireRole } from '../../../lib/saas/session';
import { createNotification } from '../../../lib/notifications/notification-write-service';
import { outputActivityContract } from '../../../src/features/manager-output-activity/output-activity-contract';

function text(value: FormDataEntryValue | null, max = 160) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, max);
}

function amount(value: FormDataEntryValue | null) {
  const parsed = Number(String(value || '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : outputActivityContract.defaultRateAmount;
}

function back(request: NextRequest, state: string, message: string) {
  const target = new URL(request.headers.get('referer') || '/admin/output-activity-v2', request.url);
  target.searchParams.set('control', state);
  target.searchParams.set('message', message.slice(0, 150));
  return NextResponse.redirect(target, 303);
}

function decisionStatus(action: string) {
  if (action === 'confirm') return outputActivityContract.status.approved;
  if (action === 'reject') return outputActivityContract.status.rejected;
  if (action === 'paid') return outputActivityContract.status.paid;
  return '';
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const id = text(formData.get('activityId'), 80);
    const action = text(formData.get('action'), 40);
    const rate = amount(formData.get('rateAmount'));
    if (!id) return back(request, 'error', 'Missing output activity.');
    const { user, supabase } = await requireRole('manager');
    const existing = await supabase.from('manager_disputer_output_approvals').select('id, disputer_id, output_label, rate_amount').eq('manager_id', user.id).eq('id', id).maybeSingle();
    if (existing.error) return back(request, 'error', existing.error.message);
    if (!existing.data) return back(request, 'error', 'Output activity not found.');
    const status = decisionStatus(action);
    if (!status) return back(request, 'error', 'Invalid manager decision.');
    const patch = status === outputActivityContract.status.approved
      ? { status, rate_amount: rate, approved_at: new Date().toISOString(), updated_at: new Date().toISOString() }
      : status === outputActivityContract.status.rejected
        ? { status, rejected_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        : { status, paid_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const updated = await supabase.from('manager_disputer_output_approvals').update(patch).eq('manager_id', user.id).eq('id', id);
    if (updated.error) return back(request, 'error', updated.error.message);
    await createNotification({ supabase, createdBy: user.id, recipientUserId: existing.data.disputer_id, title: status === outputActivityContract.status.approved ? 'Output confirmed' : status === outputActivityContract.status.rejected ? 'Output not accepted' : 'Output paid', body: existing.data.output_label, href: '/workspace', severity: status === outputActivityContract.status.rejected ? 'error' : 'success' });
    revalidatePath('/admin/output-activity-v2');
    revalidatePath('/workspace');
    return back(request, 'ok', 'Output decision saved.');
  } catch (error) {
    return back(request, 'error', error instanceof Error ? error.message : 'Output decision failed.');
  }
}
