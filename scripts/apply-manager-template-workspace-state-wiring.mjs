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
  "  async function handleRemoveLetter() { await loadAssets(round); }\n  function handleExhibitsChange(next: TemplateExhibits) { setAssets((current) => current.map((asset) => asset.exhibit_kind && next[asset.exhibit_kind] ? { ...asset, original_filename: next[asset.exhibit_kind]!.name, file_size: next[asset.exhibit_kind]!.size } : asset)); }",
  "  async function handleRemoveLetter() { await loadAssets(round); }\n  async function handleExhibitsChange() { await loadAssets(round); }"
);
source = source.replace(
  "    <section className=\"admin-monitor-card manager-template-workflow-status\"><strong>{loading ? 'Loading manager template library…' : 'Manager template workflow ready'}</strong><span>{message}</span></section>\n    <TemplateProgressiveWorkspace",
  "    <section className=\"admin-monitor-card manager-template-workflow-status\"><strong>{loading ? 'Loading manager template library…' : 'Manager template workflow ready'}</strong><span>{message}</span></section>\n    <ManagerTemplateLibraryStatus round={round} assets={assets} loading={loading} />\n    <TemplateProgressiveWorkspace"
);

if (!source.includes('ManagerTemplateLibraryStatus')) throw new Error('ManagerTemplateLibraryStatus not wired.');
if (!source.includes('async function handleExhibitsChange() { await loadAssets(round); }')) throw new Error('Exhibit changes do not refetch active manager assets.');

if (source !== before) {
  writeFileSync(path, source);
  console.log('Applied manager template workspace state wiring.');
} else {
  console.log('Manager template workspace state wiring already present.');
}
