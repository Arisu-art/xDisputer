#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const failures = [];
function read(path) {
  if (!existsSync(path)) {
    failures.push(`missing ${path}`);
    return '';
  }
  return readFileSync(path, 'utf8');
}
function must(source, text, label) {
  if (!source.includes(text)) failures.push(label);
}

const sourceStage = read('src/features/source-data/source-stage-model.ts');
const sourceReady = read('src/features/source-data/source-readiness.ts');
const generationReady = read('src/features/generation/readiness.ts');
const evidenceReady = read('src/features/evidence/evidence-readiness.ts');
const templateStatus = read('src/features/templates/template-registry-status.ts');

must(sourceStage, 'activeWorkflowStepForStage', 'source workflow stage mapping must exist');
must(sourceStage, 'inputMethodForSource', 'source input method mapping must exist');
must(sourceReady, 'firstSourceDataReadinessBlocker', 'source readiness blocker must exist');
must(generationReady, 'packetIsReady', 'generation readiness predicate must exist');
must(evidenceReady, 'readEvidenceReadiness', 'evidence readiness predicate must exist');
must(templateStatus, 'summarizeTemplateRegistryStatus', 'template registry status summary must exist');

if (failures.length) {
  console.error(`workflow-split-guard failed: ${failures.length} check(s).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('workflow-split-guard: ok');
