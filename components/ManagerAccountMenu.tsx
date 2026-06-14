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

  return <div className="manager-header-account-dock" data-manager-account-menu="true" data-manager-account-layout="header-75-25-avatar-only" data-manager-account-state={open ? 'open' : 'closed'}>
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
  </div>;
}
