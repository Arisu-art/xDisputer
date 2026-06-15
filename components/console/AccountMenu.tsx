'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

type ConsoleRole = 'manager' | 'master';
type ConsoleMode = 'operations' | 'workspace';

type Props = {
  role: ConsoleRole;
  mode: ConsoleMode;
  email?: string | null;
  accountLabel: string;
  switchTarget: string;
  switchTargetLabel: string;
};

type AccountAction = { href: string; title: string; subtitle: string };

const ACCOUNT_RAIL_CONTRACT_CSS = `
  @media (min-width: 761px) {
    .admin-monitor-main[data-console-header-grid="true"] {
      --account-dock-width: minmax(260px, 1fr) !important;
      --account-dock-height: clamp(136px, 10vw, 152px) !important;
      grid-template-columns: minmax(0, 3fr) var(--account-dock-width) !important;
      grid-template-rows: var(--account-dock-height) auto !important;
    }
    .admin-monitor-main[data-console-header-grid="true"] > .manager-header-account-dock[data-manager-account-anchor="header-ratio-grid"] {
      grid-column: 2 !important;
      grid-row: 1 !important;
      min-width: 260px !important;
      width: 100% !important;
      height: var(--account-dock-height) !important;
      max-height: var(--account-dock-height) !important;
      align-self: start !important;
      justify-self: stretch !important;
    }
    .admin-monitor-main[data-console-header-grid="true"] > [data-console-header-primary="true"],
    .admin-monitor-main[data-console-header-grid="true"] > .admin-monitor-header:first-of-type,
    .admin-monitor-main[data-console-header-grid="true"] > .native-command-hero:first-of-type {
      grid-column: 1 !important;
      grid-row: 1 !important;
      height: var(--account-dock-height) !important;
      max-height: var(--account-dock-height) !important;
      margin: 0 !important;
    }
  }
  @media (max-width: 1020px) and (min-width: 761px) {
    .admin-monitor-main[data-console-header-grid="true"] {
      --account-dock-width: minmax(220px, .86fr) !important;
      grid-template-columns: minmax(0, 2.8fr) var(--account-dock-width) !important;
    }
    .admin-monitor-main[data-console-header-grid="true"] > .manager-header-account-dock[data-manager-account-anchor="header-ratio-grid"] {
      min-width: 220px !important;
    }
  }
`;

function initialFromEmail(email?: string | null) {
  const value = email?.trim();
  if (!value) return 'x';
  return value[0]?.toLowerCase() || 'x';
}

function displayNameFromEmail(email?: string | null) {
  const value = email?.trim();
  if (!value) return 'Signed-in account';
  const localPart = value.split('@')[0] || value;
  return localPart.replace(/[._-]+/g, ' ');
}

function accountActions(role: ConsoleRole): AccountAction[] {
  if (role === 'master') return [
    { href: '/master/accounts', title: 'Manage accounts', subtitle: 'Workspace-wide account directory and limits' },
    { href: '/master/reports', title: 'Reports', subtitle: 'Cross-workspace reporting and activity views' },
    { href: '/master/system', title: 'System health', subtitle: 'Operational events and integrity visibility' }
  ];
  return [
    { href: '/admin/access', title: 'Manage access', subtitle: 'Review client approvals and account controls' },
    { href: '/admin/reports', title: 'Reports', subtitle: 'Manager reporting and generation summaries' },
    { href: '/admin/audit', title: 'Audit log', subtitle: 'Access and control history for the workspace' }
  ];
}

export default function AccountMenu({ role, mode, email, accountLabel, switchTarget, switchTargetLabel }: Props) {
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const popoverId = useMemo(() => `xdisputer-account-popover-${role}-${mode}`, [role, mode]);
  const initial = useMemo(() => initialFromEmail(email), [email]);
  const displayName = useMemo(() => displayNameFromEmail(email), [email]);
  const actions = useMemo(() => accountActions(role), [role]);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return <div ref={rootRef} className="manager-header-account-dock" data-console-component="AccountMenu" data-console-account-menu="true" data-console-account-role={role} data-console-mode={mode} data-manager-account-menu="true" data-manager-account-anchor="header-ratio-grid" data-manager-account-layout="header-75-25-avatar-only" data-manager-account-state={open ? 'open' : 'closed'} data-manager-account-popover-align="below-right">
    <style data-account-rail-contract="true">{ACCOUNT_RAIL_CONTRACT_CSS}</style>
    <button type="button" className="manager-header-account-avatar" aria-haspopup="dialog" aria-expanded={open} aria-controls={popoverId} aria-label={`Open ${accountLabel} menu`} onClick={() => setOpen((value) => !value)}>{initial}</button>
    {open ? <div id={popoverId} className="manager-account-popover" data-console-account-popover="true" data-manager-account-popover="true" data-manager-account-popover-align="below-right" role="dialog" aria-label={`${accountLabel} menu`}>
      <div className="manager-account-popover-topline"><span>{email || accountLabel}</span><button type="button" className="manager-account-close" aria-label="Close account menu" onClick={() => setOpen(false)}>×</button></div>
      <section className="manager-account-identity-panel"><div className="manager-account-avatar-large" aria-hidden="true">{initial}</div><h2>{displayName}</h2><p>{accountLabel}</p></section>
      <section className="manager-account-action-list" aria-label="Account actions">
        {actions.map((action) => <Link key={action.href} href={action.href} aria-current={pathname === action.href ? 'page' : undefined} onClick={() => setOpen(false)}><div><strong>{action.title}</strong><small>{action.subtitle}</small></div><span aria-hidden="true">→</span></Link>)}
        <Link href={switchTarget} data-manager-canonical-switch="true" data-manager-switch-visible-slot="account-popover" data-manager-switch-target={switchTarget} data-manager-switch-target-label={switchTargetLabel} onClick={() => setOpen(false)}><div><strong>{switchTargetLabel}</strong><small>Switch between the paired workspace and console surfaces</small></div><span aria-hidden="true">↔</span></Link>
      </section>
      <form className="manager-account-signout" action="/auth/sign-out" method="post"><button type="submit">Sign out</button></form>
    </div> : null}
  </div>;
}
