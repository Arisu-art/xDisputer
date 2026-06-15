import ManagerTemplateWorkspaceClient from '../../ManagerTemplateWorkspaceClient';
import TemplateReadinessCard from './TemplateReadinessCard';
import type { TemplateLibraryContext } from '../../../lib/templates/workspace/template-library-service';

export default function TemplateLibraryHub({ context }: { context: TemplateLibraryContext }) {
  return <section className="template-workspace-hub" data-template-workspace-hub="library" data-template-process="template-source-of-truth">
    <TemplateReadinessCard contract={context.contract} summary={context.readinessSummary} action={context.nextAction} />
    <section className="template-workspace-hub-grid" aria-label="Template library sync state">
      <article className="admin-monitor-card template-workspace-status-card"><p className="eyebrow">Active round</p><strong>{context.activeRound}</strong><span>Round-specific manager defaults control the templates a client receives.</span></article>
      <article className="admin-monitor-card template-workspace-status-card"><p className="eyebrow">Latest version</p><strong>{context.contract.library.latestVersion || 'Draft'}</strong><span>{context.latestAsset?.original_filename || 'Upload a template to create the first managed version.'}</span></article>
      <article className="admin-monitor-card template-workspace-status-card"><p className="eyebrow">Client sync</p><strong>{context.syncStatusLabel}</strong><span>Assigned clients only use approved manager-owned templates for their round.</span></article>
    </section>
    <ManagerTemplateWorkspaceClient />
  </section>;
}
