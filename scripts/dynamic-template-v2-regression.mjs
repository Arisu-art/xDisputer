#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const checks = [];

function assertFile(path) {
  const ok = existsSync(path);
  checks.push({ ok, label: `file exists: ${path}` });
  return ok ? readFileSync(path, 'utf8') : '';
}

function assertIncludes(content, needle, label) {
  checks.push({ ok: content.includes(needle), label });
}

function assertNotMatches(content, pattern, label) {
  checks.push({ ok: !pattern.test(content), label });
}

const registry = assertFile('lib/dynamic-template/field-registry.ts');
const contract = assertFile('lib/dynamic-template/contract-v2.ts');
const mapping = assertFile('lib/dynamic-template/mapping-engine.ts');
const renderer = assertFile('lib/dynamic-template/docx-layout-renderer-v2.ts');
const validation = assertFile('lib/dynamic-template/render-validation.ts');
const rendererMode = assertFile('lib/dynamic-template/renderer-mode.ts');
const uploadRoute = assertFile('app/api/template-assets/route.ts');
const preflight = assertFile('lib/preflight-validation.ts');

for (const term of ['DISPUTE_LETTER', 'LATE_PAYMENT_LETTER', 'AFFIDAVIT', 'FTC', 'FCRA', 'ATTACHMENT']) {
  assertIncludes(registry, term, `field registry covers ${term}`);
}

for (const term of ['client.name', 'client.addressLines', 'letter.date', 'bureau.name', 'accounts.dispute', 'accounts.latePayments', 'affidavit.state', 'affidavit.county', 'ftc.reportNumber', 'ftc.statement']) {
  assertIncludes(registry, term, `canonical field exists: ${term}`);
}

for (const term of ['TABLE_ROW_PROTOTYPE', 'HEADER', 'FOOTER', 'unsupportedZones', 'missingFields', 'unknownPlaceholders']) {
  assertIncludes(contract, term, `contract-v2 detects ${term}`);
}

for (const term of ['INLINE_REPLACE', 'MULTILINE_REPLACE', 'REPEAT_BLOCK', 'TABLE_ROW_CLONE', 'CONDITIONAL_SECTION', 'STATIC_INSERT']) {
  assertIncludes(mapping, term, `render plan supports ${term}`);
}

for (const term of ['assertDocxLayoutRendererV2Allowed', 'TABLE_ROW_PATTERN', 'cloneTableRowOperation', 'preserving surrounding DOCX XML', 'skippedOperations']) {
  assertIncludes(renderer, term, `renderer-v2 foundation includes ${term}`);
}

for (const term of ['TEXT_NODE_PATTERN', 'replaceSplitAlias', 'split-run', 'cloneParagraphBlockOperation', 'paragraph-block-clone', 'replaceConditionalOperation', 'conditional-removed', 'conditional-kept']) {
  assertIncludes(renderer, term, `renderer-v2 handles ${term}`);
}

for (const term of ['scanUnresolvedPlaceholders', 'unresolvedRequiredPlaceholders', 'dynamicTemplateRenderValidationManifest', 'mutatedPartCount']) {
  assertIncludes(validation, term, `render validation includes ${term}`);
}

assertIncludes(rendererMode, "'CONTRACT_V2_DIAGNOSTIC'", 'renderer mode defaults to diagnostics path');
assertIncludes(rendererMode, 'DOCX_LAYOUT_V2', 'renderer mode has explicit DOCX_LAYOUT_V2 gate');
assertIncludes(uploadRoute, 'autoBackfillDynamicTemplateV2', 'template GET route auto-backfills missing v2 metadata');
assertIncludes(uploadRoute, 'validation_json: validationJson', 'template upload stores validation_json');
assertIncludes(preflight, 'preferDynamicV2', 'preflight can prefer v2 readiness checks');
assertIncludes(renderer, 'allMatches(', 'renderer-v2 uses ES5-safe matchAll wrapper');
assertNotMatches(renderer, /for\s*\([^)]*\s+of\s+[^)]*\.matchAll\s*\(/, 'renderer-v2 does not iterate directly over matchAll results');

const failed = checks.filter((check) => !check.ok);

for (const check of checks) {
  console.log(`${check.ok ? '✅' : '❌'} ${check.label}`);
}

if (failed.length) {
  console.error(`\nDynamic Template Engine v2 regression guard failed: ${failed.length} check(s) failed.`);
  process.exit(1);
}

console.log(`\nDynamic Template Engine v2 regression guard passed: ${checks.length} check(s).`);
