export type AccountRoleLike = string | null | undefined;

export const PLATFORM_ACCOUNT_TERMS = {
  master: 'Master',
  manager: 'Manager',
  disputer: 'Disputer',
  admin: 'Manager'
} as const;

export function displayAccountRole(role: AccountRoleLike) {
  if (role === 'master') return PLATFORM_ACCOUNT_TERMS.master;
  if (role === 'manager' || role === 'admin') return PLATFORM_ACCOUNT_TERMS.manager;
  if (role === 'client') return PLATFORM_ACCOUNT_TERMS.disputer;
  return role ? role : 'Account';
}

export function displayAccountRoleLower(role: AccountRoleLike) {
  return displayAccountRole(role).toLowerCase();
}

export function displayAccountRoleBadge(role: AccountRoleLike) {
  return displayAccountRole(role).toUpperCase();
}

export function replaceClientUserTerms(value: string) {
  return value
    .replace(/client user/gi, 'disputer')
    .replace(/client account/gi, 'disputer account')
    .replace(/client limits/gi, 'disputer limits')
    .replace(/client output/gi, 'disputer output')
    .replace(/client usage/gi, 'disputer usage')
    .replace(/active clients/gi, 'active disputers')
    .replace(/clients available/gi, 'disputers available')
    .replace(/clients\b/gi, 'disputers')
    .replace(/client\b/gi, 'disputer');
}

export function documentSubjectLabel() {
  return 'Client';
}
