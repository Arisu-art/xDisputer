export type ManagerTemplateScopeUi = {
  templateScope: 'MANAGER_TEMPLATE_ASSET';
  managerUserId: string;
  requesterUserId: string;
  source: 'MANAGER_SELF' | 'ASSIGNED_MANAGER' | 'MASTER_SELF';
  readOnlyForRequester: boolean;
  canManageTemplates: boolean;
};

export function managerTemplateAuthorityLabel(scope: ManagerTemplateScopeUi | null | undefined) {
  if (!scope) return 'Loading manager template policy';
  if (scope.canManageTemplates) return 'Manager template library';
  return 'Managed by assigned manager';
}

export function managerTemplateActionLabel(scope: ManagerTemplateScopeUi | null | undefined) {
  if (!scope) return 'Template policy is loading.';
  if (scope.canManageTemplates) return 'You can upload, replace, and remove manager default templates.';
  return 'Template upload is locked. This client uses the default templates uploaded by the assigned manager.';
}

export function canUseLocalBrowserTemplateFallback(scope: ManagerTemplateScopeUi | null | undefined) {
  return Boolean(scope?.canManageTemplates);
}
