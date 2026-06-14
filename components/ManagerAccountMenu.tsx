'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type Props = {
  email?: string | null;
  accountLabel: string;
  mode: 'operations' | 'workspace';
  switchTarget: string;
  switchTargetLabel: string;
};

const managerFloatingLayoutCss = `
.manager-ops-console .admin-monitor-main[data-console-header-grid="true"] {
  --manager-floating-radius: 24px;
  --manager-floating-border: rgba(203, 213, 225, 0.78);
  --manager-floating-shadow: 0 18px 45px rgba(15, 23, 42, 0.085), 0 2px 8px rgba(15, 23, 42, 0.045);
  --manager-floating-shadow-hover: 0 26px 68px rgba(15, 23, 42, 0.13), 0 8px 18px rgba(15, 23, 42, 0.06);
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) clamp(92px, 8vw, 118px) !important;
  gap: clamp(0.85rem, 1.35vw, 1.1rem) !important;
  align-items: stretch !important;
}
.admin-monitor-page.native-console.manager-ops-console:has([data-manager-account-layout="header-75-25-avatar-only"]) .admin-monitor-main[data-console-header-grid="true"] > .admin-monitor-header.native-command-hero:first-of-type {
  grid-column: 1 !important;
  grid-row: 1 !important;
  width: auto !important;
  min-height: clamp(136px, 13vw, 160px) !important;
  margin: 0 0 var(--console-row-gap, 1rem) 0 !important;
  display: grid !important;
  align-items: center !important;
  border-radius: var(--manager-floating-radius) !important;
  border-color: var(--manager-floating-border) !important;
  box-shadow: var(--manager-floating-shadow) !important;
  animation: managerFloatIn 420ms cubic-bezier(.2, .8, .2, 1) both;
}
.admin-monitor-page.native-console.manager-ops-console:has([data-manager-account-layout="header-75-25-avatar-only"]) .manager-header-account-dock[data-manager-account-menu="true"] {
  grid-column: 2 !important;
  grid-row: 1 !important;
  position: relative !important;
  inset: auto !important;
  width: 100% !important;
  min-width: 0 !important;
  min-height: clamp(136px, 13vw, 160px) !important;
  height: auto !important;
  margin: 0 !important;
  padding: 0 !important;
  display: grid !important;
  place-items: center !important;
  align-self: stretch !important;
  border-radius: var(--manager-floating-radius) !important;
  border: 1px solid var(--manager-floating-border) !important;
  box-shadow: var(--manager-floating-shadow) !important;
  animation: managerFloatIn 460ms cubic-bezier(.2, .8, .2, 1) 60ms both;
}
.admin-monitor-page.native-console.manager-ops-console:has([data-manager-account-layout="header-75-25-avatar-only"]) .manager-header-account-dock[data-manager-account-menu="true"]::before { display: none !important; }
.manager-ops-console .manager-header-account-avatar {
  width: clamp(54px, 4.8vw, 68px) !important;
  height: clamp(54px, 4.8vw, 68px) !important;
  transition: transform 180ms ease, box-shadow 180ms ease, filter 180ms ease !important;
}
.manager-ops-console .manager-header-account-avatar:hover { transform: translateY(-2px) scale(1.025) !important; }
.manager-ops-console .admin-monitor-stats,
.manager-ops-console .admin-power-grid,
.manager-ops-console .admin-feedback-card,
.manager-ops-console .admin-monitor-card { animation: managerFloatIn 460ms cubic-bezier(.2, .8, .2, 1) both; }
.manager-ops-console .admin-monitor-stats { animation-delay: 90ms; }
.manager-ops-console .admin-power-grid { animation-delay: 150ms; }
.manager-ops-console .admin-monitor-stats article,
.manager-ops-console .admin-monitor-card,
.manager-ops-console .native-operation-card {
  border-color: var(--manager-floating-border) !important;
  border-radius: var(--manager-floating-radius) !important;
  box-shadow: var(--manager-floating-shadow) !important;
  transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease !important;
}
.manager-ops-console .admin-monitor-stats article:hover,
.manager-ops-console .admin-monitor-card:hover,
.manager-ops-console .native-operation-card:hover {
  transform: translateY(-4px) !important;
  border-color: rgba(148, 163, 184, 0.92) !important;
  box-shadow: var(--manager-floating-shadow-hover) !important;
}
@keyframes managerFloatIn { from { opacity: 0; transform: translateY(12px) scale(0.992); } to { opacity: 1; transform: translateY(0) scale(1); } }
@media (max-width: 1100px) { .manager-ops-console .admin-monitor-main[data-console-header-grid="true"] { grid-template-columns: minmax(0, 1fr) 86px !important; } }
@media (max-width: 760px) {
  .manager-ops-console .admin-monitor-main[data-console-header-grid="true"] { grid-template-columns: minmax(0, 1fr) auto !important; }
  .admin-monitor-page.native-console.manager-ops-console:has([data-manager-account-layout="header-75-25-avatar-only"]) .admin-monitor-main[data-console-header-grid="true"] > .admin-monitor-header.native-command-hero:first-of-type { grid-column: 1 / -1 !important; padding-right: 5.25rem !important; }
  .admin-monitor-page.native-console.manager-ops-console:has([data-manager-account-layout="header-75-25-avatar-only"]) .manager-header-account-dock[data-manager-account-menu="true"] { grid-column: 2 !important; width: auto !important; min-height: auto !important; padding: 0.45rem !important; align-self: start !important; }
}
@media (prefers-reduced-motion: reduce) {
  .manager-ops-console .admin-monitor-header,
  .manager-ops-console .manager-header-account-dock,
  .manager-ops-console .admin-monitor-stats,
  .manager-ops-console .admin-power-grid,
  .manager-ops-console .admin-monitor-card,
  .manager-ops-console .admin-monitor-stats article,
  .manager-ops-console .native-operation-card,
  .manager-ops-console .manager-header-account-avatar { animation: none !important; transition: none !important; }
}
`;

function initialFromEmail(email?: string | null) {
  const clean = (email || 'manager').trim();
  return clean[0]?.toUpperCase() || 'M';
}

function displayNameFromEmail(email?: string | null) {
  const clean = (email || '').trim();
  if (!clean.includes('@')) return clean || 'Manager account';
  return clean.split('@')[0].replace(/[._-]+/g, ' ');
}

export default function ManagerAccountMenu({ email, accountLabel, switchTarget, switchTargetLabel }: Props) {
  const [open, setOpen] = useState(false);
  const initial = useMemo(() => initialFromEmail(email), [email]);
  const displayName = useMemo(() => displayNameFromEmail(email), [email]);

  return <>
    <style>{managerFloatingLayoutCss}</style>
    <div className="manager-header-account-dock" data-manager-account-menu="true" data-manager-account-layout="header-75-25-avatar-only">
      <button className="manager-header-account-avatar" type="button" aria-haspopup="dialog" aria-expanded={open} aria-label="Open account and settings menu" onClick={() => setOpen((value) => !value)}>
        {initial}
      </button>

      {open && <div className="manager-account-popover" role="dialog" aria-label="Account and settings menu">
        <div className="manager-account-popover-topline"><span>{email || 'Manager account'}</span><button className="manager-account-close" type="button" aria-label="Close account menu" onClick={() => setOpen(false)}>×</button></div>
        <section className="manager-account-identity-panel">
          <div className="manager-account-avatar-large">{initial}</div>
          <h2>{displayName}</h2>
          <p>{accountLabel}</p>
        </section>
        <section className="manager-account-action-list" aria-label="Account actions">
          <Link href="/admin/access" onClick={() => setOpen(false)}><strong>Manage access</strong><span>Accounts and approvals</span></Link>
          <Link href={switchTarget} data-manager-canonical-switch="true" data-manager-switch-visible-slot="account-popover" data-manager-switch-target={switchTarget} data-manager-switch-target-label={switchTargetLabel} onClick={() => setOpen(false)}><strong>Switch mode</strong><span>{switchTargetLabel}</span></Link>
          <Link href="/admin/reports" onClick={() => setOpen(false)}><strong>Reports</strong><span>Manager summary</span></Link>
        </section>
        <form className="manager-account-signout" action="/auth/sign-out" method="post"><button type="submit">Sign out</button></form>
      </div>}
    </div>
  </>;
}
