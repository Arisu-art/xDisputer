export const performanceContract = {
  owner: 'src/features/performance',
  canvas: 'docs/performance-boost-canvas.md',
  guard: 'scripts/performance-boost-guard.mjs',
  debugMount: 'components/console/RenderDebuggerMount.tsx',
  notificationOwner: 'components/console/AccountMenu.tsx',
  rules: {
    debugPanelDefault: 'off',
    notificationOwner: 'account-rail-only',
    supabaseQueryOrder: 'from-select-filter-order-limit',
    heavyClientLibraries: 'lazy-or-server-only',
    cssOwnership: 'feature-owned-or-contract-marked'
  }
} as const;

export const performanceCriticalGaps = [
  'debug-overlay-default-on',
  'browser-timer-frequency',
  'heavy-client-bundle-risk',
  'global-css-cascade-risk',
  'supabase-overfetch-or-query-order'
] as const;
