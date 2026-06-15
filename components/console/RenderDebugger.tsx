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

function findHeaderElement() {
  return document.querySelector('[data-console-header="true"], [data-console-header-primary="true"], .admin-monitor-main[data-console-header-grid="true"] > .admin-monitor-header:first-of-type, .admin-monitor-main[data-console-header-grid="true"] > .manager-template-client-flow:first-of-type > .admin-monitor-card:first-of-type');
}

function collectSnapshot(route: string): DebugSnapshot {
  const shell = document.querySelector('[data-console-shell="true"]');
  const main = document.querySelector('[data-console-main="true"][data-console-header-grid="true"]');
  const header = findHeaderElement();
  const sidebar = document.querySelector('[data-console-sidebar="true"]');
  const accountMenu = document.querySelector('[data-console-account-menu="true"], [data-manager-account-menu="true"]');
  const rootStyle = getComputedStyle(document.documentElement);
  const left = rootStyle.getPropertyValue('--console-header-ratio-left').trim() || '3fr';
  const right = rootStyle.getPropertyValue('--console-header-ratio-right').trim() || '1fr';
  const gridTemplateColumns = main ? getComputedStyle(main).gridTemplateColumns : 'not-available';
  return {
    route,
    role: shell?.getAttribute('data-console-role') || 'not-available',
    mode: shell?.getAttribute('data-console-mode') || 'not-available',
    renderedShell: pickLabel(shell, 'ConsoleShell'),
    renderedHeader: pickLabel(header, 'ConsoleHeader'),
    renderedSidebar: pickLabel(sidebar, 'ConsoleSidebar'),
    renderedAccountMenu: pickLabel(accountMenu, 'AccountMenu'),
    loadedCssFiles: readLoadedCssFiles(),
    activeLayoutRatio: `${left} / ${right}`,
    gridTemplateColumns
  };
}

function sameSnapshot(a: DebugSnapshot | null, b: DebugSnapshot) {
  return a !== null && JSON.stringify(a) === JSON.stringify(b);
}

function debuggerShouldOpen(searchParams: ReturnType<typeof useSearchParams>) {
  return searchParams.get('debugPanel') === '1' || searchParams.get('xdisputerDebug') === 'panel' || searchParams.get('debug') === 'ui-panel';
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
    const shell = document.querySelector('[data-console-shell="true"]');
    const observer = shell ? new MutationObserver(sync) : null;
    observer?.observe(shell as Node, { subtree: true, childList: true, attributes: true });
    window.addEventListener('resize', sync);
    return () => { cancelAnimationFrame(frame); observer?.disconnect(); window.removeEventListener('resize', sync); };
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
      <dl><dt>Route</dt><dd>{snapshot.route}</dd><dt>Shell</dt><dd>{snapshot.renderedShell}</dd><dt>Header</dt><dd>{snapshot.renderedHeader}</dd><dt>Sidebar</dt><dd>{snapshot.renderedSidebar}</dd><dt>Account</dt><dd>{snapshot.renderedAccountMenu}</dd><dt>Role</dt><dd>{snapshot.role} / {snapshot.mode}</dd><dt>Ratio</dt><dd>{snapshot.activeLayoutRatio}</dd><dt>Grid</dt><dd>{snapshot.gridTemplateColumns}</dd></dl>
      {execution ? <div className="xdisputer-render-debugger-execution"><strong>Template execution</strong><dl><dt>Status</dt><dd>{execution.status}</dd><dt>Round</dt><dd>{execution.round}</dd><dt>Outputs</dt><dd>{execution.outputs}</dd><dt>Warnings</dt><dd>{execution.warnings}</dd><dt>Engines</dt><dd>{execution.engines.join(', ') || 'none'}</dd><dt>Missing</dt><dd>{execution.missingSlots.join(', ') || 'none'}</dd></dl></div> : null}
      <details className="xdisputer-render-debugger-css"><summary>Loaded CSS files ({snapshot.loadedCssFiles.length})</summary><ol>{snapshot.loadedCssFiles.map((file) => <li key={file}>{file}</li>)}</ol></details>
    </section> : null}
  </aside>;
}
