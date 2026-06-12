'use client';

import type { ReactNode } from 'react';
import ConsoleNavLink from '../ConsoleNavLink';
import ControlNavigationTelemetry, { type ControlNavItem } from './ControlNavigationTelemetry';

type Props = {
  scope: 'master' | 'manager';
  brandLabel: string;
  brandSubtitle: string;
  sectionLabel?: string;
  accountEmail: string;
  accountLabel: string;
  navItems: ControlNavItem[];
  mainClassName?: string;
  children: ReactNode;
};

export default function ControlConsoleShell({
  scope,
  brandLabel,
  brandSubtitle,
  sectionLabel = 'Operations',
  accountEmail,
  accountLabel,
  navItems,
  mainClassName = '',
  children
}: Props) {
  const consoleClass = scope === 'master' ? 'master-ops-console' : 'manager-ops-console';

  return <main className={`admin-monitor-page native-console ${consoleClass} ${mainClassName}`} data-control-console={scope}>
    <ControlNavigationTelemetry scope={scope} navItems={navItems} />
    <aside className="admin-monitor-sidebar native-console-sidebar">
      <div className="admin-monitor-brand">
        <span>xD</span>
        <div><strong>{brandLabel}</strong><small>{brandSubtitle}</small></div>
      </div>

      <div className="admin-sidebar-section-title">{sectionLabel}</div>
      <nav aria-label={`${scope} navigation`}>
        {navItems.map((item) => <ConsoleNavLink key={item.href} href={item.href} className={item.active ? 'active' : undefined}>{item.label}</ConsoleNavLink>)}
      </nav>

      <div className="admin-monitor-account">
        <strong>{accountEmail}</strong>
        <small>{accountLabel}</small>
        <form action="/auth/sign-out" method="post">
          <button type="submit">Sign out</button>
        </form>
      </div>
    </aside>

    <section className="admin-monitor-main native-console-main">
      {children}
    </section>
  </main>;
}
