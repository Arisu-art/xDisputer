import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function write(relativePath, value) {
  fs.writeFileSync(path.join(root, relativePath), value);
}

function save(relativePath, before, after) {
  if (before !== after) {
    write(relativePath, after);
    console.log(`Phase 14 guardrails repaired ${relativePath}.`);
  }
}

function collapseRepeatedExact(source, repeated, single) {
  let next = source;
  while (next.includes(repeated)) next = next.replace(repeated, single);
  return next;
}

function collapseRepeatedRegex(source, pattern, single) {
  let next = source;
  let previous = '';
  while (previous !== next) {
    previous = next;
    next = next.replace(pattern, single);
  }
  return next;
}

function guardTemplateAssetsRoute() {
  const file = 'app/api/template-assets/route.ts';
  let source = read(file);
  const before = source;

  if (source.includes('buildTemplateGovernance(contract)') && !source.includes("../../../lib/template-governance")) {
    source = source.replace(
      "import { inspectTemplateContract, templateContractGateMessage, type TemplateDocumentKind } from '../../../lib/template-contracts';",
      "import { inspectTemplateContract, templateContractGateMessage, type TemplateDocumentKind } from '../../../lib/template-contracts';\nimport { buildTemplateGovernance } from '../../../lib/template-governance';"
    );
    source = source.replace(
      "import { inspectTemplateContract, type TemplateDocumentKind } from '../../../lib/template-contracts';",
      "import { inspectTemplateContract, type TemplateDocumentKind } from '../../../lib/template-contracts';\nimport { buildTemplateGovernance } from '../../../lib/template-governance';"
    );
  }

  save(file, before, source);
}

function guardGenerationRunsRoute() {
  const file = 'app/api/generation-runs/route.ts';
  let source = read(file);
  const before = source;

  const snapshotBlock = `    const sourceSnapshot = body?.sourceSnapshot ?? body?.source ?? null;
    const templateSnapshot = body?.templateSnapshot ?? body?.template ?? null;
    const rulesSnapshot = body?.rulesSnapshot ?? body?.rules ?? null;
    const outputSnapshot = body?.outputSnapshot ?? body?.output ?? null;
`;

  const first = source.indexOf(snapshotBlock);
  if (first >= 0) {
    let searchFrom = first + snapshotBlock.length;
    let duplicateAt = source.indexOf(snapshotBlock, searchFrom);
    while (duplicateAt >= 0) {
      source = source.slice(0, duplicateAt) + source.slice(duplicateAt + snapshotBlock.length);
      searchFrom = first + snapshotBlock.length;
      duplicateAt = source.indexOf(snapshotBlock, searchFrom);
    }
  }

  save(file, before, source);
}

function guardGuidedSourceDataFlow() {
  const file = 'components/GuidedSourceDataFlow.tsx';
  let source = read(file);
  const before = source;

  source = collapseRepeatedRegex(source, /(?:generationBlockers\?: string\[\];\s*){2,}/g, 'generationBlockers?: string[]; ');
  source = collapseRepeatedRegex(source, /(?:generationBlockers = \[\],\s*){2,}/g, 'generationBlockers = [], ');
  source = collapseRepeatedRegex(source, /(?:aria-describedby=\{blocked \? "generation-blocked-reasons" : undefined\}\s*){2,}/g, 'aria-describedby={blocked ? "generation-blocked-reasons" : undefined} ');

  if (source.includes('generationBlockers') && !source.includes('generationBlockReasons')) {
    source = source.replace(
      '  const blocked = !canGenerate || !evidenceReady || !affidavitReady || !customReady || (strict && missingLetters.length > 0);\n  const showStage',
      '  const blocked = !canGenerate || !evidenceReady || !affidavitReady || !customReady || (strict && missingLetters.length > 0);\n  const generationBlockReasons = Array.from(new Set([...generationBlockers, ...(!evidenceReady ? [\'Upload at least one supporting document image.\'] : []), ...(!affidavitReady ? [\'Review affidavit state and county before generating.\'] : []), ...(!customReady ? [\'Complete required template fields before generating.\'] : []), ...(strict && missingLetters.length ? [\'Required letter template missing: \' + missingLetters.join(\', \') + \'.\'] : [])].filter(Boolean))).slice(0, 8);\n  const showStage'
    );
  }

  save(file, before, source);
}

function guardWorkspaceV2() {
  const file = 'components/LetterGeneratorWorkspaceV2.tsx';
  let source = read(file);
  const before = source;

  source = collapseRepeatedExact(
    source,
    'generationBlockers={preflight.blockers.map((item) => item.detail)} generationBlockers={preflight.blockers.map((item) => item.detail)}',
    'generationBlockers={preflight.blockers.map((item) => item.detail)}'
  );
  source = source.replace("recipientAddressLines: recipient.address.split('\\n')", "recipientAddressLines: bureauInfo[bureau].address.split('\\n')");
  source = source.replace("address.split('\n'), source: affidavitSource", "address.split('\\n'), source: affidavitSource");

  save(file, before, source);
}

guardTemplateAssetsRoute();
guardGenerationRunsRoute();
guardGuidedSourceDataFlow();
guardWorkspaceV2();
console.log('Phase 14 build guardrails complete.');
