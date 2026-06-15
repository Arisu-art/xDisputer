'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type DebugSnapshot = {
  route: string;
  role: string;
  mode: string;
  renderedShell: string;
  renderedHeader: string;
  renderedSidebar: string;
  renderedAccountMenu: string;
  loadedCssFiles: string[];
  activeLayoutRatio: string;
  gridTemplateColumns: string;
  headerRect: string;
  accountRect: string;
  headerAccountTopDelta: string;
  headerAccountWidthRatio: string;
  detectionMode: string;
};

type TemplateExecutionSnapshot = {
  status: string;
  round: string;
  outputs: number;
  warnings: number;
  engines: string[];
  missingSlots: string[];
  generatedAt: string;
  summary?: string;
};

declare global {
  interface Window {
    __xdisputerDebug?: DebugSnapshot;
    __xdisputerTemplateExecution?: TemplateExecutionSnapshot;
  }
}

function routeLabel(pathname: string, searchParams: ReturnType<typeof useSearchParams>) {
  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function normalizeCssRef(value: string) {
  try {
    const url = new URL(value, window.location.origin);
    return `${url.pathname}${url.search}`;
  } catch {
    return value;
  }
}

function readLoadedCssFiles() {
  const values = new Set<string>();
  for (const node of Array.from(document.querySelectorAll<HTMLElement>('link[rel="stylesheet"], style[data-n-href], style[data-href]'))) {
    const marker = node.getAttribute('href') || node.getAttribute('data-n-href') || node.getAttribute('data-href');
    if (marker) values.add(normalizeCssRef(marker));
  }
  for (const sheet of Array.from(document.styleSheets)) {
    const href = (sheet as CSSStyleSheet).href;
    if (href) values.add(normalizeCssRef(href));
  }
  return Array.from(values).sort();
}

function pickLabel(element: Element | null, fallback: string) {
  if (!element) return 'missing';
  return element.getAttribute('data-console-component') || fallback;
}

function findShellElement() {
  return document.querySelector('[data-console-shell="true"]') || document.querySelector('.admin-monitor-page.native-console');
}

function findMainElement(shell: Element | null) {
  return shell?.querySelector('[data-console-main="true"][data-console-header-grid="true"]')
    || document.querySelector('[data-console-main="true"][data-console-header-grid="true"]')
    || shell?.querySelector('.admin-monitor-main.native-console-main')
    || document.querySelector('.admin-monitor-main.native-console-main');
}

function findHeaderElement(shell: Element | null) {
  return shell?.querySelector('[data-console-header="true"], [data-console-header-primary="true"], .admin-monitor-main > .admin-monitor-header:first-of-type, .admin-monitor-main > .native-command-hero:first-of-type')
    || document.querySelector('[data-console-header="true"], [data-console-header-primary="true"], .admin-monitor-main > .admin-monitor-header:first-of-type, .admin-monitor-main > .native-command-hero:first-of-type');
}

function findSidebarElement(shell: Element | null) {
  return shell?.querySelector('[data-console-sidebar="true"], .admin-monitor-sidebar.native-console-sidebar')
    || document.querySelector('[data-console-sidebar="true"], .admin-monitor-sidebar.native-console-sidebar');
}

function findAccountElement(shell: Element | null) {
  return shell?.querySelector('[data-console-account-menu="true"], [data-manager-account-menu="true"], .manager-header-account-dock')
    || document.querySelector('[data-console-account-menu="true"], [data-manager-account-menu="true"], .manager-header-account-dock');
}

function rectSummary(element: Element | null) {
  if (!element) return 'missing';
  const rect = element.getBoundingClientRect();
  return `x:${rect.x.toFixed(1)} y:${rect.y.toFixed(1)} w:${rect.width.toFixed(1)} h:${rect.height.toFixed(1)}`;
}

function topDelta(first: Element | null, second: Element | null) {
  if (!first || !second) return 'missing';
  return `${Math.abs(first.getBoundingClientRect().top - second.getBoundingClientRect().top).toFixed(2)}px`;
}

function widthRatio(header: Element | null, account: Element | null) {
  if (!header || !account) return 'missing';
  const headerWidth = header.getBoundingClientRect().width;
  const accountWidth = account.getBoundingClientRect().width;
  const total = headerWidth + accountWidth;
  if (!total) return 'missing';
  return `${Math.round((headerWidth / total) * 100)} / ${Math.round((accountWidth / total) * 100)}`;
}

function collectSnapshot(route: string): DebugSnapshot {
  const shell = findShellElement();
  const main = findMainElement(shell);
  const header = findHeaderElement(shell);
  const sidebar = findSidebarElement(shell);
  const accountMenu = findAccountElement(shell);
  const rootStyle = getComputedStyle(document.documentElement);
  const left = rootStyle.getPropertyValue('--console-header-ratio-left').trim() || '3fr';
  const right = rootStyle.getPropertyValue('--console-header-ratio-right').trim() || 'minmax(220px, 1fr)';
  const gridTemplateColumns = main ? getComputedStyle(main).gridTemplateColumns : 'not-available';
  return {
    route,
    role: shell?.getAttribute('data-console-role') || shell?.getAttribute('data-control-console') || 'not-available',
    mode: shell?.getAttribute('data-console-mode') || 'not-available',
    renderedShell: pickLabel(shell, shell ? 'ConsoleShell[class-fallback]' : 'ConsoleShell'),
    renderedHeader: pickLabel(header, header ? 'ConsoleHeader[class-fallback]' : 'ConsoleHeader'),
    renderedSidebar: pickLabel(sidebar, sidebar ? 'ConsoleSidebar[class-fallback]' : 'ConsoleSidebar'),
    renderedAccountMenu: pickLabel(accountMenu, accountMenu ? 'AccountMenu[class-fallback]' : 'AccountMenu'),
    loadedCssFiles: readLoadedCssFiles(),
    activeLayoutRatio: `${left} / ${right}`,
    gridTemplateColumns,
    headerRect: rectSummary(header),
    accountRect: rectSummary(accountMenu),
    headerAccountTopDelta: topDelta(header, accountMenu),
    headerAccountWidthRatio: widthRatio(header, accountMenu),
    detectionMode: shell?.hasAttribute('data-console-shell') ? 'canonical-data-attributes' : shell ? 'class-fallback' : 'missing'
  };
}

function sameSnapshot(a: DebugSnapshot | null, b: DebugSnapshot) {
  return a !== null && JSON.stringify(a) === JSON.stringify(b);
}

function debuggerShouldOpen(searchParams: ReturnType<typeof useSearchParams>) {
  return searchParams.get('debugPanel') === '1' || searchParams.get('xdisputerDebug') === 'panel' || searchParams.get('xdisputerDebug') === '1' || searchParams.get('debug') === 'ui-panel';
}

export default function RenderDebugger() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const route = useMemo(() => routeLabel(pathname, searchParams), [pathname, searchParams]);
  const queryEnabled = searchParams.get('xdisputerDebug') === '1' || searchParams.get('xdisputerDebug') === 'panel' || searchParams.get('debug') === 'ui' || searchParams.get('debug') === 'ui-panel';
  const enabled = process.env.NODE_ENV !== 'production' || queryEnabled;
  const queryOpen = debuggerShouldOpen(searchParams);
  const [open, setOpen] = useState(queryOpen);
  const [snapshot, setSnapshot] = useState<DebugSnapshot | null>(null);
  const [execution, setExecution] = useState<TemplateExecutionSnapshot | null>(null);

  useEffect(() => { setOpen(queryOpen); }, [queryOpen, pathname]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    let frame = 0;
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const next = collectSnapshot(route);
        window.__xdisputerDebug = next;
        setSnapshot((current) => sameSnapshot(current, next) ? current : next);
      });
    };
    sync();
    const observerRoot = document.body || document.documentElement;
    const observer = new MutationObserver(sync);
    observer.observe(observerRoot, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style', 'data-console-shell', 'data-console-main', 'data-console-header-grid', 'data-console-component', 'data-manager-account-state'] });
    const interval = window.setInterval(sync, 800);
    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', sync);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.clearInterval(interval); window.removeEventListener('resize', sync); window.removeEventListener('orientationchange', sync); };
  }, [enabled, route]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    const syncExecution = () => setExecution(window.__xdisputerTemplateExecution || null);
    syncExecution();
    window.addEventListener('xdisputer:template-execution', syncExecution);
    return () => window.removeEventListener('xdisputer:template-execution', syncExecution);
  }, [enabled]);

  if (!enabled || !snapshot) return null;
  return <aside className="xdisputer-render-debugger" data-xdisputer-debugger={open ? 'open' : 'closed'} data-xdisputer-debugger-mode="compact-dock">
    <button type="button" className="xdisputer-render-debugger-toggle" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="xdisputer-render-debugger-panel"><span>{open ? 'Hide debug' : 'Debug ready'}</span><small>{snapshot.renderedShell}</small></button>
    {open ? <section id="xdisputer-render-debugger-panel" className="xdisputer-render-debugger-panel" aria-live="polite">
      <div className="xdisputer-render-debugger-heading"><strong>xDisputer debug</strong><small>Runtime proof only. Does not affect layout.</small></div>
      <dl><dt>Route</dt><dd>{snapshot.route}</dd><dt>Shell</dt><dd>{snapshot.renderedShell}</dd><dt>Header</dt><dd>{snapshot.renderedHeader}</dd><dt>Sidebar</dt><dd>{snapshot.renderedSidebar}</dd><dt>Account</dt><dd>{snapshot.renderedAccountMenu}</dd><dt>Role</dt><dd>{snapshot.role} / {snapshot.mode}</dd><dt>Ratio token</dt><dd>{snapshot.activeLayoutRatio}</dd><dt>Grid</dt><dd>{snapshot.gridTemplateColumns}</dd><dt>Header rect</dt><dd>{snapshot.headerRect}</dd><dt>Account rect</dt><dd>{snapshot.accountRect}</dd><dt>Top delta</dt><dd>{snapshot.headerAccountTopDelta}</dd><dt>Width ratio</dt><dd>{snapshot.headerAccountWidthRatio}</dd><dt>Detection</dt><dd>{snapshot.detectionMode}</dd></dl>
      {execution ? <div className="xdisputer-render-debugger-execution"><strong>Template execution</strong><dl><dt>Status</dt><dd>{execution.status}</dd><dt>Round</dt><dd>{execution.round}</dd><dt>Outputs</dt><dd>{execution.outputs}</dd><dt>Warnings</dt><dd>{execution.warnings}</dd><dt>Engines</dt><dd>{execution.engines.join(', ') || 'none'}</dd><dt>Missing</dt><dd>{execution.missingSlots.join(', ') || 'none'}</dd></dl></div> : null}
      <details className="xdisputer-render-debugger-css"><summary>Loaded CSS files ({snapshot.loadedCssFiles.length})</summary><ol>{snapshot.loadedCssFiles.map((file) => <li key={file}>{file}</li>)}</ol></details>
    </section> : null}
  </aside>;
}
