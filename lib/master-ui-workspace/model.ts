export type HologramRole = 'client' | 'manager' | 'master';
export type HologramMode = 'live' | 'edit' | 'navigation' | 'theme' | 'publish';
export type HologramImpact = 'low' | 'medium' | 'high';

export type HologramBlock = {
  id: string;
  type: string;
  title: string;
  region: 'hero' | 'navigation' | 'content' | 'system';
  description: string;
  roles: HologramRole[];
  impact: HologramImpact;
  locked?: boolean;
  status: 'published' | 'draft-ready' | 'guarded';
};

export type HologramNavItem = {
  id: string;
  label: string;
  route: string;
  roles: HologramRole[];
  enabled: boolean;
  locked?: boolean;
};

export type HologramThemeToken = {
  key: string;
  label: string;
  value: string;
  scope: 'global' | HologramRole;
  editable: boolean;
};

export type HologramModeDefinition = {
  id: HologramMode;
  label: string;
  purpose: string;
  guardrail: string;
};

export const HOLOGRAM_MODES: HologramModeDefinition[] = [
  {
    id: 'live',
    label: 'Live View',
    purpose: 'Inspect the currently published UI exactly as each role sees it.',
    guardrail: 'Read-only. Never edits live users directly.'
  },
  {
    id: 'edit',
    label: 'Edit Canvas',
    purpose: 'Move approved UI blocks, reorder sections, and shape each page without unsafe code injection.',
    guardrail: 'Local draft only until the publish gate validates it.'
  },
  {
    id: 'navigation',
    label: 'Navigation Builder',
    purpose: 'Preview role-scoped side navigation and plan add/remove/reorder actions.',
    guardrail: 'Routes must remain approved and role-gated.'
  },
  {
    id: 'theme',
    label: 'Theme Studio',
    purpose: 'Tune impact tokens for triad surfaces, compactness, borders, chips, and motion.',
    guardrail: 'Only allowlisted tokens may be changed.'
  },
  {
    id: 'publish',
    label: 'Publish Center',
    purpose: 'Review draft changes, required guards, risk score, rollback plan, and publish readiness.',
    guardrail: 'AI can propose. Master approves. Guards decide readiness.'
  }
];

export const INITIAL_HOLOGRAM_BLOCKS: HologramBlock[] = [
  {
    id: 'master-command-hero',
    type: 'hero',
    title: 'Command hero',
    region: 'hero',
    description: 'Controls the primary page title, context, action zone, and role-aware visual identity.',
    roles: ['client', 'manager', 'master'],
    impact: 'high',
    status: 'published',
    locked: true
  },
  {
    id: 'role-navigation',
    type: 'navigation',
    title: 'Role navigation rail',
    region: 'navigation',
    description: 'Controls side navigation order, labels, route visibility, and role-scoped destinations.',
    roles: ['client', 'manager', 'master'],
    impact: 'high',
    status: 'guarded'
  },
  {
    id: 'account-directory',
    type: 'dataset',
    title: 'Account directory',
    region: 'content',
    description: 'Master account table, filter toolbar, chips, status labels, and pagination surface.',
    roles: ['master'],
    impact: 'high',
    status: 'draft-ready'
  },
  {
    id: 'manager-queue',
    type: 'workflow',
    title: 'Manager workflow queue',
    region: 'content',
    description: 'Manager client queues, lifecycle states, exceptions, and reports shell.',
    roles: ['manager', 'master'],
    impact: 'medium',
    status: 'draft-ready'
  },
  {
    id: 'client-workbench',
    type: 'workspace',
    title: 'Client workbench',
    region: 'content',
    description: 'Client packet generation, document flow, guidance, and output review surfaces.',
    roles: ['client', 'manager', 'master'],
    impact: 'medium',
    status: 'draft-ready'
  },
  {
    id: 'theme-token-strip',
    type: 'theme',
    title: 'Triad theme token strip',
    region: 'system',
    description: 'Controls approved token families for Client/Auth Aurora, Manager Graphite, and Master Executive.',
    roles: ['master'],
    impact: 'medium',
    status: 'guarded'
  },
  {
    id: 'ai-proposal-gate',
    type: 'ai-proposal',
    title: 'AI proposal gate',
    region: 'system',
    description: 'Turns AI requests into risk-scored draft proposals with rollback metadata and guard requirements.',
    roles: ['master'],
    impact: 'high',
    status: 'guarded',
    locked: true
  }
];

export const INITIAL_HOLOGRAM_NAV_ITEMS: HologramNavItem[] = [
  { id: 'nav-monitoring', label: 'Monitoring', route: '/master', roles: ['master'], enabled: true, locked: true },
  { id: 'nav-accounts', label: 'All accounts', route: '/master/accounts', roles: ['master'], enabled: true, locked: true },
  { id: 'nav-workspaces', label: 'Workspaces', route: '/master/workspaces', roles: ['master'], enabled: true },
  { id: 'nav-ui-workspace', label: 'UI workspace', route: '/master/ui-workspace', roles: ['master'], enabled: true },
  { id: 'nav-reports', label: 'Reports', route: '/master/reports', roles: ['master'], enabled: true },
  { id: 'nav-audit', label: 'Audit log', route: '/master/audit', roles: ['master'], enabled: true },
  { id: 'nav-system', label: 'System health', route: '/master/system', roles: ['master'], enabled: true }
];

export const HOLOGRAM_THEME_TOKENS: HologramThemeToken[] = [
  { key: '--x-triad-client-accent', label: 'Client/Auth Aurora accent', value: '#2563eb', scope: 'client', editable: true },
  { key: '--x-triad-manager-accent', label: 'Manager Graphite accent', value: '#0f766e', scope: 'manager', editable: true },
  { key: '--x-triad-master-accent', label: 'Master Executive accent', value: '#4f46e5', scope: 'master', editable: true },
  { key: '--x-surface-radius', label: 'Unified card radius', value: '24px', scope: 'global', editable: true },
  { key: '--x-chip-height', label: 'Compact chip height', value: '32px', scope: 'global', editable: true },
  { key: '--x-float-y', label: 'Global float lift', value: '-1px', scope: 'global', editable: true }
];

export const HOLOGRAM_GUARD_COMMANDS = [
  'node scripts/master-ui-workspace-guard.mjs',
  'node scripts/unified-surface-contract-guard.mjs',
  'node scripts/theme-governance-contract-guard.mjs',
  'node scripts/instant-performance-guard.mjs',
  'npm run layout:guard',
  'npm run responsive:guard',
  'npm run typecheck',
  'npm run build'
];

export function moveHologramBlock(blocks: HologramBlock[], activeId: string, overId: string) {
  if (activeId === overId) return blocks;
  const activeIndex = blocks.findIndex((block) => block.id === activeId);
  const overIndex = blocks.findIndex((block) => block.id === overId);
  if (activeIndex < 0 || overIndex < 0) return blocks;
  const active = blocks[activeIndex];
  if (active.locked) return blocks;
  const next = [...blocks];
  next.splice(activeIndex, 1);
  next.splice(overIndex, 0, active);
  return next;
}
