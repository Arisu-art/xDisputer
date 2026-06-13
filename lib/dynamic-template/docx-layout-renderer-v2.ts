import PizZip from 'pizzip';
import { DOCX_MIME } from '../docx-renderer';
import { assertDocxLayoutRendererV2Allowed, type DynamicTemplateRendererMode } from './renderer-mode';
import type { DynamicRenderPlan, DynamicRenderPlanOperation, DynamicRenderPlanValue } from './mapping-engine';

export type DocxLayoutRendererV2AppliedOperation = {
  kind: string;
  alias?: string | null;
  canonicalKey?: string | null;
  partName?: string | null;
  replacements: number;
  note: string;
};

export type DocxLayoutRendererV2SkippedOperation = {
  kind: string;
  alias?: string | null;
  canonicalKey?: string | null;
  partName?: string | null;
  reason: string;
};

export type DocxLayoutRendererV2Result = {
  blob: Blob;
  proof: {
    renderer: 'DOCX_LAYOUT_RENDERER_V2';
    rendererVersion: '0.1.0-foundation';
    rendererMode: DynamicTemplateRendererMode;
    planStatus: DynamicRenderPlan['status'];
    mutatedParts: string[];
    appliedOperations: DocxLayoutRendererV2AppliedOperation[];
    skippedOperations: DocxLayoutRendererV2SkippedOperation[];
    warnings: string[];
    blockers: string[];
  };
};

const WORD_XML_PART = /^word\/(?:document|header\d+|footer\d+)\.xml$/i;
const TABLE_ROW_PATTERN = /<w:tr[\s\S]*?<\/w:tr>/gi;
const PLACEHOLDER_PATTERN = /\{\{\s*([^{}]+?)\s*\}\}|\[\[\s*([^\[\]]+?)\s*\]\]|«\s*([^«»]+?)\s*»/g;

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeAlias(value: string) {
  return value
    .replace(/^#|^\/|^if\./i, '')
    .replace(/^each\./i, '')
    .replace(/[{}\[\]«»]/g, '')
    .replace(/\s+/g, '_')
    .replace(/-/g, '_')
    .replace(/^account\./i, '')
    .replace(/^inquiry\./i, '')
    .trim()
    .toLowerCase();
}

function aliasRegex(alias: string) {
  const flexibleAlias = alias.trim().split(/\s+/).map(escapeRegExp).join('\\s+');
  return new RegExp(`\\{\\{\\s*${flexibleAlias}\\s*\\}\\}|\\[\\[\\s*${flexibleAlias}\\s*\\]\\]|«\\s*${flexibleAlias}\\s*»`, 'g');
}

function tokenFromMatch(match: RegExpExecArray) {
  return String(match[1] || match[2] || match[3] || '').trim();
}

function valueToText(value: DynamicRenderPlanValue | undefined) {
  if (!value) return '';
  if (typeof value.value === 'boolean') return '';
  if (typeof value.value === 'string') return value.value;
  if (Array.isArray(value.value)) {
    if (!value.value.length) return '';
    if (typeof value.value[0] === 'string') return (value.value as string[]).join('\n');
    return (value.value as Array<Record<string, string | string[]>>)
      .map((record) => String(record.display_text || record.account_line || record.inquiry_line || Object.values(record).flat().join(' ')))
      .filter(Boolean)
      .join('\n\n');
  }
  return '';
}

function textForXml(value: DynamicRenderPlanValue | undefined) {
  return escapeXml(valueToText(value)).replace(/\n/g, '&#10;');
}

function recordValue(record: Record<string, string | string[]>, alias: string) {
  const key = normalizeAlias(alias);
  const direct = record[key];
  if (Array.isArray(direct)) return direct.join('\n');
  if (typeof direct === 'string') return direct;

  const fallbackKeys = ['display_text', 'account_line', 'inquiry_line', 'statement_line'];
  for (const fallback of fallbackKeys) {
    const value = record[fallback];
    if (Array.isArray(value)) return value.join('\n');
    if (typeof value === 'string' && value.trim()) return value;
  }

  return '';
}

function recordsForOperation(operation: DynamicRenderPlanOperation) {
  const raw = operation.value?.value;
  if (!Array.isArray(raw)) return [];
  if (!raw.length) return [];
  if (typeof raw[0] === 'string') {
    return (raw as string[]).map((line, index) => ({ index: String(index + 1), number: String(index + 1), display_text: line }));
  }
  return raw as Array<Record<string, string | string[]>>;
}

function replaceAlias(xml: string, alias: string, replacement: string) {
  const next = xml.replace(aliasRegex(alias), replacement);
  return { xml: next, replacements: next === xml ? 0 : (xml.match(aliasRegex(alias)) || []).length };
}

function replaceInlineOperation(xml: string, operation: DynamicRenderPlanOperation) {
  if (!operation.alias) return { xml, replacements: 0 };
  return replaceAlias(xml, operation.alias, textForXml(operation.value));
}

function replaceConditionalOperation(xml: string, operation: DynamicRenderPlanOperation) {
  if (!operation.alias) return { xml, replacements: 0 };
  return replaceAlias(xml, operation.alias, '');
}

function replaceRecordTokens(rowXml: string, record: Record<string, string | string[]>) {
  let output = rowXml;
  const matches = Array.from(rowXml.matchAll(PLACEHOLDER_PATTERN));

  for (const match of matches) {
    const alias = tokenFromMatch(match);
    const replacement = escapeXml(recordValue(record, alias)).replace(/\n/g, '&#10;');
    output = replaceAlias(output, alias, replacement).xml;
  }

  return output;
}

function cloneTableRowOperation(xml: string, operation: DynamicRenderPlanOperation) {
  const records = recordsForOperation(operation);
  if (!records.length || !operation.alias) return { xml, replacements: 0 };

  let rowNumber = 0;
  let replacements = 0;
  const next = xml.replace(TABLE_ROW_PATTERN, (rowXml) => {
    rowNumber += 1;
    const explicitIndexMatches = operation.tableRowIndex && rowNumber === operation.tableRowIndex;
    const aliasMatches = aliasRegex(operation.alias || '').test(rowXml);

    if (!explicitIndexMatches && !aliasMatches) return rowXml;

    replacements += 1;
    return records.map((record) => replaceRecordTokens(rowXml, record)).join('');
  });

  return { xml: next, replacements };
}

function replaceParagraphRepeatOperation(xml: string, operation: DynamicRenderPlanOperation) {
  if (!operation.alias) return { xml, replacements: 0 };
  return replaceAlias(xml, operation.alias, textForXml(operation.value));
}

function renderPart(xml: string, operations: DynamicRenderPlanOperation[]) {
  let output = xml;
  const applied: DocxLayoutRendererV2AppliedOperation[] = [];
  const skipped: DocxLayoutRendererV2SkippedOperation[] = [];

  for (const operation of operations) {
    let result = { xml: output, replacements: 0 };

    if (operation.kind === 'INLINE_REPLACE' || operation.kind === 'MULTILINE_REPLACE') {
      result = replaceInlineOperation(output, operation);
    } else if (operation.kind === 'CONDITIONAL_SECTION') {
      result = replaceConditionalOperation(output, operation);
    } else if (operation.kind === 'TABLE_ROW_CLONE') {
      result = cloneTableRowOperation(output, operation);
    } else if (operation.kind === 'REPEAT_BLOCK') {
      result = replaceParagraphRepeatOperation(output, operation);
    } else {
      skipped.push({
        kind: operation.kind,
        alias: operation.alias || null,
        canonicalKey: operation.canonicalKey || null,
        partName: operation.partName || null,
        reason: 'Operation kind is not applicable to DOCX XML mutation.'
      });
      continue;
    }

    output = result.xml;

    if (result.replacements > 0) {
      applied.push({
        kind: operation.kind,
        alias: operation.alias || null,
        canonicalKey: operation.canonicalKey || null,
        partName: operation.partName || null,
        replacements: result.replacements,
        note: operation.kind === 'TABLE_ROW_CLONE'
          ? 'Cloned existing table row prototype and replaced placeholders inside each clone.'
          : 'Replaced placeholder text in-place while preserving surrounding DOCX XML.'
      });
    } else {
      skipped.push({
        kind: operation.kind,
        alias: operation.alias || null,
        canonicalKey: operation.canonicalKey || null,
        partName: operation.partName || null,
        reason: 'No contiguous placeholder token was found in this XML part. It may be split across runs and will be handled by a later renderer-v2 phase.'
      });
    }
  }

  return { xml: output, applied, skipped };
}

function operationsForPart(plan: DynamicRenderPlan, partName: string) {
  return plan.operations.filter((operation) => operation.partName === partName);
}

export async function renderDocxLayoutV2(input: {
  template: File;
  plan: DynamicRenderPlan;
  rendererMode: DynamicTemplateRendererMode;
}): Promise<DocxLayoutRendererV2Result> {
  assertDocxLayoutRendererV2Allowed(input.rendererMode);

  if (input.plan.status === 'BLOCKED') {
    throw new Error(`DOCX layout renderer v2 refused to render a blocked plan: ${input.plan.blockers.join(' ')}`);
  }

  if (input.plan.status === 'STATIC') {
    return {
      blob: input.template,
      proof: {
        renderer: 'DOCX_LAYOUT_RENDERER_V2',
        rendererVersion: '0.1.0-foundation',
        rendererMode: input.rendererMode,
        planStatus: input.plan.status,
        mutatedParts: [],
        appliedOperations: [],
        skippedOperations: [],
        warnings: ['Static packet component returned unchanged.'],
        blockers: []
      }
    };
  }

  const zip = new PizZip(await input.template.arrayBuffer());
  const mutatedParts: string[] = [];
  const appliedOperations: DocxLayoutRendererV2AppliedOperation[] = [];
  const skippedOperations: DocxLayoutRendererV2SkippedOperation[] = [];

  for (const partName of Object.keys(zip.files).filter((name) => WORD_XML_PART.test(name))) {
    const file = zip.file(partName);
    if (!file) continue;

    const operations = operationsForPart(input.plan, partName);
    if (!operations.length) continue;

    const originalXml = file.asText();
    const rendered = renderPart(originalXml, operations);

    if (rendered.xml !== originalXml) {
      zip.file(partName, rendered.xml);
      mutatedParts.push(partName);
    }

    appliedOperations.push(...rendered.applied);
    skippedOperations.push(...rendered.skipped);
  }

  const blob = zip.generate({ type: 'blob', mimeType: DOCX_MIME, compression: 'DEFLATE' });

  return {
    blob,
    proof: {
      renderer: 'DOCX_LAYOUT_RENDERER_V2',
      rendererVersion: '0.1.0-foundation',
      rendererMode: input.rendererMode,
      planStatus: input.plan.status,
      mutatedParts,
      appliedOperations,
      skippedOperations,
      warnings: [
        ...input.plan.warnings,
        skippedOperations.length ? `${skippedOperations.length} operation(s) were skipped because their placeholders were not contiguous in XML.` : ''
      ].filter(Boolean),
      blockers: input.plan.blockers
    }
  };
}
