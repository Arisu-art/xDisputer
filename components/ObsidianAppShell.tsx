'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';

export type ObsidianAppShellProps = {
  role: 'admin' | 'client';
  email?: string | null;
  title: string;
  subtitle: string;
  children: ReactNode;
};

type NavItem = {
  label: string;
  href: string;
  icon: string;
  roles: Array<'admin' | 'client'>;
};

const navItems: NavItem[] = [
  { label: 'Admin', href: '/admin', icon: '◇', roles: ['admin'] },
  { label: 'Workspace', href: '/client/workspace', icon: '▣', roles: ['admin', 'client'] }
];

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function ObsidianAppShell({ role, email, title, children }: ObsidianAppShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem('xdisputer-sidebar-collapsed');
    if (stored) setCollapsed(stored === 'true');
  }, []);

  useEffect(() => {
    window.localStorage.setItem('xdisputer-sidebar-collapsed', String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const visibleNavItems = useMemo(() => navItems.filter((item) => item.roles.includes(role)), [role]);
  const initials = (email || role).slice(0, 2).toUpperCase();
  const homeHref = role === 'admin' ? '/admin' : '/client/workspace';

  return (
    <main className="obsidian-shell" data-sidebar-collapsed={collapsed ? 'true' : 'false'}>
      <aside className="obsidian-sidebar" aria-label="Primary navigation">
        <div className="obsidian-sidebar-brand">
          <Link href={homeHref} className="obsidian-brand-mark" aria-label="xDisputer home">
            <span>xD</span>
            <strong>xDisputer</strong>
          </Link>
          <button
            type="button"
            className="obsidian-icon-button"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? '→' : '←'}
          </button>
        </div>

        <nav className="obsidian-sidebar-nav" aria-label="Application pages">
          {visibleNavItems.map((item) => {
            const active = isActive(pathname, item.href) || (item.href === '/client/workspace' && pathname === '/client');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`obsidian-nav-item${active ? ' active' : ''}`}
                aria-current={active ? 'page' : undefined}
                title={collapsed ? item.label : undefined}
              >
                <span className="obsidian-nav-icon" aria-hidden="true">{item.icon}</span>
                <span className="obsidian-nav-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="obsidian-sidebar-footer">
          <div className="obsidian-user-chip" title={email || role}>
            <span>{initials}</span>
            <div>
              <strong>{role === 'admin' ? 'Admin' : 'Client'}</strong>
              <small>{email || 'Signed in'}</small>
            </div>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <button
          type="button"
          className="obsidian-mobile-overlay"
          aria-label="Close navigation menu"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className={`obsidian-mobile-drawer${mobileOpen ? ' open' : ''}`} aria-hidden={!mobileOpen}>
        <div className="obsidian-sidebar-brand">
          <Link href={homeHref} className="obsidian-brand-mark" aria-label="xDisputer home">
            <span>xD</span>
            <strong>xDisputer</strong>
          </Link>
          <button type="button" className="obsidian-icon-button" aria-label="Close menu" onClick={() => setMobileOpen(false)}>
            ×
          </button>
        </div>
        <nav className="obsidian-sidebar-nav" aria-label="Mobile application pages">
          {visibleNavItems.map((item) => {
            const active = isActive(pathname, item.href) || (item.href === '/client/workspace' && pathname === '/client');
            return (
              <Link key={item.href} href={item.href} className={`obsidian-nav-item${active ? ' active' : ''}`} aria-current={active ? 'page' : undefined}>
                <span className="obsidian-nav-icon" aria-hidden="true">{item.icon}</span>
                <span className="obsidian-nav-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <section className="obsidian-main">
        <header className="obsidian-topbar compact">
          <div className="obsidian-title-group">
            <button type="button" className="obsidian-mobile-menu" aria-label="Open navigation menu" onClick={() => setMobileOpen(true)}>
              ☰
            </button>
            <h1>{title}</h1>
          </div>

          <div className="obsidian-topbar-actions">
            <form action="/auth/sign-out" method="post">
              <button type="submit" className="obsidian-signout-button">Sign out</button>
            </form>
            <div className="obsidian-avatar" aria-label={`Signed in as ${email || role}`}>{initials}</div>
          </div>
        </header>

        <div className="obsidian-page-wrap compact">
          <div className="obsidian-page-motion">{children}</div>
        </div>
      </section>
    </main>
  );
}
