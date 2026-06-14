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

function initialFromEmail(email?: string | null) {
  const clean = (email || 'manager').trim();
  return clean[0]?.toUpperCase() || 'M';
}

function displayNameFromEmail(email?: string | null) {
  const clean = (email || '').trim();
  if (!clean.includes('@')) return clean || 'Manager account';
  return clean.split('@')[0].replace(/[._-]+/g, ' ');
}

export default function ManagerAccountMenu({ email, accountLabel, mode, switchTarget, switchTargetLabel }: Props) {
  const [open, setOpen] = useState(false);
  const initial = useMemo(() => initialFromEmail(email), [email]);
  const displayName = useMemo(() => displayNameFromEmail(email), [email]);
  const workspaceHref = mode === 'workspace' ? '/admin' : '/manager-workspace';
  const workspaceLabel = mode === 'workspace' ? 'Operations console' : 'Manager workspace';

  return <div className="manager-top-account-shell" data-manager-account-menu="true">
    <Link className="manager-top-account-icon-link" href={workspaceHref} aria-label={`Open ${workspaceLabel}`}>⌘</Link>
    <button className="manager-top-account-avatar" type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      {initial}
    </button>
    {open && <div className="manager-account-popover" role="dialog" aria-label="Account and settings menu">
      <button className="manager-account-close" type="button" aria-label="Close account menu" onClick={() => setOpen(false)}>×</button>
      <div className="manager-account-email">{email || 'Manager account'}</div>
      <div className="manager-account-avatar-large">{initial}</div>
      <h2>Hi, {displayName}!</h2>
      <p>{accountLabel}</p>
      <div className="manager-account-primary-actions">
        <Link href="/admin/access" onClick={() => setOpen(false)}>Manage account access</Link>
        <Link href={switchTarget} data-manager-canonical-switch="true" data-manager-switch-visible-slot="account-popover" data-manager-switch-target={switchTarget} data-manager-switch-target-label={switchTargetLabel} onClick={() => setOpen(false)}>Switch mode · {switchTargetLabel}</Link>
      </div>
      <div className="manager-account-list">
        <Link href="/admin" onClick={() => setOpen(false)}><span>Operations</span><small>Monitoring and access center</small></Link>
        <Link href="/manager-workspace" onClick={() => setOpen(false)}><span>Workspace</span><small>Templates and manager defaults</small></Link>
        <Link href="/admin/reports" onClick={() => setOpen(false)}><span>Reports</span><small>Manager summary and activity</small></Link>
      </div>
      <form className="manager-account-signout" action="/auth/sign-out" method="post"><button type="submit">Sign out</button></form>
    </div>}
    <style jsx>{`
      .manager-top-account-shell { position: fixed; top: 18px; right: 24px; z-index: 2147482000; display: flex; align-items: center; gap: 12px; }
      .manager-top-account-icon-link { width: 40px; height: 40px; display: grid; place-items: center; border-radius: 999px; color: #475569; background: rgba(255,255,255,.88); border: 1px solid rgba(148,163,184,.35); text-decoration: none; font-weight: 900; box-shadow: 0 12px 24px rgba(15,23,42,.08); }
      .manager-top-account-avatar { width: 46px; height: 46px; display: grid; place-items: center; border: 4px solid rgba(124,58,237,.23); border-radius: 999px; color: #fff; background: #765343; font-size: 20px; font-weight: 850; text-transform: lowercase; cursor: pointer; box-shadow: 0 15px 30px rgba(15,23,42,.16); }
      .manager-account-popover { position: absolute; top: 58px; right: 0; width: min(430px, calc(100vw - 32px)); max-height: calc(100vh - 94px); overflow: auto; padding: 26px 20px 20px; border-radius: 30px; color: #f8fafc; background: #202124; box-shadow: 0 32px 90px rgba(0,0,0,.38); border: 1px solid rgba(255,255,255,.08); }
      .manager-account-close { position: absolute; top: 18px; right: 18px; width: 36px; height: 36px; border: 0; border-radius: 999px; color: #d1d5db; background: transparent; font-size: 32px; line-height: 1; cursor: pointer; }
      .manager-account-email { text-align: center; color: #e5e7eb; font-size: 14px; font-weight: 760; }
      .manager-account-avatar-large { width: 102px; height: 102px; margin: 28px auto 14px; display: grid; place-items: center; border-radius: 999px; color: #fff; background: #765343; font-size: 54px; font-weight: 700; text-transform: lowercase; }
      .manager-account-popover h2 { margin: 0; text-align: center; color: #f9fafb; font-size: 28px; line-height: 1.1; letter-spacing: -.04em; }
      .manager-account-popover p { margin: 8px 0 16px; text-align: center; color: #cbd5e1; }
      .manager-account-primary-actions { display: grid; gap: 10px; margin: 0 auto 18px; max-width: 320px; }
      .manager-account-primary-actions a { min-height: 44px; display: flex; align-items: center; justify-content: center; padding: 0 16px; border: 1px solid #5f6368; border-radius: 999px; color: #bfdbfe; text-decoration: none; font-weight: 760; }
      .manager-account-list { display: grid; gap: 4px; padding: 8px; border-radius: 20px; background: #171717; }
      .manager-account-list a { display: grid; gap: 3px; padding: 14px 16px; border-radius: 14px; color: #f3f4f6; text-decoration: none; background: #1f1f1f; }
      .manager-account-list a:hover { background: #2a2a2a; }
      .manager-account-list span { font-weight: 820; }
      .manager-account-list small { color: #a7b0be; }
      .manager-account-signout { margin-top: 10px; padding: 8px; border-radius: 20px; background: #171717; }
      .manager-account-signout button { width: 100%; min-height: 50px; border: 0; border-radius: 15px; color: #f3f4f6; background: #1f1f1f; font-size: 16px; font-weight: 820; cursor: pointer; }
      .manager-account-signout button:hover { background: #2a2a2a; }
      @media (max-width: 760px) { .manager-top-account-shell { top: 12px; right: 12px; } .manager-top-account-icon-link { display: none; } }
    `}</style>
  </div>;
}
