#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';

const file = 'components/GuidedSourceDataFlow.tsx';
let source = readFileSync(file, 'utf8');
const before = source;

source = source.replace("type Stage = 'SOURCE' | 'REVIEW' | 'EVIDENCE' | 'GENERATE';", "type Stage = 'SOURCE' | 'REVIEW' | 'EVIDENCE';");
source = source.replace("  const blocked = !canGenerate || !evidenceReady || !affidavitReady || !customReady || (strict && missingLetters.length > 0) || !scopeConfirmed;\n", "  const blocked = !canGenerate || !evidenceReady || !affidavitReady || !customReady || (strict && missingLetters.length > 0) || !scopeConfirmed;\n");

source = source.replace(
`  function confirmEvidence() {
    if (!evidenceReady) {
      onMessage('Supporting Documents are required. Upload at least one evidence image to continue.');
      return;
    }
    showStage('GENERATE');
    onMessage('Supporting Documents confirmed. Review routes and generate the package.');
  }
`,
`  function confirmEvidence() {
    if (!evidenceReady) {
      onMessage('Supporting Documents are required. Upload at least one evidence image to continue.');
      return;
    }
    if (blocked) {
      onMessage('Review packet scope, required templates, and supporting documents before generating.');
      return;
    }
    void onGenerate();
  }
`
);

source = source.replace(
`<button type="button" className="action-button" disabled={!evidenceReady} onClick={confirmEvidence}>Continue to Generate</button>`,
`<button type="button" className="action-button" aria-disabled={blocked || busy} disabled={busy || !evidenceReady} onClick={confirmEvidence}>{busy ? 'Generating packet…' : 'Generate Ordered Review Package'}</button>`
);

source = source.replace(/\n\s*\{stage === 'GENERATE' && <section[\s\S]*?\n\s*\}(<\/div>;\n\})/m, '\n  $1');

if (source !== before) {
  writeFileSync(file, source);
  console.log('Removed duplicated Step 04 Generate stage and moved generation action to Evidence step.');
} else {
  console.log('Duplicate generate stage removal not needed.');
}
