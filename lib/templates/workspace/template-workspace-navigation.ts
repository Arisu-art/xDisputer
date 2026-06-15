export type TemplateWorkspaceNavId = 'template-library' | 'template-studio' | 'generation-engine';

export type TemplateWorkspaceProcess = 'template-source-of-truth' | 'template-authoring-rules' | 'template-execution-control';

export type TemplateWorkspaceNavItem = {
  id: TemplateWorkspaceNavId;
  label: string;
  shortLabel: string;
  href: string;
  process: TemplateWorkspaceProcess;
  description: string;
  owns: string[];
  doesNotOwn: string[];
};

export const TEMPLATE_WORKSPACE_NAV_ITEMS: TemplateWorkspaceNavItem[] = [
  {
    id: 'template-library',
    label: 'Template Library',
    shortLabel: 'Library',
    href: '/manager-workspace',
    process: 'template-source-of-truth',
    description: 'Upload, assign, version, and sync manager templates to client workspaces.',
    owns: ['template upload', 'round selection', 'template versions', 'client assignment coverage', 'sync readiness'],
    doesNotOwn: ['parser rules', 'canonical mapping editor', 'release automation', 'client monitoring']
  },
  {
    id: 'template-studio',
    label: 'Template Studio',
    shortLabel: 'Studio',
    href: '/manager-workspace/studio',
    process: 'template-authoring-rules',
    description: 'Control parser, renderer, variables, canonical mappings, entities, static preservation, and table rules.',
    owns: ['parser rules', 'preserve static text', 'canonical field mapping', 'variables and entities', 'table layout logic', 'conflict resolution'],
    doesNotOwn: ['client approval monitoring', 'release execution', 'master governance', 'account settings']
  },
  {
    id: 'generation-engine',
    label: 'Generation Engine',
    shortLabel: 'Engine',
    href: '/manager-workspace/engine',
    process: 'template-execution-control',
    description: 'Preview, validate, release, and diagnose dynamic template generation.',
    owns: ['generation preview', 'renderer diagnostics', 'release readiness', 'automation safety', 'engine logs', 'rollback proof'],
    doesNotOwn: ['raw mapping editing', 'account settings', 'client approval monitoring', 'template upload']
  }
];

export function templateWorkspaceNavForPath(pathname: string) {
  return TEMPLATE_WORKSPACE_NAV_ITEMS.map((item) => ({
    href: item.href,
    label: item.shortLabel,
    active: item.href === '/manager-workspace' ? pathname === '/manager-workspace' : pathname.startsWith(item.href)
  }));
}

export function getTemplateWorkspaceNavItem(id: TemplateWorkspaceNavId) {
  return TEMPLATE_WORKSPACE_NAV_ITEMS.find((item) => item.id === id) || null;
}

export function assertTemplateWorkspaceNavContract() {
  const required = new Set<TemplateWorkspaceNavId>(['template-library', 'template-studio', 'generation-engine']);
  const labels = new Set<string>();
  const errors: string[] = [];
  TEMPLATE_WORKSPACE_NAV_ITEMS.forEach((item) => {
    required.delete(item.id);
    if (labels.has(item.label)) errors.push(`duplicate template workspace label: ${item.label}`);
    labels.add(item.label);
    if (!item.owns.length) errors.push(`${item.label} must own at least one process.`);
    if (!item.doesNotOwn.length) errors.push(`${item.label} must declare boundaries.`);
  });
  required.forEach((id) => errors.push(`missing template workspace nav item: ${id}`));
  if (TEMPLATE_WORKSPACE_NAV_ITEMS.length !== 3) errors.push('manager workspace navigation must have exactly 3 functional hubs.');
  return errors;
}
