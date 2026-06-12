#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';

const file = 'components/DashboardOperationsWorkspace.tsx';
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
    "'use client';\n\n",
    "'use client';\n\nimport OutputLimitResetChip from './OutputLimitResetChip';\n",
    'visible dashboard chip import'
  );
}

replaceText(
  '<section className="panel dashboard-command-card dashboard-command-single compact-dashboard-command">',
  '<section className="panel dashboard-command-card dashboard-command-single compact-dashboard-command dashboard-command-integrated-limit">',
  'visible dashboard command shell'
);

replaceText(
  '        <p className="eyebrow">Command Center</p>\n        <h2>{primary.title}</h2>\n        <p>{primary.copy}</p>\n        <div className="dashboard-command-actions">',
  '        <div className="dashboard-command-header-row"><div><p className="eyebrow">Command Center</p><h2>{primary.title}</h2><p>{primary.copy}</p></div><OutputLimitResetChip /></div>\n        <div className="dashboard-command-actions">',
  'visible dashboard command header chip'
);

if (changed) writeFileSync(file, source);
else console.log('Dashboard visible output chip repair not needed.');
