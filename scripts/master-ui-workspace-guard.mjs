import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const read = (path) => existsSync(path) ? readFileSync(path, 'utf8') : (failures.push(`Missing ${path}`), '');
const has = (path, text, message) => { if (!read(path).includes(text)) failures.push(message); };
const not = (path, text, message) => { if (read(path).includes(text)) failures.push(message); };

has('package.json', '"@dnd-kit/core"', 'package.json must install @dnd-kit/core');
has('package.json', '"@dnd-kit/sortable"', 'package.json must install @dnd-kit/sortable');
has('package.json', '"@dnd-kit/modifiers"', 'package.json must install @dnd-kit/modifiers');
has('package.json', '"master-ui-workspace:guard"', 'package.json must expose master UI workspace guard');
has('app/master/ui-workspace/page.tsx', "requireRole('master')", 'master UI workspace must require master role');
has('app/master/ui-workspace/page.tsx', 'MasterHologramWorkspaceShell', 'master UI workspace route must render the workspace shell');
has('app/master/ui-workspace/loading.tsx', 'ConsoleInstantLoading', 'master UI workspace must use instant loading shell');
has('app/layout.tsx', "import './master-hologram-workspace.css';", 'root layout must import hologram workspace CSS');
has('components/master-ui-workspace/MasterHologramWorkspaceShell.tsx', "'use client'", 'workspace shell must be a client component for local mode and drag state');
has('components/master-ui-workspace/MasterHologramWorkspaceShell.tsx', 'DndContext', 'workspace must use dnd-kit DndContext');
has('components/master-ui-workspace/MasterHologramWorkspaceShell.tsx', 'SortableContext', 'workspace must use dnd-kit SortableContext');
has('components/master-ui-workspace/MasterHologramWorkspaceShell.tsx', 'DragOverlay', 'workspace must use dnd-kit DragOverlay');
has('components/master-ui-workspace/MasterHologramWorkspaceShell.tsx', 'PointerSensor', 'workspace must use pointer sensor');
has('components/master-ui-workspace/MasterHologramWorkspaceShell.tsx', 'KeyboardSensor', 'workspace must use keyboard sensor');
has('components/master-ui-workspace/MasterHologramWorkspaceShell.tsx', 'restrictToParentElement', 'workspace must constrain drag to parent');
has('components/master-ui-workspace/MasterHologramWorkspaceShell.tsx', 'useTransition', 'workspace mode switching must use transition-ready state');
has('components/master-ui-workspace/MasterHologramWorkspaceShell.tsx', 'data-hologram-live-preview', 'workspace must expose live preview frame marker');
has('components/master-ui-workspace/MasterHologramWorkspaceShell.tsx', 'updateBlockProp', 'workspace must include live property editing');
has('components/master-ui-workspace/MasterHologramWorkspaceShell.tsx', 'updateBlockBehavior', 'workspace must include live behavior editing');
has('components/master-ui-workspace/MasterHologramWorkspaceShell.tsx', 'addNavigationDraft', 'workspace must support navigation draft creation');
has('components/master-ui-workspace/MasterHologramWorkspaceShell.tsx', 'AI Proposal Gate', 'AI proposal feature card missing');
has('components/master-ui-workspace/SortableHologramBlock.tsx', 'useSortable', 'sortable hologram block must use dnd-kit useSortable');
has('components/master-ui-workspace/SortableHologramBlock.tsx', 'hologram-drag-handle', 'sortable block must expose drag handle');
has('lib/master-ui-workspace/model.ts', 'HOLOGRAM_MODES', 'hologram modes model missing');
has('lib/master-ui-workspace/model.ts', "'content'", 'content studio mode missing');
has('lib/master-ui-workspace/model.ts', "'behavior'", 'behavior studio mode missing');
has('lib/master-ui-workspace/model.ts', "'ai'", 'AI proposal mode missing');
has('lib/master-ui-workspace/model.ts', 'INITIAL_HOLOGRAM_BLOCKS', 'hologram blocks model missing');
has('lib/master-ui-workspace/model.ts', 'INITIAL_HOLOGRAM_NAV_ITEMS', 'hologram nav model missing');
has('lib/master-ui-workspace/model.ts', 'HOLOGRAM_THEME_TOKENS', 'hologram token model missing');
has('lib/master-ui-workspace/model.ts', 'moveHologramBlock', 'hologram move helper missing');
has('lib/master-ui-workspace/model.ts', 'createSuggestedNavItem', 'navigation draft helper missing');
has('app/master-hologram-workspace.css', '--x-hologram-ready: ready', 'hologram CSS readiness token missing');
has('app/master-hologram-workspace.css', '--x-hologram-version: "2.0-dnd-kit-editor"', 'hologram 2.0 CSS version missing');
has('app/master-hologram-workspace.css', '.hologram-mode-strip', 'hologram mode strip styles missing');
has('app/master-hologram-workspace.css', '.hologram-viewport-frame', 'hologram live viewport styles missing');
has('app/master-hologram-workspace.css', '.hologram-drag-overlay', 'hologram drag overlay styles missing');
has('app/master-hologram-workspace.css', '.hologram-inspector', 'hologram inspector styles missing');
has('app/master/MasterConsoleHome.tsx', "'/master/ui-workspace'", 'master home navigation must include UI workspace');
has('app/master/accounts/page.tsx', "'/master/ui-workspace'", 'master account navigation must include UI workspace');
has('docs/master-ui-ux-switch-mode-workspace-canvas.md', 'Master UI/UX Switch Mode Workspace Canvas', 'workspace canvas document missing');
has('docs/master-ui-ux-switch-mode-workspace-canvas.md', 'dnd-kit', 'workspace canvas must document dnd-kit architecture');
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
