import type { LetterRoute, ParsedSource } from '../letter-engine';
import type { Round } from '../reference-store';
import type { TemplateDocumentKind } from '../template-contracts';
import { inspectDynamicTemplateContractV2, type DynamicTemplateContractV2 } from './contract-v2';
import { buildDynamicTemplateRenderPlan, dynamicRenderPlanSummary, type DynamicRenderPlan } from './mapping-engine';
import { renderDocxLayoutV2, type DocxLayoutRendererV2Result } from './docx-layout-renderer-v2';
import { validateDynamicTemplateRender, dynamicTemplateRenderValidationManifest, type DynamicTemplateRenderValidationResult } from './render-validation';
import { gradeDynamicTemplateRender, dynamicTemplateQualityManifest, type DynamicTemplateQualityGrade } from './quality-framework';
import { resolveDynamicTemplateRendererMode, type DynamicTemplateRendererMode } from './renderer-mode';

export type DynamicTemplateEngineV2Result = {
  version: 1;
  status: 'RENDERED' | 'BLOCKED';
  blob: Blob;
  contract: DynamicTemplateContractV2;
  plan: DynamicRenderPlan;
  renderResult: DocxLayoutRendererV2Result;
  validation: DynamicTemplateRenderValidationResult;
  quality: DynamicTemplateQualityGrade;
  manifest: Record<string, unknown>;
};

export function shouldUseDynamicDocxLayoutV2(mode?: DynamicTemplateRendererMode | string | null) {
  return resolveDynamicTemplateRendererMode({ explicitMode: mode }) === 'DOCX_LAYOUT_V2';
}

export async function renderDynamicDocxTemplateV2(input: {
  template: File;
  kind: TemplateDocumentKind;
  parsed: ParsedSource;
  round: Round;
  route?: LetterRoute | null;
  documentDate: string;
  rendererMode?: DynamicTemplateRendererMode | string | null;
}): Promise<DynamicTemplateEngineV2Result> {
  const rendererMode = resolveDynamicTemplateRendererMode({ explicitMode: input.rendererMode });
  const contract = await inspectDynamicTemplateContractV2(input.template, input.kind, input.round);
  const plan = buildDynamicTemplateRenderPlan({
    contract,
    parsed: input.parsed,
    round: input.round,
    route: input.route,
    documentDate: input.documentDate
  });

  if (contract.status === 'BLOCKED' || plan.status === 'BLOCKED') {
    const reason = [
      ...contract.errors,
      ...plan.blockers,
      contract.missingFields.length ? `Missing required canonical field(s): ${contract.missingFields.join(', ')}.` : ''
    ].filter(Boolean).join(' ');
    throw new Error(`Dynamic Template Engine v2 blocked rendering. ${reason}`.trim());
  }

  const renderResult = await renderDocxLayoutV2({
    template: input.template,
    plan,
    rendererMode
  });
  const validation = await validateDynamicTemplateRender({ plan, renderResult });
  const quality = gradeDynamicTemplateRender({ contract, plan, validation });

  if (quality.status === 'BLOCKED') {
    throw new Error(`Dynamic Template Engine v2 output failed proof checks. ${quality.blockers.join(' ')}`.trim());
  }

  return {
    version: 1,
    status: 'RENDERED',
    blob: renderResult.blob,
    contract,
    plan,
    renderResult,
    validation,
    quality,
    manifest: {
      dynamicTemplateEngineV2: {
        version: 1,
        rendererMode,
        contract: {
          version: contract.version,
          kind: contract.kind,
          status: contract.status,
          confidence: contract.confidence,
          missingFields: contract.missingFields,
          warnings: contract.warnings,
          diagnostics: contract.diagnostics
        },
        renderPlan: dynamicRenderPlanSummary(plan),
        ...dynamicTemplateRenderValidationManifest(validation),
        ...dynamicTemplateQualityManifest(quality)
      }
    }
  };
}
