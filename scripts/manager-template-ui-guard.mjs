#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const checks = [];
function read(path) { const ok = existsSync(path); checks.push({ ok, label: `file exists: ${path}` }); return ok ? readFileSync(path, 'utf8') : ''; }
function has(file, term, label) { checks.push({ ok: file.includes(term), label }); }

const workspace = read('components/LetterGeneratorWorkspaceV2.tsx');
const progressive = read('components/TemplateProgressiveWorkspace.tsx');
const patcher = read('scripts/apply-manager-template-ui-wiring.mjs');
const manifest = read('lib/generation-manifest.ts');
const status = read('docs/manager-template-scope-implementation-status.md');
const page = read('app/system/manager-templates/page.tsx');

has(workspace, 'managerTemplateScope', 'workspace tracks manager template scope');
has(workspace, 'MANAGER_TEMPLATE_ASSET', 'workspace uses manager template source');
has(progressive, 'Manager controls default templates', 'template UI explains manager defaults');
has(patcher, 'Read-only client mode', 'patcher locks client template UI');
has(manifest, 'managerTemplateProvenance', 'manifest records manager provenance');
has(status, 'Roadmap status', 'status doc reports roadmap state');
has(page, 'Manager template library', 'manager template page exists');

checks.forEach((check) => console.log(`${check.ok ? '✅' : '❌'} ${check.label}`));
const failed = checks.filter((check) => !check.ok);
if (failed.length) process.exit(1);
console.log(`\nManager template UI guard passed: ${checks.length} check(s).`);
