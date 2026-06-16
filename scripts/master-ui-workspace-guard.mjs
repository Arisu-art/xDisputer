import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const read = (path) => existsSync(path) ? readFileSync(path, 'utf8') : (failures.push(`Missing ${path}`), '');
const has = (path, text, message) => { if (!read(path).includes(text)) failures.push(message); };
const not = (path, text, message) => { if (read(path).includes(text)) failures.push(message); };

has('app/master/ui-workspace/page.tsx', "requireRole('master')", 'master UI workspace must require master role');
has('app/master/ui-workspace/page.tsx', 'MasterHologramWorkspaceShell', 'master UI workspace route must render the workspace shell');
has('app/master/ui-workspace/loading.tsx', 'ConsoleInstantLoading', 'master UI workspace must use instant loading shell');
has('app/layout.tsx', "import './master-hologram-workspace.css';", 'root layout must import hologram workspace CSS');
has('components/master-ui-workspace/MasterHologramWorkspaceShell.tsx', "'use client'", 'workspace shell must be a client component for local mode and drag state');
has('components/master-ui-workspace/MasterHologramWorkspaceShell.tsx', 'useTransition', 'workspace mode switching must use transition-ready state');
has('components/master-ui-workspace/MasterHologramWorkspaceShell.tsx', 'draggable={!block.locked', 'workspace must support guarded drag behavior');
has('components/master-ui-workspace/MasterHologramWorkspaceShell.tsx', 'data-hologram-workspace="true"', 'workspace debug marker missing');
has('components/master-ui-workspace/MasterHologramWorkspaceShell.tsx', 'AI Proposal Gate', 'AI proposal feature card missing');
has('lib/master-ui-workspace/model.ts', 'HOLOGRAM_MODES', 'hologram modes model missing');
has('lib/master-ui-workspace/model.ts', 'INITIAL_HOLOGRAM_BLOCKS', 'hologram blocks model missing');
has('lib/master-ui-workspace/model.ts', 'INITIAL_HOLOGRAM_NAV_ITEMS', 'hologram nav model missing');
has('lib/master-ui-workspace/model.ts', 'HOLOGRAM_THEME_TOKENS', 'hologram token model missing');
has('lib/master-ui-workspace/model.ts', 'moveHologramBlock', 'hologram move helper missing');
has('app/master-hologram-workspace.css', '--x-hologram-ready: ready', 'hologram CSS readiness token missing');
has('app/master-hologram-workspace.css', '.hologram-mode-strip', 'hologram mode strip styles missing');
has('app/master-hologram-workspace.css', '.hologram-block', 'hologram block styles missing');
has('app/master-hologram-workspace.css', '.hologram-inspector', 'hologram inspector styles missing');
has('app/master/MasterConsoleHome.tsx', "'/master/ui-workspace'", 'master home navigation must include UI workspace');
has('app/master/accounts/page.tsx', "'/master/ui-workspace'", 'master account navigation must include UI workspace');
has('docs/master-ui-ux-switch-mode-workspace-canvas.md', 'Master UI/UX Switch Mode Workspace Canvas', 'workspace canvas document missing');
has('docs/master-ui-ux-switch-mode-workspace-canvas.md', 'What should not happen', 'workspace canvas safeguards missing');
not('components/master-ui-workspace/MasterHologramWorkspaceShell.tsx', 'dangerouslySetInnerHTML', 'workspace must not inject arbitrary HTML');
not('components/master-ui-workspace/MasterHologramWorkspaceShell.tsx', 'eval(', 'workspace must not evaluate user-provided code');
not('app/master-hologram-workspace.css', 'transition-property: all', 'hologram CSS must not transition all properties');
not('app/master-hologram-workspace.css', 'filter: blur', 'hologram CSS must not add blur');

if (failures.length) {
  console.error('Master UI workspace guard failed.');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Master UI workspace guard passed.');
