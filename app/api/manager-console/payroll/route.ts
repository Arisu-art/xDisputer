import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireRole } from '../../../../lib/saas/session';

function clean(value: FormDataEntryValue | null, max = 160) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, max);
}

function numberValue(value: FormDataEntryValue | null) {
  const parsed = Number(String(value || '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function employmentType(value: FormDataEntryValue | null) {
  return clean(value) === 'full_time' ? 'full_time' : 'output_based';
}

function redirectToConsole(request: NextRequest, state: 'ok' | 'error', message?: string) {
  const referer = request.headers.get('referer');
  const target = referer ? new URL(referer) : new URL('/admin?panel=payroll', request.url);
  target.searchParams.set('control', state);
  if (message) target.searchParams.set('message', message.slice(0, 160));
  return NextResponse.redirect(target, 303);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const profileId = clean(formData.get('profileId'), 80);
    if (!profileId) return redirectToConsole(request, 'error', 'Missing account.');

    const { user, supabase } = await requireRole('manager');
    const type = employmentType(formData.get('employmentType'));
    const baseSalary = numberValue(formData.get('baseSalary'));
    const perOutputRate = numberValue(formData.get('perOutputRate'));
    const record = {
      manager_id: user.id,
      user_id: profileId,
      employment_type: type,
      is_regular: type === 'full_time',
      base_salary: baseSalary,
      per_output_rate: perOutputRate,
      salary: baseSalary,
      rate: perOutputRate,
      payday_frequency: clean(formData.get('paydayFrequency')) || 'manual',
      notes: clean(formData.get('notes'), 300) || null,
      updated_at: new Date().toISOString()
    };

    const saved = await supabase.from('manager_user_settings').upsert(record, { onConflict: 'manager_id,user_id' });
    if (saved.error) return redirectToConsole(request, 'error', saved.error.message);

    revalidatePath('/admin');
    return redirectToConsole(request, 'ok', 'Disputer payroll settings saved.');
  } catch (error) {
    return redirectToConsole(request, 'error', error instanceof Error ? error.message : 'Payroll settings failed.');
  }
}
