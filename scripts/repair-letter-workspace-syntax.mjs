#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';

const file = 'components/LetterGeneratorWorkspaceV2.tsx';
let source = readFileSync(file, 'utf8');
const before = '[round, caseId, parsed.name, routes, effectiveRefs, templates: effectiveTemplates, evidence, preflight, docs.length, orderedZip, filings.length]';
const after = '[round, caseId, parsed.name, routes, effectiveRefs, effectiveTemplates, evidence, preflight, docs.length, orderedZip, filings.length]';

if (source.includes(before)) {
  source = source.replace(before, after);
  writeFileSync(file, source);
  console.log('Repaired LetterGeneratorWorkspaceV2 dependency array.');
} else {
  console.log('LetterGeneratorWorkspaceV2 syntax repair not needed.');
}
