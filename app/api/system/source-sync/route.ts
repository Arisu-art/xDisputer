import { existsSync, readFileSync } from 'node:fs';
import { NextResponse } from 'next/server';
import { managerRuntimeSourceSyncSnapshot } from '../../../../lib/manager-runtime-source-sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function read(path: string) {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

export async function GET() {
  const admin = read('app/admin/page.tsx');
  const shell = read('components/ManagerConsoleShell.tsx');
  const switchComponent = read('components/ManagerWorkspaceSwitch.tsx');
  const layout = read('app/layout.tsx');
  const pkg = read('package.json');
  const snapshot = managerRuntimeSourceSyncSnapshot([
    { key: 'admin_explicit_switch_contract', ok: admin.includes("kind: 'workspace-switch'"), label: '/admin declares explicit workspace switch nav item' },
    { key: 'admin_no_plain_nav_duplicate', ok: !admin.includes("label: 'Manager workspace'"), label: '/admin has no duplicate plain Manager workspace nav fallback' },
    { key: 'admin_no_direct_page_switch_duplicate', ok: !admin.includes('data-admin-direct-workspace-switch="true"'), label: '/admin has no duplicate page-level workspace switch panel' },
    { key: 'admin_switch_target', ok: admin.includes("href: '/manager-workspace'"), label: '/admin switch targets /manager-workspace' },
    { key: 'shell_renders_switch_kind', ok: shell.includes("item.kind === 'workspace-switch'"), label: 'ManagerConsoleShell renders explicit workspace-switch items' },
    { key: 'shell_visible_nav_marker', ok: shell.includes('data-manager-shell-nav="true"'), label: 'ManagerConsoleShell marks visible sidebar nav' },
    { key: 'shell_contract_version_marker', ok: shell.includes('MANAGER_SWITCH_CONTRACT_VERSION'), label: 'ManagerConsoleShell embeds runtime contract version' },
    { key: 'shell_no_plain_fallback_duplicate', ok: !shell.includes('data-manager-switch-fallback="true"'), label: 'ManagerConsoleShell has no duplicate plain fallback switch link' },
    { key: 'switch_visible_nav_class', ok: switchComponent.includes('manager-workspace-nav-switch'), label: 'Switch component exposes visible nav CTA class' },
    { key: 'layout_no_runtime_switch_duplicate', ok: !layout.includes('ManagerWorkspaceRuntimeSwitch'), label: 'Root layout has no duplicate floating runtime switch' },
    { key: 'predev_includes_nav_wiring', ok: pkg.includes('apply-manager-workspace-nav-wiring.mjs'), label: 'predev still applies manager nav wiring' }
  ]);

  return NextResponse.json(snapshot, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
      'x-manager-switch-contract': snapshot.contractVersion,
      'x-manager-source-sync': snapshot.allPassed ? 'pass' : 'fail'
    }
  });
}
