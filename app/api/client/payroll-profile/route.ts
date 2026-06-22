import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

function rowFrom(data: unknown): Record<string, unknown> | null {
  if (Array.isArray(data)) return data[0] as Record<string, unknown> | undefined || null;
  return data && typeof data === 'object' ? data as Record<string, unknown> : null;
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: userResult, error: userError } = await supabase.auth.getUser();
  if (userError || !userResult.user) return noStoreJson({ error: userError?.message || 'No authenticated user.' }, { status: 401 });

  const { data, error } = await supabase.rpc('client_payroll_profile_v1');
  if (error) return noStoreJson({ error: error.message }, { status: 500 });

  const row = rowFrom(data);
  const employmentType = row?.employment_type === 'output_based' ? 'output_based' : 'full_time';

  return noStoreJson({
    profile: {
      employmentType,
      isOutputBased: employmentType === 'output_based',
      isFullTime: employmentType === 'full_time',
      managerId: typeof row?.manager_id === 'string' ? row.manager_id : null,
      baseSalary: employmentType === 'output_based' ? 0 : numberValue(row?.base_salary),
      perOutputRate: numberValue(row?.per_output_rate),
      updatedAt: typeof row?.updated_at === 'string' ? row.updated_at : null
    }
  });
}
