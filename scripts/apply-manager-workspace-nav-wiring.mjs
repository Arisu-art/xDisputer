#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const path = 'app/admin/page.tsx';
if (!existsSync(path)) process.exit(0);
const before = readFileSync(path, 'utf8');
let source = before;
const link = '          <ConsoleNavLink href="/manager-workspace">Manager workspace</ConsoleNavLink>\n';
if (!source.includes('href="/manager-workspace"')) {
  source = source.replace('          <ManagerSidebarLink panel="monitoring" activePanel={activePanel}>Monitoring</ManagerSidebarLink>\n', `          <ManagerSidebarLink panel="monitoring" activePanel={activePanel}>Monitoring</ManagerSidebarLink>\n${link}`);
}
if (source !== before) {
  writeFileSync(path, source);
  console.log('Applied manager workspace navigation wiring.');
} else {
  console.log('Manager workspace navigation wiring already present.');
}
