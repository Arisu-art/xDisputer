#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';

const file = 'components/LetterGeneratorWorkspaceV2.tsx';
let source = readFileSync(file, 'utf8');
let changed = false;

function replaceText(before, after, label) {
  if (!source.includes(before)) return;
  source = source.split(before).join(after);
  changed = true;
  console.log(`Repaired ${label}.`);
}

if (!source.includes("import OutputLimitResetChip from './OutputLimitResetChip';")) {
  replaceText(
    "import DashboardOperationsWorkspace from './DashboardOperationsWorkspace';",
    "import DashboardOperationsWorkspace from './DashboardOperationsWorkspace';\nimport OutputLimitResetChip from './OutputLimitResetChip';",
    'dashboard output chip import'
  );
}

replaceText(
  "</div>{uxRules.showHeaderNextAction && <CasePipelineStatus stages={pipelineStages} nextAction={pipelineNextAction} status={status} statusTone={statusTone} />}</header>",
  "</div><div className=\"workspace-header-actions\">{panel === 'Dashboard' && <OutputLimitResetChip />}{uxRules.showHeaderNextAction && <CasePipelineStatus stages={pipelineStages} nextAction={pipelineNextAction} status={status} statusTone={statusTone} />}</div></header>",
  'dashboard header output chip placement'
);

if (changed) writeFileSync(file, source);
else console.log('LetterGeneratorWorkspaceV2 header chip repair not needed.');
