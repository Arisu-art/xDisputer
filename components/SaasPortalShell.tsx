import Link from 'next/link';
import type { ReactNode } from 'react';

export type SaasPortalShellProps = {
  role: 'admin' | 'client';
  email?: string | null;
  title: string;
  subtitle: string;
  children: ReactNode;
};

export default function SaasPortalShell({ role, email, title, subtitle, children }: SaasPortalShellProps) {
  return (
    <main className="saas-portal-shell">
      <header className="saas-portal-topbar">
        <Link href="/" className="saas-portal-brand" aria-label="xDisputer home">
          <span>xD</span>
          <div>
            <strong>xDisputer</strong>
            <small>{role === 'admin' ? 'Administrator Console' : 'Client Portal'}</small>
          </div>
        </Link>

        <nav className="saas-portal-nav" aria-label="SaaS navigation">
          {role === 'admin' ? <Link href="/admin">Admin</Link> : <Link href="/client">Workspace</Link>}
          <Link href="/client">Client View</Link>
          <form action="/auth/sign-out" method="post">
            <button type="submit">Sign out</button>
          </form>
        </nav>
      </header>

      <section className="saas-portal-hero">
        <div>
          <p className="saas-portal-eyebrow">{role === 'admin' ? 'SaaS administration' : 'Secure client workspace'}</p>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <aside>
          <span>{role}</span>
          <strong>{email || 'Signed in'}</strong>
        </aside>
      </section>

      <section className="saas-portal-content">
        {children}
      </section>
    </main>
  );
}
