import type { createSupabaseServerClient } from '../supabase/server';

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type ManagerUserSetting = {
  manager_id: string;
  user_id: string;
  is_regular: boolean;
  rate: number;
  salary: number;
  notes: string | null;
  updated_at: string | null;
};

export type ManagerUserSettingMap = Record<string, ManagerUserSetting>;

function isMissingTable(message: string | undefined) {
  return Boolean(message && (message.includes('manager_user_settings') || message.includes('does not exist') || message.includes('schema cache')));
}

function normalizeSetting(row: Partial<ManagerUserSetting>): ManagerUserSetting {
  return {
    manager_id: String(row.manager_id || ''),
    user_id: String(row.user_id || ''),
    is_regular: row.is_regular !== false,
    rate: Number(row.rate || 0),
    salary: Number(row.salary || 0),
    notes: row.notes || null,
    updated_at: row.updated_at || null
  };
}

export async function listManagerUserSettings(supabase: SupabaseServerClient, managerId: string, userIds: string[]) {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (!managerId || !ids.length) return { settings: {} as ManagerUserSettingMap, errorMessage: null as string | null };

  const { data, error } = await supabase
    .from('manager_user_settings')
    .select('manager_id, user_id, is_regular, rate, salary, notes, updated_at')
    .eq('manager_id', managerId)
    .in('user_id', ids);

  if (error) return { settings: {} as ManagerUserSettingMap, errorMessage: isMissingTable(error.message) ? null : error.message };

  const rows = Array.isArray(data) ? data.map((row) => normalizeSetting(row as Partial<ManagerUserSetting>)).filter((row) => row.user_id) : [];
  return { settings: Object.fromEntries(rows.map((row) => [row.user_id, row])), errorMessage: null };
}

export function defaultManagerUserSetting(managerId: string, userId: string): ManagerUserSetting {
  return { manager_id: managerId, user_id: userId, is_regular: true, rate: 0, salary: 0, notes: null, updated_at: null };
}

export function payrollAmount(setting: ManagerUserSetting | undefined, outputCount: number) {
  if (!setting) return 0;
  const variablePay = Math.max(0, Number(setting.rate || 0)) * Math.max(0, outputCount);
  return Math.max(0, Number(setting.salary || 0)) + variablePay;
}
