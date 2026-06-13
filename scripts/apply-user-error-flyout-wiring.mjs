#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const workspacePath = 'components/LetterGeneratorWorkspaceV2.tsx';

function replaceOnce(source, from, to, label) {
  if (!source.includes(from)) return source;
  console.log(`Applied user-error flyout wiring: ${label}`);
  return source.replace(from, to);
}

function ensureImport(source, anchor, importLine, label) {
  if (source.includes(importLine)) return source;
  return replaceOnce(source, anchor, `${anchor}\n${importLine}`, label);
}

function main() {
  if (!existsSync(workspacePath)) {
    console.log('User-error flyout wiring skipped: workspace file not found.');
    return;
  }

  let source = readFileSync(workspacePath, 'utf8');
  const before = source;

  source = ensureImport(
    source,
    "import TemplateProgressiveWorkspace from './TemplateProgressiveWorkspace';",
    "import UserErrorFlyout from './UserErrorFlyout';",
    'component import'
  );

  source = ensureImport(
    source,
    "import { buildGenerationManifest, generationManifestText, normalizeGeneratedOutputForManifest, type GenerationManifest } from '../lib/generation-manifest';",
    "import { explainWebsiteError, type UserFacingError } from '../lib/user-facing-error';",
    'error classifier import'
  );

  source = replaceOnce(
    source,
    "  const [statusTone, setStatusTone] = useState<StatusTone>('info');\n",
    "  const [statusTone, setStatusTone] = useState<StatusTone>('info');\n  const [activeError, setActiveError] = useState<UserFacingError | null>(null);\n",
    'active error state'
  );

  source = replaceOnce(
    source,
    "  function report(message: string, tone: StatusTone = 'info') { setStatus(message); setStatusTone(tone); }\n",
    "  function report(message: string, tone: StatusTone = 'info') {\n    setStatus(message);\n    setStatusTone(tone);\n    if (tone === 'error') {\n      setActiveError(explainWebsiteError(message, { operation: 'Workspace action', round, panel }));\n    } else if (tone === 'success') {\n      setActiveError(null);\n    }\n  }\n",
    'error-aware report function'
  );

  source = replaceOnce(
    source,
    "  async function generate() {\n    setGenerateAttempted(true);\n",
    "  async function generate() {\n    setGenerateAttempted(true);\n    setActiveError(null);\n",
    'clear previous error on generate'
  );

  source = replaceOnce(
    source,
    "  return <main className=\"app-shell\">",
    "  return <><main className=\"app-shell\">",
    'fragment wrapper start'
  );

  source = replaceOnce(
    source,
    "</section></main>;\n}",
    "</section></main><UserErrorFlyout issue={activeError} onClose={() => setActiveError(null)} onNavigate={(target) => { setPanel(target); setActiveError(null); }} /></>;\n}",
    'flyout render mount'
  );

  if (source !== before) {
    writeFileSync(workspacePath, source);
    console.log('User-error flyout wiring complete.');
  } else {
    console.log('User-error flyout wiring already present.');
  }
}

main();
