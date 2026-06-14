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

export default function ManagerAccountMenu({ email, accountLabel, switchTarget, switchTargetLabel }: Props) {
  const [open, setOpen] = useState(false);
  const initial = useMemo(() => initialFromEmail(email), [email]);
  const displayName = useMemo(() => displayNameFromEmail(email), [email]);

  return <div className="manager-header-account-dock" data-manager-account-menu="true" data-manager-account-layout="header-75-25-avatar-only">
    <button className="manager-header-account-avatar" type="button" aria-haspopup="dialog" aria-expanded={open} aria-label="Open account and settings menu" onClick={() => setOpen((value) => !value)}>
      {initial}
    </button>

    {open && <div className="manager-account-popover" role="dialog" aria-label="Account and settings menu">
      <div className="manager-account-popover-header">
        <div>
          <p>{email || 'Manager account'}</p>
          <strong>{accountLabel}</strong>
        </div>
        <button className="manager-account-close" type="button" aria-label="Close account menu" onClick={() => setOpen(false)}>×</button>
      </div>

      <section className="manager-account-identity-card">
        <div className="manager-account-avatar-large">{initial}</div>
        <div>
          <p>Signed in as</p>
          <h2>{displayName}</h2>
          <span>{email || 'No email available'}</span>
        </div>
      </section>

      <section className="manager-account-primary-grid" aria-label="Primary account actions">
        <Link href="/admin/access" onClick={() => setOpen(false)}><span>Manage access</span><small>Accounts, approvals, and controls</small></Link>
        <Link href={switchTarget} data-manager-canonical-switch="true" data-manager-switch-visible-slot="account-popover" data-manager-switch-target={switchTarget} data-manager-switch-target-label={switchTargetLabel} onClick={() => setOpen(false)}><span>Switch mode</span><small>{switchTargetLabel}</small></Link>
      </section>

      <section className="manager-account-route-list" aria-label="Workspace shortcuts">
        <Link href="/admin" onClick={() => setOpen(false)}><span>Operations</span><small>Monitoring and access center</small></Link>
        <Link href="/manager-workspace" onClick={() => setOpen(false)}><span>Workspace</span><small>Templates and manager defaults</small></Link>
        <Link href="/admin/reports" onClick={() => setOpen(false)}><span>Reports</span><small>Manager summary and activity</small></Link>
      </section>

      <form className="manager-account-signout" action="/auth/sign-out" method="post"><button type="submit">Sign out</button></form>
    </div>}

    <style jsx>{`
      .manager-header-account-dock {
        position: fixed;
        top: 16px;
        right: 24px;
        z-index: 2147482000;
        width: clamp(220px, 25vw, 360px);
        min-height: 72px;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        padding: 10px 14px;
        border: 1px solid rgba(148, 163, 184, .26);
        border-left: 4px solid rgba(124, 58, 237, .38);
        border-radius: 28px;
        background: rgba(255, 255, 255, .82);
        box-shadow: 0 18px 48px rgba(15, 23, 42, .10);
        backdrop-filter: blur(18px);
      }
      .manager-header-account-avatar {
        width: 54px;
        height: 54px;
        display: grid;
        place-items: center;
        border: 5px solid rgba(124, 58, 237, .25);
        border-radius: 999px;
        color: #fff;
        background: #765343;
        font-size: 23px;
        font-weight: 850;
        text-transform: lowercase;
        cursor: pointer;
        box-shadow: 0 16px 32px rgba(15,23,42,.18);
      }
      .manager-header-account-avatar:hover { transform: translateY(-1px); box-shadow: 0 20px 38px rgba(15,23,42,.22); }
      .manager-account-popover { position: absolute; top: 86px; right: 0; width: min(520px, calc(100vw - 32px)); max-height: calc(100vh - 104px); overflow: auto; padding: 18px; border-radius: 30px; color: #f8fafc; background: #202124; box-shadow: 0 32px 90px rgba(0,0,0,.38); border: 1px solid rgba(255,255,255,.08); }
      .manager-account-popover-header { min-height: 46px; display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 12px; padding: 0 4px 16px; border-bottom: 1px solid rgba(255,255,255,.08); }
      .manager-account-popover-header p { margin: 0; color: #f8fafc; font-size: 15px; font-weight: 820; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .manager-account-popover-header strong { display: block; margin-top: 4px; color: #a7b0be; font-size: 12px; font-weight: 740; }
      .manager-account-close { width: 38px; height: 38px; border: 0; border-radius: 999px; color: #d1d5db; background: #2b2c2f; font-size: 28px; line-height: 1; cursor: pointer; }
      .manager-account-close:hover { background: #3a3b3f; color: #fff; }
      .manager-account-identity-card { margin: 18px 0; min-height: 132px; display: grid; grid-template-columns: 118px minmax(0, 1fr); align-items: center; gap: 18px; padding: 18px; border-radius: 26px; background: linear-gradient(135deg, #2b2c2f, #18191b); border: 1px solid rgba(255,255,255,.08); }
      .manager-account-avatar-large { width: 104px; height: 104px; display: grid; place-items: center; border-radius: 999px; color: #fff; background: #765343; font-size: 54px; font-weight: 760; text-transform: lowercase; box-shadow: inset 0 0 0 1px rgba(255,255,255,.08); }
      .manager-account-identity-card p { margin: 0 0 5px; color: #9ca3af; font-size: 11px; font-weight: 820; letter-spacing: .12em; text-transform: uppercase; }
      .manager-account-identity-card h2 { margin: 0; color: #fff; font-size: 30px; line-height: 1.03; letter-spacing: -.055em; }
      .manager-account-identity-card span { display: block; margin-top: 9px; color: #cbd5e1; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .manager-account-primary-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-bottom: 12px; }
      .manager-account-primary-grid a { min-height: 82px; display: grid; align-content: center; gap: 5px; padding: 14px; border: 1px solid #3f4652; border-radius: 20px; color: #e0ecff; text-decoration: none; background: #17191d; }
      .manager-account-primary-grid a:hover { border-color: #93c5fd; background: #1f2633; }
      .manager-account-primary-grid span, .manager-account-route-list span { color: #f8fafc; font-weight: 850; }
      .manager-account-primary-grid small, .manager-account-route-list small { color: #a7b0be; line-height: 1.25; }
      .manager-account-route-list { display: grid; gap: 5px; padding: 8px; border-radius: 22px; background: #151515; }
      .manager-account-route-list a { display: grid; grid-template-columns: 110px minmax(0, 1fr); gap: 8px; padding: 13px 14px; border-radius: 16px; color: #f3f4f6; text-decoration: none; background: #1f1f1f; }
      .manager-account-route-list a:hover { background: #2a2a2a; }
      .manager-account-signout { margin-top: 12px; padding: 8px; border-radius: 22px; background: #151515; }
      .manager-account-signout button { width: 100%; min-height: 52px; border: 0; border-radius: 16px; color: #f3f4f6; background: #1f1f1f; font-size: 16px; font-weight: 850; cursor: pointer; }
      .manager-account-signout button:hover { background: #2a2a2a; }
      @media (max-width: 1100px) { .manager-header-account-dock { width: 116px; min-height: 66px; padding: 7px 10px; } .manager-header-account-avatar { width: 50px; height: 50px; } }
      @media (max-width: 760px) { .manager-header-account-dock { top: 10px; right: 10px; width: auto; min-height: auto; padding: 6px; border-left-width: 1px; } .manager-account-popover { width: calc(100vw - 20px); right: -2px; } .manager-account-identity-card, .manager-account-primary-grid, .manager-account-route-list a { grid-template-columns: 1fr; } .manager-account-avatar-large { margin: 0 auto; } }
    `}</style>
  </div>;
}
