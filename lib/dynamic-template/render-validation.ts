import PizZip from 'pizzip';
import type { DynamicRenderPlan } from './mapping-engine';
import type { DocxLayoutRendererV2Result } from './docx-layout-renderer-v2';

export type DynamicTemplateUnresolvedPlaceholder = {
  alias: string;
  partName: string;
  required: boolean;
};

export type DynamicTemplateRenderValidationResult = {
  version: 1;
  status: 'PASS' | 'WARNING' | 'FAIL';
  renderer: string;
  rendererVersion: string;
  rendererMode: string;
  planStatus: DynamicRenderPlan['status'];
  unresolvedPlaceholders: DynamicTemplateUnresolvedPlaceholder[];
  unresolvedRequiredPlaceholders: DynamicTemplateUnresolvedPlaceholder[];
  appliedOperationCount: number;
  skippedOperationCount: number;
  mutatedPartCount: number;
  repeatedOperationCount: number;
  tableRowCloneOperationCount: number;
  warnings: string[];
  blockers: string[];
  proof: {
    source: 'dynamic-template-render-validation';
    generatedAt: string;
    requiredFieldCount: number;
    availableRequiredFieldCount: number;
    missingRequiredFieldCount: number;
    operationCount: number;
    inlineOperationCount: number;
    multilineOperationCount: number;
    repeatOperationCount: number;
    tableRowCloneCount: number;
    conditionalOperationCount: number;
    unresolvedPlaceholderCount: number;
    unresolvedRequiredPlaceholderCount: number;
    mutatedParts: string[];
  };
};

const WORD_XML_PART = /^word\/(?:document|header\d+|footer\d+)\.xml$/i;
const PLACEHOLDER_PATTERN = /\{\{\s*([^{}]+?)\s*\}\}|\[\[\s*([^\[\]]+?)\s*\]\]|«\s*([^«»]+?)\s*»/g;

function tokenFromMatch(match: RegExpExecArray) {
  return String(match[1] || match[2] || match[3] || '').trim();
}

function normalizeAlias(value: string) {
  return value
    .replace(/^#|^\/|^if\./i, '')
    .replace(/^each\./i, '')
    .replace(/[{}\[\]«»]/g, '')
    .replace(/\s+/g, '_')
    .replace(/-/g, '_')
    .trim()
    .toLowerCase();
}

function requiredAliases(plan: DynamicRenderPlan) {
  const requiredCanonicalKeys = new Set(plan.fieldValues.filter((field) => field.available === false).map((field) => field.canonicalKey));
  const operationAliases = new Set<string>();

  plan.operations.forEach((operation) => {
    if (operation.alias && operation.canonicalKey && requiredCanonicalKeys.has(operation.canonicalKey)) {
      operationAliases.add(normalizeAlias(operation.alias));
    }
  });

  return operationAliases;
}

async function arrayBufferFromBlob(blob: Blob | ArrayBuffer) {
  return blob instanceof ArrayBuffer ? blob : await blob.arrayBuffer();
}

export async function scanUnresolvedPlaceholders(input: {
  rendered: Blob | ArrayBuffer;
  plan: DynamicRenderPlan;
}) {
  const zip = new PizZip(await arrayBufferFromBlob(input.rendered));
  const required = requiredAliases(input.plan);
  const unresolved: DynamicTemplateUnresolvedPlaceholder[] = [];

  for (const partName of Object.keys(zip.files).filter((name) => WORD_XML_PART.test(name))) {
    const file = zip.file(partName);
    if (!file) continue;

    const xml = file.asText();
    const matches = Array.from(xml.matchAll(PLACEHOLDER_PATTERN));

    matches.forEach((match) => {
      const alias = tokenFromMatch(match);
      if (!alias) return;
      const normalized = normalizeAlias(alias);
      unresolved.push({
        alias,
        partName,
        required: required.has(normalized) || !/^optional\./i.test(alias)
      });
    });
  }

  return unresolved;
}

export async function validateDynamicTemplateRender(input: {
  plan: DynamicRenderPlan;
  renderResult: DocxLayoutRendererV2Result;
}): Promise<DynamicTemplateRenderValidationResult> {
  const unresolvedPlaceholders = await scanUnresolvedPlaceholders({
    rendered: input.renderResult.blob,
    plan: input.plan
  });
  const unresolvedRequiredPlaceholders = unresolvedPlaceholders.filter((placeholder) => placeholder.required);
  const warnings = [...input.renderResult.proof.warnings];
  const blockers = [...input.renderResult.proof.blockers];

  if (unresolvedRequiredPlaceholders.length) {
    blockers.push(`Rendered DOCX still contains ${unresolvedRequiredPlaceholders.length} unresolved required placeholder(s).`);
  }

  if (unresolvedPlaceholders.length && !unresolvedRequiredPlaceholders.length) {
    warnings.push(`Rendered DOCX still contains ${unresolvedPlaceholders.length} optional or review placeholder(s).`);
  }

  const status: DynamicTemplateRenderValidationResult['status'] = blockers.length
    ? 'FAIL'
    : warnings.length || input.renderResult.proof.skippedOperations.length
      ? 'WARNING'
      : 'PASS';

  return {
    version: 1,
    status,
    renderer: input.renderResult.proof.renderer,
    rendererVersion: input.renderResult.proof.rendererVersion,
    rendererMode: input.renderResult.proof.rendererMode,
    planStatus: input.plan.status,
    unresolvedPlaceholders,
    unresolvedRequiredPlaceholders,
    appliedOperationCount: input.renderResult.proof.appliedOperations.length,
    skippedOperationCount: input.renderResult.proof.skippedOperations.length,
    mutatedPartCount: input.renderResult.proof.mutatedParts.length,
    repeatedOperationCount: input.plan.diagnostics.repeatOperationCount,
    tableRowCloneOperationCount: input.plan.diagnostics.tableRowCloneCount,
    warnings,
    blockers,
    proof: {
      source: 'dynamic-template-render-validation',
      generatedAt: new Date().toISOString(),
      requiredFieldCount: input.plan.diagnostics.requiredFieldCount,
      availableRequiredFieldCount: input.plan.diagnostics.availableRequiredFieldCount,
      missingRequiredFieldCount: input.plan.diagnostics.missingRequiredFieldCount,
      operationCount: input.plan.diagnostics.operationCount,
      inlineOperationCount: input.plan.diagnostics.inlineOperationCount,
      multilineOperationCount: input.plan.diagnostics.multilineOperationCount,
      repeatOperationCount: input.plan.diagnostics.repeatOperationCount,
      tableRowCloneCount: input.plan.diagnostics.tableRowCloneCount,
      conditionalOperationCount: input.plan.diagnostics.conditionalOperationCount,
      unresolvedPlaceholderCount: unresolvedPlaceholders.length,
      unresolvedRequiredPlaceholderCount: unresolvedRequiredPlaceholders.length,
      mutatedParts: input.renderResult.proof.mutatedParts
    }
  };
}

export function dynamicTemplateRenderValidationManifest(validation: DynamicTemplateRenderValidationResult) {
  return {
    dynamicTemplateRenderer: {
      version: validation.version,
      status: validation.status,
      renderer: validation.renderer,
      rendererVersion: validation.rendererVersion,
      rendererMode: validation.rendererMode,
      planStatus: validation.planStatus,
      appliedOperationCount: validation.appliedOperationCount,
      skippedOperationCount: validation.skippedOperationCount,
      mutatedPartCount: validation.mutatedPartCount,
      repeatedOperationCount: validation.repeatedOperationCount,
      tableRowCloneOperationCount: validation.tableRowCloneOperationCount,
      unresolvedPlaceholderCount: validation.unresolvedPlaceholders.length,
      unresolvedRequiredPlaceholderCount: validation.unresolvedRequiredPlaceholders.length,
      warnings: validation.warnings,
      blockers: validation.blockers,
      proof: validation.proof
    }
  };
}
