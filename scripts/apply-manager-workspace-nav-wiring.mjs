#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

function writeIfChanged(path, before, after, label) {
  if (before === after) {
    console.log(`${label} already present.`);
    return;
  }
  writeFileSync(path, after);
  console.log(`Applied ${label}.`);
}

function ensureImport(source, anchor, line) {
  if (source.includes(line)) return source;
  return source.replace(anchor, `${anchor}\n${line}`);
}

function removeImport(source, line) {
  return source.replace(`${line}\n`, '').replace(`\n${line}`, '');
}

function wireVisibleSwitchStylesheet() {
  const path = 'app/layout.tsx';
  if (!existsSync(path) || !existsSync('app/manager-switch-visible.css')) return;
  const before = readFileSync(path, 'utf8');
  let source = before;
  source = ensureImport(source, "import './professional-console-layout.css';", "import './manager-switch-visible.css';");
  writeIfChanged(path, before, source, 'manager switch visibility stylesheet import');
}

function wireAdminPage() {
  const path = 'app/admin/page.tsx';
  if (!existsSync(path)) return;
  const before = readFileSync(path, 'utf8');
  let source = before;

  if (source.includes('ManagerConsoleShell')) {
    source = removeImport(source, "import ManagerWorkspaceSwitch from '../../components/ManagerWorkspaceSwitch';");
    source = source.replace("    { href: '/manager-workspace', label: 'Manager workspace' },\n", '');
    if (!source.includes("kind: 'workspace-switch'")) {
      source = source.replace(
        "    { href: '/admin/audit', label: 'Audit log' }",
        "    { href: '/admin/audit', label: 'Audit log' },\n    { href: '/manager-workspace', label: 'Switch mode', kind: 'workspace-switch' as const }"
      );
    }
    writeIfChanged(path, before, source, 'canonical manager workspace switch on /admin via shared shell');
    return;
  }

  source = ensureImport(source, "import ConsoleNavLink from '../../components/ConsoleNavLink';", "import ManagerWorkspaceSwitch from '../../components/ManagerWorkspaceSwitch';");
  if (!source.includes('<ManagerWorkspaceSwitch />')) {
    source = source.replace('<div className="admin-monitor-account">', '<ManagerWorkspaceSwitch /><div className="admin-monitor-account">');
  }
  writeIfChanged(path, before, source, 'manager workspace switch on /admin');
}

function wireAdminAccessPage() {
  const path = 'app/admin/access/page.tsx';
  if (!existsSync(path)) return;
  const before = readFileSync(path, 'utf8');
  let source = before;
  source = ensureImport(source, "import ConsoleNavLink from '../../../components/ConsoleNavLink';", "import ManagerWorkspaceSwitch from '../../../components/ManagerWorkspaceSwitch';");
  if (!source.includes('<ManagerWorkspaceSwitch />')) {
    source = source.replace('<div className="admin-monitor-account">', '<ManagerWorkspaceSwitch /><div className="admin-monitor-account">');
  }
  writeIfChanged(path, before, source, 'manager workspace switch on /admin/access');
}

function wireAuditView() {
  const path = 'components/AccessAuditView.tsx';
  if (!existsSync(path)) return;
  const before = readFileSync(path, 'utf8');
  let source = before;
  source = ensureImport(source, "import ConsoleNavLink from './ConsoleNavLink';", "import ManagerWorkspaceSwitch from './ManagerWorkspaceSwitch';");
  if (!source.includes("{scope === 'manager' && <ManagerWorkspaceSwitch />}")) {
    source = source.replace('{nav(scope)}', "{nav(scope)}\n      {scope === 'manager' && <ManagerWorkspaceSwitch />}");
  }
  writeIfChanged(path, before, source, 'manager workspace switch on audit view');
}

function wireReportView() {
  const path = 'components/GenerationReportView.tsx';
  if (!existsSync(path)) return;
  const before = readFileSync(path, 'utf8');
  let source = before;
  source = ensureImport(source, "import ConsoleNavLink from './ConsoleNavLink';", "import ManagerWorkspaceSwitch from './ManagerWorkspaceSwitch';");
  if (!source.includes("{scope === 'manager' && <ManagerWorkspaceSwitch />}")) {
    source = source.replace('<ReportNavigation scope={scope} />', "<ReportNavigation scope={scope} />{scope === 'manager' && <ManagerWorkspaceSwitch />}");
  }
  writeIfChanged(path, before, source, 'manager workspace switch on reports view');
}

wireVisibleSwitchStylesheet();
wireAdminPage();
wireAdminAccessPage();
wireAuditView();
wireReportView();
