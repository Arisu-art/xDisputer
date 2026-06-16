export type ThemeGovernanceRole = 'global' | 'client' | 'manager' | 'master' | 'auth';

export type ThemeGovernanceIssueKind =
  | 'theme'
  | 'layout'
  | 'loading'
  | 'backend'
  | 'accessibility'
  | 'unknown';

export type ThemeGovernanceDecision = {
  kind: ThemeGovernanceIssueKind;
  ownerFile: string;
  reason: string;
  requiredGuards: string[];
  shouldNotDo: string[];
};

export type ThemeGovernanceCanvas = {
  id: string;
  title: string;
  goal: string;
  sourceOfTruth: string[];
  roles: ThemeGovernanceRole[];
  globalTokens: string[];
  customizationHooks: string[];
  workflow: string[];
  performanceModel: {
    loadsFirst: string[];
    loadsLater: string[];
    cached: string[];
    paginated: string[];
    refreshed: string[];
    fallback: string[];
  };
  antiPatterns: string[];
};

export const XDISPUTER_THEME_GOVERNANCE_CANVAS: ThemeGovernanceCanvas = {
  id: 'xdisputer-unified-ux-theme-governance',
  title: 'xDisputer Unified UX Theme Governance Canvas',
  goal: 'Keep client, manager, master, auth, template, source, output, and AI surfaces visually consistent while allowing safe function-specific customization.',
  sourceOfTruth: [
    'app/layout.tsx',
    'app/ui-theme-contracts.css',
    'app/ui-layout-contracts.css',
    'scripts/theme-consistency-guard.mjs',
    'docs/ux-theme-governance-canvas.md'
  ],
  roles: ['global', 'client', 'manager', 'master', 'auth'],
  globalTokens: [
    '--x-color-bg',
    '--x-color-surface',
    '--x-color-text',
    '--x-color-primary',
    '--x-color-success',
    '--x-color-warning',
    '--x-color-danger',
    '--x-radius-lg',
    '--x-space-4',
    '--x-transition-fast'
  ],
  customizationHooks: [
    'data-theme-contract="xdisputer-unified"',
    'data-ui-scope="global"',
    'data-ui-quality="production"',
    'data-motion-contract="safe"',
    'data-theme-surface="card"',
    'data-theme-action="primary"',
    'data-theme-action="secondary"',
    'data-theme-control="input"',
    'data-theme-status="success|warning|danger"',
    'data-theme-loading="skeleton"',
    'data-theme-custom="client|manager|master|auth"'
  ],
  workflow: [
    'Classify the UI problem before coding.',
    'Use ui-theme-contracts.css for visual tone: color, typography, radius, shadows, buttons, inputs, status, loading, motion.',
    'Use ui-layout-contracts.css for geometry: grid, flex, sidebars, headers, overflow, responsive order.',
    'Use component code only when render state, data shape, or interaction logic is wrong.',
    'Use Supabase/route code only when auth, data, RLS, storage, or backend permissions are the root cause.',
    'Run theme, layout, responsive, typecheck, and build guards after changes.'
  ],
  performanceModel: {
    loadsFirst: ['root layout', 'global CSS tokens', 'layout contracts', 'visible route shell'],
    loadsLater: ['role-specific data', 'dashboard counts', 'paginated datasets', 'AI reviews', 'generated outputs'],
    cached: ['static CSS', 'static JS chunks', 'deterministic shell markup'],
    paginated: ['account directories', 'client datasets', 'manager outputs', 'audit logs'],
    refreshed: ['route-scoped datasets after mutations', 'auth/session state after login/logout', 'generation output after successful run'],
    fallback: ['skeleton loading shell', 'alert panel', 'disabled blocker state', 'empty dataset state']
  },
  antiPatterns: [
    'Do not create a new global theme per route.',
    'Do not use transition-property: all.',
    'Do not rely on expensive backdrop-filter or heavy blur for core cards.',
    'Do not hardcode random one-off colors when a token exists.',
    'Do not solve backend/auth/RLS errors with CSS.',
    'Do not put layout geometry into the theme contract.',
    'Do not make client, manager, master, and auth surfaces feel like separate products.'
  ]
};

export function classifyThemeGovernanceIssue(input: string): ThemeGovernanceDecision {
  const normalized = input.toLowerCase();

  if (/(color|theme|button|input|card|surface|shadow|radius|typography|font|status|badge|loading|skeleton|motion|transition)/.test(normalized)) {
    return {
      kind: 'theme',
      ownerFile: 'app/ui-theme-contracts.css',
      reason: 'The issue changes visual tone or reusable UI styling, so it belongs to the unified theme contract.',
      requiredGuards: ['npm run theme:guard', 'npm run responsive:guard', 'npm run typecheck', 'npm run build'],
      shouldNotDo: ['Do not add a route-specific global theme.', 'Do not use transition-property: all.', 'Do not hardcode one-off colors.']
    };
  }

  if (/(grid|layout|sidebar|header|overflow|clip|responsive|column|row|width|height|position|spacing collapse)/.test(normalized)) {
    return {
      kind: 'layout',
      ownerFile: 'app/ui-layout-contracts.css',
      reason: 'The issue changes geometry or responsive structure, so it belongs to the final layout contract.',
      requiredGuards: ['npm run layout:guard', 'npm run responsive:guard', 'npm run typecheck', 'npm run build'],
      shouldNotDo: ['Do not hide overflow as a substitute for fixing layout ownership.', 'Do not add fixed desktop-only widths.', 'Do not move business logic into CSS.']
    };
  }

  if (/(delay|lag|slow|spinner|skeleton|pending|loading|optimistic|refresh)/.test(normalized)) {
    return {
      kind: 'loading',
      ownerFile: 'component owner + app/ui-theme-contracts.css',
      reason: 'The issue affects perceived performance and needs component state plus theme loading hooks.',
      requiredGuards: ['npm run theme:guard', 'npm run typecheck', 'npm run build'],
      shouldNotDo: ['Do not block the full page for small async updates.', 'Do not load every row into the browser.', 'Do not add unnecessary dependencies.']
    };
  }

  if (/(supabase|auth|rls|database|storage|api|server|permission|session|invalid api key)/.test(normalized)) {
    return {
      kind: 'backend',
      ownerFile: 'app/api/*, lib/saas/*, lib/supabase/*, or Supabase SQL',
      reason: 'The issue is caused by runtime data/auth/backend state, not visual styling.',
      requiredGuards: ['npm run supabase:doctor', 'npm run typecheck', 'npm run build'],
      shouldNotDo: ['Do not hide backend errors with CSS.', 'Do not expose service role keys in frontend code.', 'Do not bypass RLS.']
    };
  }

  if (/(contrast|focus|keyboard|aria|screen reader|reduced motion|accessibility)/.test(normalized)) {
    return {
      kind: 'accessibility',
      ownerFile: 'app/ui-theme-contracts.css + component owner',
      reason: 'The issue affects accessible operation and must preserve focus, contrast, and reduced-motion behavior.',
      requiredGuards: ['npm run theme:guard', 'npm run typecheck', 'npm run build'],
      shouldNotDo: ['Do not remove focus-visible outlines.', 'Do not rely on color alone for status.', 'Do not force motion for reduced-motion users.']
    };
  }

  return {
    kind: 'unknown',
    ownerFile: 'inspect current component owner first',
    reason: 'The issue is not yet classified. Inspect the route, component, CSS owner, and runtime state before coding.',
    requiredGuards: ['npm run theme:guard', 'npm run layout:guard', 'npm run responsive:guard', 'npm run typecheck', 'npm run build'],
    shouldNotDo: ['Do not guess the owner file.', 'Do not rewrite working components blindly.', 'Do not skip validation.']
  };
}

export function themeGovernanceChecklist(role: ThemeGovernanceRole) {
  return [
    `Use the global xDisputer theme contract for ${role}.`,
    'Use approved theme tokens for color, spacing, depth, typography, and motion.',
    'Use data-theme-custom only for local role emphasis.',
    'Use ui-layout-contracts.css for geometry changes.',
    'Keep loading feedback instant and lightweight.',
    'Run npm run theme:guard before accepting the change.'
  ];
}
