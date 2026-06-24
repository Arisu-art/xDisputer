#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const read = (file) => existsSync(file) ? readFileSync(file, 'utf8') : (failures.push(`missing ${file}`), '');
const must = (file, marker, message) => { if (!read(file).includes(marker)) failures.push(message); };
const mustNot = (file, marker, message) => { if (read(file).includes(marker)) failures.push(message); };

must('lib/saas/display-terminology.ts', 'productionFriendlyAccountText', 'central production terminology helper is required');
must('components/console/AccountMenu.tsx', 'Disputer workspace account', 'account menu must label client role as Disputer');
must('components/console/AccountMenu.tsx', 'Account type', 'account menu must show Account type instead of raw access role');
must('components/shell/ClientMenuPopover.tsx', 'Disputer workspace menu', 'client menu popover must show Disputer workspace menu');
must('components/WorkspaceSettingsPanel.tsx', 'Disputer-safe settings only', 'settings page must use production Disputer-safe copy');
must('components/ClientCenterWorkspace.tsx', 'Disputer Center', 'workspace center must be labeled Disputer Center');
must('components/LetterGeneratorWorkspaceV2.tsx', 'Disputer Center', 'main workspace must route to Disputer Center');
must('app/admin/clients/page.tsx', 'Assigned Disputers', 'manager account table must use Disputer wording');
must('app/master/accounts/page.tsx', 'Disputer assignment', 'master clients view card must be Disputer assignment, not client limits');

for (const file of [
  'components/console/AccountMenu.tsx',
  'components/shell/ClientMenuPopover.tsx',
  'components/WorkspaceSettingsPanel.tsx',
  'components/ClientCenterWorkspace.tsx',
  'components/LetterGeneratorWorkspaceV2.tsx',
  'app/admin/clients/page.tsx',
  'app/master/accounts/page.tsx'
]) {
  mustNot(file, 'Client workspace account', `${file} exposes old Client workspace account copy`);
  mustNot(file, 'Client packet workspace', `${file} exposes old Client packet workspace copy`);
  mustNot(file, 'Client account context', `${file} exposes old Client account context copy`);
  mustNot(file, 'client user', `${file} exposes client user copy`);
  mustNot(file, 'backend role', `${file} exposes backend role copy`);
  mustNot(file, 'backend access', `${file} exposes backend access copy`);
  mustNot(file, 'Assigned clients', `${file} exposes old Assigned clients copy`);
  mustNot(file, 'Client records', `${file} exposes old Client records copy`);
  mustNot(file, 'Client Center', `${file} exposes old Client Center copy`);
}

if (failures.length) {
  console.error(`user-facing-terminology-guard failed: ${failures.length} issue(s).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('user-facing-terminology-guard: ok');
