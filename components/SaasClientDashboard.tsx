import Link from 'next/link';
import type { IntegrationHealthItem } from '../lib/saas/integration-health';

export type SaasClientDashboardProps = {
  email?: string | null;
  integrations: IntegrationHealthItem[];
};

export default function SaasClientDashboard({ email, integrations }: SaasClientDashboardProps) {
  return (
    <div className="saas-home-grid">
      <section className="saas-home-card saas-home-card-main">
        <p className="saas-portal-eyebrow">Client portal</p>
        <h2>Start from your SaaS dashboard</h2>
        <p>
          Your account is protected by Supabase. Use the workspace only when you are ready to prepare a document packet.
        </p>
        <div className="saas-home-actions">
          <Link href="/client/workspace">Open document workspace</Link>
          <Link href="/client/settings">Account settings</Link>
        </div>
      </section>

      <section className="saas-home-card">
        <p className="saas-portal-eyebrow">Signed in</p>
        <h2>{email || 'Client account'}</h2>
        <p>Client users can prepare packets, manage local workspace assets, and continue filing workflows.</p>
      </section>

      <section className="saas-home-card saas-home-wide">
        <p className="saas-portal-eyebrow">Connected platform</p>
        <h2>Integration status</h2>
        <div className="saas-integration-list">
          {integrations.map((item) => (
            <article key={item.id} className={`saas-integration-item ${item.status}`}>
              <span>{item.status}</span>
              <strong>{item.label}</strong>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
