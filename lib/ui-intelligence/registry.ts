import type { FeatureContract, UIContract } from './types';

const CONSOLE_ROUTES = [
  '/admin',
  '/admin/*',
  '/manager-workspace',
  '/manager-workspace/*',
  '/master',
  '/master/*'
];

const TEMPLATE_WORKSPACE_ROUTES = ['/manager-workspace', '/manager-workspace/studio', '/manager-workspace/engine'];

export const UI_CONTRACTS: UIContract[] = [
  {
    id: 'console-shell',
    kind: 'layout',
    scope: 'global',
    owner: 'global',
    label: 'Console Shell',
    description: 'Canonical layout wrapper for manager, master, and workspace pages.',
    sourceFiles: ['components/console/ConsoleShell.tsx', 'app/final-console-account-rail.css'],
    connectedRoutes: CONSOLE_ROUTES,
    connectedProcesses: ['navigation', 'account-settings', 'switch-mode', 'runtime-debugger'],
    requiredMarkers: ['data-console-shell', 'data-console-main', 'data-console-header-grid', 'data-console-layout-ratio'],
    designTokens: ['--account-dock-width', '--account-dock-height', '--console-header-ratio-left', '--console-header-ratio-right'],
    dependencies: ['ConsoleHeader', 'AccountMenu', 'navigation-manifest'],
    allowedCustomizations: ['header eyebrow', 'header title', 'header description', 'nav items', 'role label'],
    forbiddenPatterns: ['ControlConsoleShell wrapper', 'duplicate account sidebar footer', 'route-owned console shell', 'raw header outside ConsoleHeader', 'switch mode inside account popover'],
    propagationGroup: 'console-global'
  },
  {
    id: 'console-header',
    kind: 'component',
    scope: 'global',
    owner: 'global',
    label: 'Console Header',
    description: 'Shared console page heading and hero card used by operations, workspace, and master routes.',
    sourceFiles: ['components/console/ConsoleHeader.tsx', 'app/console-shell-system.css'],
    connectedRoutes: CONSOLE_ROUTES,
    connectedProcesses: ['layout-ratio', 'runtime-debugger'],
    requiredMarkers: ['data-console-header', 'data-console-header-primary'],
    designTokens: ['--account-dock-height', '--account-dock-radius'],
    dependencies: ['ConsoleShell'],
    allowedCustomizations: ['eyebrow', 'title', 'description'],
    forbiddenPatterns: ['custom report hero', 'raw admin-monitor-header in page body'],
    propagationGroup: 'console-global'
  },
  {
    id: 'account-menu',
    kind: 'account',
    scope: 'global',
    owner: 'global',
    label: 'Account Settings Rail',
    description: 'Shared avatar rail and active-account settings panel for all console surfaces.',
    sourceFiles: ['components/console/AccountMenu.tsx', 'app/api/account/profile/route.ts', 'app/final-console-account-rail.css'],
    connectedRoutes: CONSOLE_ROUTES,
    connectedProcesses: ['profile-save', 'session-security', 'account-context'],
    requiredMarkers: ['data-console-account-menu', 'data-manager-account-anchor', 'data-manager-account-popover-align'],
    designTokens: ['--account-dock-width', '--account-dock-height'],
    dependencies: ['profiles', 'Supabase auth metadata', 'ConsoleShell'],
    allowedCustomizations: ['account label', 'role label', 'display name'],
    forbiddenPatterns: ['Manage accounts shortcut', 'Reports shortcut', 'System health shortcut', 'switch mode inside account popover'],
    propagationGroup: 'console-global'
  },
  {
    id: 'sidebar-switch-mode',
    kind: 'navigation',
    scope: 'global',
    owner: 'global',
    label: 'Sidebar Switch Mode',
    description: 'Highlighted bottom-left switch between operations and workspace surfaces.',
    sourceFiles: ['components/console/ConsoleShell.tsx', 'app/final-console-account-rail.css'],
    connectedRoutes: CONSOLE_ROUTES,
    connectedProcesses: ['manager-operations-to-workspace', 'workspace-to-operations', 'master-paired-surface'],
    requiredMarkers: ['data-console-mode-switch', 'data-manager-switch-visible-slot'],
    designTokens: ['consoleSwitchPulse'],
    dependencies: ['ConsoleShell', 'ConsoleNavLink'],
    allowedCustomizations: ['target label', 'helper copy', 'mode icon'],
    forbiddenPatterns: ['switch shortcut in AccountMenu', 'floating switch outside sidebar'],
    propagationGroup: 'console-global'
  },
  {
    id: 'render-debugger',
    kind: 'runtime-debug',
    scope: 'global',
    owner: 'system',
    label: 'Render Debugger',
    description: 'Runtime proof panel for shell, header, account, ratio, grid, and CSS bundle detection.',
    sourceFiles: ['components/console/RenderDebugger.tsx', 'app/console-debug-overlay.css'],
    connectedRoutes: CONSOLE_ROUTES,
    connectedProcesses: ['runtime-inspection', 'root-cause-trace'],
    requiredMarkers: ['window.__xdisputerDebug', 'headerAccountWidthRatio', 'detectionMode'],
    designTokens: [],
    dependencies: ['ConsoleShell', 'document.styleSheets'],
    allowedCustomizations: ['debug output labels'],
    forbiddenPatterns: ['debugger mutates layout', 'debugger blocks route rendering'],
    propagationGroup: 'diagnostics-global'
  },
  {
    id: 'template-workspace-navigation',
    kind: 'navigation',
    scope: 'domain',
    owner: 'manager',
    label: 'Manager Workspace Three-Hub Navigation',
    description: 'Manager template workspace navigation reduced to Template Library, Template Studio, and Generation Engine.',
    sourceFiles: ['lib/templates/workspace/template-workspace-navigation.ts', 'components/templates/workspace/TemplateWorkspaceShell.tsx'],
    connectedRoutes: TEMPLATE_WORKSPACE_ROUTES,
    connectedProcesses: ['template-source-of-truth', 'template-authoring-rules', 'template-execution-control'],
    requiredMarkers: ['TEMPLATE_WORKSPACE_NAV_ITEMS', 'templateWorkspaceNavForPath'],
    designTokens: ['template-workspace-hub'],
    dependencies: ['ConsoleShell', 'TemplateWorkspaceContract'],
    allowedCustomizations: ['hub label', 'hub description', 'active path'],
    forbiddenPatterns: ['Contracts static nav', 'Mappings static nav', 'Quality static nav', 'Releases static nav', 'Automation static nav'],
    propagationGroup: 'template-domain'
  },
  {
    id: 'template-execution',
    kind: 'template',
    scope: 'domain',
    owner: 'manager',
    label: 'Template Execution Contract',
    description: 'Manager-owned dynamic template pipeline from library to studio to generation engine.',
    sourceFiles: ['lib/templates/workspace', 'components/templates/workspace', 'scripts/template-workspace-contract-guard.mjs'],
    connectedRoutes: TEMPLATE_WORKSPACE_ROUTES,
    connectedProcesses: ['parser', 'canonical-fields', 'mapping', 'renderer', 'generation-engine', 'output-review'],
    requiredMarkers: ['decideTemplateTokenBehavior', 'computeTemplateReadiness', 'previewGenerationPlan'],
    designTokens: ['template-round-selection-grid', 'templateReadyGlow'],
    dependencies: ['canonical-field-registry', 'template-workspace-navigation', 'template-workspace-contract'],
    allowedCustomizations: ['template copy', 'round label', 'mapping alias', 'generation preview state'],
    forbiddenPatterns: ['template-specific field outside canonical registry', 'duplicate renderer mapping', 'unregistered parser output'],
    propagationGroup: 'template-domain'
  }
];

export const FEATURE_CONTRACTS: FeatureContract[] = [
  {
    id: 'account-profile-settings',
    label: 'Active Account Profile Settings',
    owner: 'global',
    status: 'active',
    entryRoutes: CONSOLE_ROUTES,
    sourceFiles: ['components/console/AccountMenu.tsx', 'app/api/account/profile/route.ts'],
    apiRoutes: ['/api/account/profile'],
    databaseObjects: ['profiles', 'auth.users.user_metadata'],
    uiContracts: ['account-menu', 'console-shell'],
    dependencies: ['Supabase auth session', 'profile row', 'Next revalidatePath'],
    fallbackBehavior: 'Use email local-part when profile display name is unavailable.'
  },
  {
    id: 'manager-template-authoring',
    label: 'Manager Template Workspace Pipeline',
    owner: 'manager',
    status: 'active',
    entryRoutes: TEMPLATE_WORKSPACE_ROUTES,
    sourceFiles: ['components/templates/workspace', 'lib/templates/workspace', 'components/ManagerTemplateWorkspaceClient.tsx'],
    apiRoutes: ['/api/template-assets'],
    databaseObjects: ['template_assets', 'template storage'],
    uiContracts: ['template-workspace-navigation', 'template-execution', 'console-shell'],
    dependencies: ['template library service', 'template studio service', 'generation engine service'],
    fallbackBehavior: 'Route missing templates to Library, mapping issues to Studio, and release checks to Generation Engine.'
  }
];

export function getUIContract(id: string) {
  return UI_CONTRACTS.find((contract) => contract.id === id) || null;
}

export function contractsByPropagationGroup(group: string) {
  return UI_CONTRACTS.filter((contract) => contract.propagationGroup === group);
}
