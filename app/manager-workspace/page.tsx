import { redirect } from 'next/navigation';
import ConsoleNavLink from '../../components/ConsoleNavLink';
import { requireAuth } from '../../lib/saas/session';
import { resolveManagerTemplateScope } from '../../lib/manager-template-scope';
import { buildManagerTemplateLibrarySummary, managerTemplateQuality, managerTemplateSlotKey, type ManagerTemplateLibraryAsset } from '../../lib/manager-template-library';

const rounds = ['1st Round', '2nd Round', '3rd Round', 'Final'];
const letterSlots = [
  ['DISPUTE', 'Dispute Letter'],
  ['LATE_PAYMENT', 'Late Payment Letter']
] as const;
const exhibitSlots = [
  ['FCRA', 'FCRA Legal Exhibit PDF'],
  ['ATTACHMENT', 'Attachment PDF'],
  ['AFFIDAVIT', 'Affidavit DOCX'],
  ['FTC', 'FTC Identity Theft Report DOCX']
] as const;

function TemplateUploadCard({ round }: { round: string }) {
  return <article className="admin-monitor-card native-operation-card">
    <div className="admin-monitor-card-header"><div><p>{round}</p><h2>Upload manager defaults</h2></div><span>DOCX/PDF</span></div>
    <form action="/api/template-assets" method="post" encType="multipart/form-data" className="admin-power-list">
      <input type="hidden" name="round" value={round} />
      <input type="hidden" name="templateKind" value="LETTER" />
      <label>Letter template</label>
      <select name="letterType" required>{letterSlots.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <input name="file" type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required />
      <button type="submit" className="admin-action-button primary">Upload active letter default</button>
    </form>
    <form action="/api/template-assets" method="post" encType="multipart/form-data" className="admin-power-list">
      <input type="hidden" name="round" value={round} />
      <input type="hidden" name="templateKind" value="EXHIBIT" />
      <label>Packet exhibit</label>
      <select name="exhibitKind" required>{exhibitSlots.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <input name="file" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required />
      <button type="submit" className="admin-action-button primary">Upload active exhibit default</button>
    </form>
  </article>;
}

export default async function ManagerWorkspacePage() {
  const session = await requireAuth();
  if (!session.isManager && !session.isMaster) redirect(session.dashboardPath);
  const scope = await resolveManagerTemplateScope(session);
  const assetsResult = await session.supabase
    .from('template_assets')
    .select('id,round_label,template_kind,letter_type,exhibit_kind,original_filename,version_number,is_active,content_hash,validation_json,updated_at')
    .eq('manager_user_id', scope.managerUserId)
    .order('round_label', { ascending: true })
    .order('version_number', { ascending: false });
  const assets = (assetsResult.data || []) as ManagerTemplateLibraryAsset[];
  const clientCount = await session.supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('manager_id', scope.managerUserId).eq('role', 'client');
  const summary = buildManagerTemplateLibrarySummary({ managerUserId: scope.managerUserId, affectedClientCount: clientCount.count || 0, assets });

  return <main className="admin-monitor-page native-console manager-template-workspace">
    <aside className="admin-monitor-sidebar native-console-sidebar">
      <div className="admin-monitor-brand"><span>xD</span><div><strong>xDisputer</strong><small>Manager workspace</small></div></div>
      <div className="admin-sidebar-section-title">Workspace</div>
      <nav aria-label="Manager workspace navigation">
        <a className="active" href="/manager-workspace">Template library</a>
        <a href="/admin/access">Assigned clients</a>
        <a href="/admin">Operations console</a>
        <a href="/workspace">Client workspace view</a>
      </nav>
      <div className="admin-monitor-account"><strong>{session.profile?.email || session.user.email || 'Manager account'}</strong><small>Manager template authority</small><form action="/auth/sign-out" method="post"><button type="submit">Sign out</button></form></div>
    </aside>
    <section className="admin-monitor-main native-console-main">
      <header className="admin-monitor-header native-command-hero manager-compact-hero"><div><p>Manager workspace</p><h1>Default templates for assigned clients.</h1><span>Upload once here. All assigned clients generate with these active manager-approved templates.</span></div><ConsoleNavLink className="admin-action-button" href="/admin">Switch to Operations</ConsoleNavLink></header>
      <section className="admin-monitor-stats" aria-label="Manager template metrics"><article><p>Assigned clients</p><strong>{summary.affectedClientCount}</strong></article><article><p>Active slots</p><strong>{summary.activeSlotCount}</strong></article><article><p>Active files</p><strong>{summary.activeAssetCount}</strong></article><article><p>Archived</p><strong>{summary.historicalAssetCount}</strong></article></section>
      <section className="admin-power-grid">{rounds.map((round) => <TemplateUploadCard key={round} round={round} />)}</section>
      <section className="admin-monitor-card native-operation-card"><div className="admin-monitor-card-header"><div><p>Library</p><h2>Active and historical manager templates</h2></div><span>{summary.totalAssetCount} records</span></div>{assetsResult.error ? <div className="admin-monitor-empty">Could not load manager templates: {assetsResult.error.message}</div> : <div className="admin-monitor-table-wrap"><table className="admin-monitor-table"><thead><tr><th>Template</th><th>Slot</th><th>Version</th><th>Quality</th><th>Status</th></tr></thead><tbody>{assets.length ? assets.map((asset) => { const grade = managerTemplateQuality(asset); return <tr key={asset.id}><td><strong>{asset.original_filename}</strong><small>{asset.content_hash || asset.id}</small></td><td>{managerTemplateSlotKey(asset)}</td><td>v{asset.version_number || 1}</td><td>{grade.tier} · {grade.status}</td><td><span className={`admin-status-badge ${asset.is_active ? 'active' : 'disabled'}`}>{asset.is_active ? 'active' : 'archived'}</span></td></tr>; }) : <tr><td colSpan={5} className="admin-monitor-empty">No manager templates uploaded yet.</td></tr>}</tbody></table></div>}</section>
    </section>
  </main>;
}
