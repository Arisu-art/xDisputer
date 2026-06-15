import DynamicTemplateRuleControlPanel from './DynamicTemplateRuleControlPanel';
import TemplateReadinessCard from './TemplateReadinessCard';
import TemplateRuleEditor from './TemplateRuleEditor';
import type { DynamicTemplateInspectionResult, DynamicTemplateRule } from '../../../lib/templates/intelligence';
import type { TemplateLibraryContext } from '../../../lib/templates/workspace/template-library-service';
import type { TemplateStructureInspection } from '../../../lib/templates/workspace/template-studio-service';

export default function TemplateStudioHub({ context, inspection, intelligence, intelligenceRules }: { context: TemplateLibraryContext; inspection: TemplateStructureInspection; intelligence: DynamicTemplateInspectionResult; intelligenceRules: DynamicTemplateRule[] }) {
  return <section className="template-workspace-hub" data-template-workspace-hub="studio" data-template-process="template-authoring-rules">
    <TemplateReadinessCard contract={context.contract} summary="Template Studio controls parser rules, canonical mapping, static preservation, variables, entities, and table layout before the engine can release output." action={context.nextAction} />
    <DynamicTemplateRuleControlPanel inspection={intelligence} rules={intelligenceRules} />
    <section className="template-workspace-hub-grid studio" aria-label="Template Studio inspection summary">
      <article className="admin-monitor-card template-workspace-status-card"><p className="eyebrow">Static text</p><strong>{intelligence.staticTextBlocks.length}</strong><span>Legal and instruction blocks marked for preservation.</span></article>
      <article className="admin-monitor-card template-workspace-status-card"><p className="eyebrow">Variables</p><strong>{intelligence.variables.length}</strong><span>Detected template variables routed to canonical or manager rules.</span></article>
      <article className="admin-monitor-card template-workspace-status-card"><p className="eyebrow">Mapped fields</p><strong>{intelligence.mappedFields.length}</strong><span>Canonical mappings available for renderer replacement.</span></article>
    </section>
    <section className="template-workspace-two-column">
      <TemplateRuleEditor rules={inspection.rules} />
      <section className="admin-monitor-card template-rule-editor" data-template-studio-boundaries="true">
        <div className="admin-monitor-card-header"><div><p>Rule boundaries</p><h2>What Studio owns</h2></div><span className="template-workspace-pill ready">wired</span></div>
        <div className="template-rule-list">
          <article className="template-rule-row valid"><div><strong>Preserve static legal text</strong><span>Legal copy and declarations remain stable unless explicitly overridden by a manager rule.</span></div><small>preserve</small></article>
          <article className="template-rule-row valid"><div><strong>Map variables to canonical fields</strong><span>Variables must resolve through the canonical layer before release.</span></div><small>mapping</small></article>
          <article className="template-rule-row valid"><div><strong>Protect table layouts</strong><span>Tables preserve structure while rows can be generated from client data.</span></div><small>tables</small></article>
          <article className="template-rule-row warning"><div><strong>Route unresolved fields</strong><span>Unmapped required fields are routed to Studio, not hidden in the generation engine.</span></div><small>if/else</small></article>
        </div>
      </section>
    </section>
  </section>;
}
