#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const path = 'components/ManagerTemplateWorkspaceClient.tsx';
if (!existsSync(path)) process.exit(0);
const before = readFileSync(path, 'utf8');
let source = before;

function ensureImport(anchor, line) {
  if (source.includes(line)) return;
  if (!source.includes(anchor)) throw new Error(`Missing import anchor: ${anchor}`);
  source = source.replace(anchor, `${anchor}\n${line}`);
}

ensureImport("import TemplateProgressiveWorkspace from './TemplateProgressiveWorkspace';", "import ManagerTemplateLibraryStatus from './ManagerTemplateLibraryStatus';");
source = source.replace("import { defaultReferences, rounds, type LetterReference, type Round } from '../lib/reference-store';", "import { defaultReferences, type LetterReference, type Round } from '../lib/reference-store';");

source = source.replace(
  "  async function handleRemoveLetter() { await loadAssets(round); }\n  async function handleExhibitsChange() { await loadAssets(round); }",
  "  async function handleRemoveLetter() { /* TemplatePacketConfigurator refreshes through onTemplateMutation after delete. */ }\n  async function handleExhibitsHydrated() { /* Hydration does not reload Supabase assets. */ }\n  async function handleTemplateMutation() { await loadAssets(round); }"
);

source = source.replace(
  'onExhibitsChange={handleExhibitsChange}',
  'onExhibitsChange={handleExhibitsHydrated} onTemplateMutation={handleTemplateMutation}'
);

source = source.replace(
  "    <section className=\"admin-monitor-card manager-template-workflow-status\"><strong>{loading ? 'Loading manager template library…' : 'Manager template workflow ready'}</strong><span>{message}</span></section>\n    <TemplateProgressiveWorkspace",
  "    <section className=\"admin-monitor-card manager-template-workflow-status\"><strong>{loading ? 'Loading manager template library…' : 'Manager template workflow ready'}</strong><span>{message}</span></section>\n    <ManagerTemplateLibraryStatus round={round} assets={assets} loading={loading} />\n    <TemplateProgressiveWorkspace"
);

if (!source.includes('ManagerTemplateLibraryStatus')) throw new Error('ManagerTemplateLibraryStatus not wired.');
if (!source.includes('managerTemplateScope={managerTemplateScope}')) throw new Error('Verified manager template scope is not passed through.');
if (source.includes('canManageTemplates: true')) throw new Error('Fake writable manager template scope fallback remains.');
if (!source.includes('handleExhibitsHydrated')) throw new Error('Managed exhibit hydration callback is not wired.');
if (!source.includes('handleTemplateMutation')) throw new Error('Template mutation refresh callback is not wired.');
if (source.includes('async function handleExhibitsChange() { await loadAssets(round); }')) throw new Error('Hydration still reloads manager assets.');

if (source !== before) {
  writeFileSync(path, source);
  console.log('Applied manager template workspace state wiring.');
} else {
  console.log('Manager template workspace state wiring already present.');
}
