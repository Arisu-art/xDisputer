import { bureauInfo, type LetterRoute, type ParsedSource } from '../letter-engine';
import type { Round } from '../reference-store';
import type { TemplateDocumentKind } from '../template-contracts';
import type { DynamicTemplateContractV2, DynamicTemplateFieldOccurrence, DynamicTemplateRepeatBlock } from './contract-v2';
import { dynamicFieldDefinition, type DynamicCanonicalFieldKey } from './field-registry';

export type DynamicRenderPlanStatus = 'READY' | 'WARNING' | 'BLOCKED' | 'STATIC';
export type DynamicRenderPlanOperationKind = 'INLINE_REPLACE' | 'MULTILINE_REPLACE' | 'REPEAT_BLOCK' | 'TABLE_ROW_CLONE' | 'CONDITIONAL_SECTION' | 'STATIC_INSERT';

export type DynamicRenderPlanValue = {
  canonicalKey: DynamicCanonicalFieldKey;
  value: string | string[] | Array<Record<string, string | string[]>> | boolean;
  available: boolean;
  source: string;
};

export type DynamicRenderPlanOperation = {
  kind: DynamicRenderPlanOperationKind;
  canonicalKey?: DynamicCanonicalFieldKey;
  alias?: string;
  partName?: string;
  occurrenceIndex?: number;
  location?: string;
  tableRowIndex?: number | null;
  value?: DynamicRenderPlanValue;
  repeatCount?: number;
  preserveStyle: boolean;
  notes: string[];
};

export type DynamicRenderPlan = {
  version: 1;
  rendererMode: 'CONTRACT_V2_RENDER_PLAN_ONLY';
  status: DynamicRenderPlanStatus;
  kind: TemplateDocumentKind;
  round: Round;
  routeKey: string | null;
  routeType: string | null;
  bureau: string | null;
  fieldValues: DynamicRenderPlanValue[];
  operations: DynamicRenderPlanOperation[];
  blockers: string[];
  warnings: string[];
  diagnostics: {
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
  };
};

function nonEmpty(value: unknown) {
  return typeof value === 'string' ? value.trim().length > 0 : Array.isArray(value) ? value.length > 0 : Boolean(value);
}

function joinLines(values: string[]) {
  return values.filter((line) => line.trim()).join('\n');
}

function routeAccountRows(route: LetterRoute | null | undefined) {
  return (route?.items || []).map((item, index) => ({
    index: String(index + 1),
    number: String(index + 1),
    display_text: item.displayText,
    account_line: item.displayText,
    account_name: (item.displayText.split('\n').find((line) => /^Account Name:/i.test(line)) || '').replace(/^Account Name:\s*/i, ''),
    account_number: (item.displayText.split('\n').find((line) => /^Account Number:/i.test(line)) || '').replace(/^Account Number:\s*/i, '')
  }));
}

function hardInquiryRows(route: LetterRoute | null | undefined) {
  return (route?.items || [])
    .filter((item) => item.type === 'HARD_INQUIRY')
    .map((item, index) => ({
      index: String(index + 1),
      number: String(index + 1),
      inquiry_line: item.displayText,
      display_text: item.displayText
    }));
}

function ftcRows(parsed: ParsedSource) {
  return parsed.ftcAccounts.map((item, index) => ({
    index: String(index + 1),
    number: String(index + 1),
    account_name: item.accountName,
    account_number: item.accountNumber,
    fraud_began: item.fraudBegan,
    date_discovered: item.dateDiscovered,
    fraudulent_amount: item.fraudulentAmount,
    display_text: [
      item.accountName ? `Account Name: ${item.accountName}` : '',
      item.accountNumber ? `Account Number: ${item.accountNumber}` : '',
      item.dateDiscovered ? `Date Discovered: ${item.dateDiscovered}` : '',
      item.fraudulentAmount ? `Fraudulent Amount: ${item.fraudulentAmount}` : ''
    ].filter(Boolean).join('\n')
  }));
}

function currentBureau(route: LetterRoute | null | undefined) {
  return route?.bureau || null;
}

function bureauAddress(route: LetterRoute | null | undefined) {
  return route?.bureau ? bureauInfo[route.bureau].address.split('\n') : [];
}

function bureauName(route: LetterRoute | null | undefined) {
  return route?.bureau ? bureauInfo[route.bureau].name : '';
}

function valueForField(input: {
  key: DynamicCanonicalFieldKey;
  parsed: ParsedSource;
  route?: LetterRoute | null;
  round: Round;
  documentDate: string;
}): DynamicRenderPlanValue {
  const { key, parsed, route, round, documentDate } = input;

  switch (key) {
    case 'client.name':
      return { canonicalKey: key, value: parsed.name, available: nonEmpty(parsed.name), source: 'parsed.name' };
    case 'client.addressLines':
      return { canonicalKey: key, value: parsed.address, available: nonEmpty(parsed.address), source: 'parsed.address' };
    case 'client.dob':
      return { canonicalKey: key, value: parsed.dob, available: nonEmpty(parsed.dob), source: 'parsed.dob' };
    case 'client.ssnMasked':
      return { canonicalKey: key, value: parsed.ssn, available: nonEmpty(parsed.ssn), source: 'parsed.ssn' };
    case 'client.email':
      return { canonicalKey: key, value: parsed.email, available: nonEmpty(parsed.email), source: 'parsed.email' };
    case 'client.phone':
      return { canonicalKey: key, value: parsed.phone, available: nonEmpty(parsed.phone), source: 'parsed.phone' };
    case 'letter.date':
      return { canonicalKey: key, value: documentDate, available: nonEmpty(documentDate), source: 'documentDate' };
    case 'letter.round':
      return { canonicalKey: key, value: round, available: nonEmpty(round), source: 'round' };
    case 'bureau.name':
      return { canonicalKey: key, value: bureauName(route), available: nonEmpty(bureauName(route)), source: 'route.bureau.name' };
    case 'bureau.addressLines':
      return { canonicalKey: key, value: bureauAddress(route), available: nonEmpty(bureauAddress(route)), source: 'route.bureau.address' };
    case 'accounts.dispute': {
      const rows = route?.type === 'DISPUTE' ? routeAccountRows(route) : [];
      return { canonicalKey: key, value: rows, available: rows.length > 0, source: 'route.items[DISPUTE_ACCOUNT]' };
    }
    case 'accounts.latePayments': {
      const rows = route?.type === 'LATE_PAYMENT' ? routeAccountRows(route) : [];
      return { canonicalKey: key, value: rows, available: rows.length > 0, source: 'route.items[LATE_PAYMENT]' };
    }
    case 'accounts.ftcAffected': {
      const rows = ftcRows(parsed);
      return { canonicalKey: key, value: rows, available: rows.length > 0, source: 'parsed.ftcAccounts' };
    }
    case 'inquiries.hard': {
      const rows = hardInquiryRows(route);
      return { canonicalKey: key, value: rows, available: rows.length > 0, source: 'route.items[HARD_INQUIRY]' };
    }
    case 'affidavit.state':
      return { canonicalKey: key, value: parsed.affidavitState, available: nonEmpty(parsed.affidavitState), source: 'parsed.affidavitState' };
    case 'affidavit.county':
      return { canonicalKey: key, value: parsed.affidavitCounty, available: nonEmpty(parsed.affidavitCounty), source: 'parsed.affidavitCounty' };
    case 'ftc.reportNumber':
      return { canonicalKey: key, value: parsed.ftcReportNumber, available: nonEmpty(parsed.ftcReportNumber), source: 'parsed.ftcReportNumber' };
    case 'ftc.reportDate':
      return { canonicalKey: key, value: parsed.ftcReportDate, available: nonEmpty(parsed.ftcReportDate), source: 'parsed.ftcReportDate' };
    case 'ftc.statement':
      return { canonicalKey: key, value: parsed.templateFields.ftcStatement || parsed.templateFields.ftc_statement || '', available: nonEmpty(parsed.templateFields.ftcStatement || parsed.templateFields.ftc_statement), source: 'parsed.templateFields.ftcStatement' };
    case 'conditional.hasDisputeAccounts': {
      const rows = route?.type === 'DISPUTE' ? routeAccountRows(route) : [];
      return { canonicalKey: key, value: rows.length > 0, available: true, source: 'route.items.length > 0' };
    }
    case 'conditional.hasLatePayments': {
      const rows = route?.type === 'LATE_PAYMENT' ? routeAccountRows(route) : [];
      return { canonicalKey: key, value: rows.length > 0, available: true, source: 'route.items.length > 0' };
    }
    case 'conditional.hasHardInquiries': {
      const rows = hardInquiryRows(route);
      return { canonicalKey: key, value: rows.length > 0, available: true, source: 'route.items[HARD_INQUIRY].length > 0' };
    }
    case 'conditional.hasFtcAccounts': {
      const rows = ftcRows(parsed);
      return { canonicalKey: key, value: rows.length > 0, available: true, source: 'parsed.ftcAccounts.length > 0' };
    }
  }
}

function operationKindForOccurrence(occurrence: DynamicTemplateFieldOccurrence): DynamicRenderPlanOperationKind {
  const definition = dynamicFieldDefinition(occurrence.canonicalKey);
  if (definition?.kind === 'CONDITIONAL_BLOCK') return 'CONDITIONAL_SECTION';
  if (definition?.kind === 'MULTILINE') return 'MULTILINE_REPLACE';
  if (definition?.kind === 'REPEATING_BLOCK') return occurrence.insideTableRow ? 'TABLE_ROW_CLONE' : 'REPEAT_BLOCK';
  return 'INLINE_REPLACE';
}

function repeatCount(value: DynamicRenderPlanValue | undefined) {
  return Array.isArray(value?.value) ? value.value.length : typeof value?.value === 'boolean' ? Number(value.value) : value?.available ? 1 : 0;
}

function operationForOccurrence(occurrence: DynamicTemplateFieldOccurrence, values: Map<DynamicCanonicalFieldKey, DynamicRenderPlanValue>): DynamicRenderPlanOperation {
  const value = values.get(occurrence.canonicalKey);
  const kind = operationKindForOccurrence(occurrence);

  return {
    kind,
    canonicalKey: occurrence.canonicalKey,
    alias: occurrence.alias,
    partName: occurrence.partName,
    occurrenceIndex: occurrence.occurrenceIndex,
    location: occurrence.location,
    tableRowIndex: occurrence.tableRowIndex || null,
    value,
    repeatCount: kind === 'REPEAT_BLOCK' || kind === 'TABLE_ROW_CLONE' ? repeatCount(value) : undefined,
    preserveStyle: true,
    notes: [
      'Do not rebuild this location from scratch.',
      occurrence.insideTableRow ? 'Clone and mutate the existing table row prototype.' : 'Replace placeholder content while preserving surrounding DOCX styles.'
    ]
  };
}

function operationForRepeatBlock(block: DynamicTemplateRepeatBlock, values: Map<DynamicCanonicalFieldKey, DynamicRenderPlanValue>): DynamicRenderPlanOperation {
  const value = values.get(block.canonicalKey);

  return {
    kind: block.renderIntent === 'CLONE_TABLE_ROW' ? 'TABLE_ROW_CLONE' : 'REPEAT_BLOCK',
    canonicalKey: block.canonicalKey,
    alias: block.alias,
    partName: block.partName,
    location: block.location,
    tableRowIndex: block.tableRowIndex || null,
    value,
    repeatCount: repeatCount(value),
    preserveStyle: true,
    notes: [
      block.blockType === 'TABLE_ROW_PROTOTYPE' ? 'Renderer-v2 must clone this table row and preserve widths, borders, shading, and run style.' : 'Renderer-v2 must clone the nearest styled paragraph/block prototype.'
    ]
  };
}

export function buildDynamicTemplateRenderPlan(input: {
  contract: DynamicTemplateContractV2;
  parsed: ParsedSource;
  round: Round;
  route?: LetterRoute | null;
  documentDate: string;
}): DynamicRenderPlan {
  if (input.contract.staticPdf) {
    return {
      version: 1,
      rendererMode: 'CONTRACT_V2_RENDER_PLAN_ONLY',
      status: 'STATIC',
      kind: input.contract.kind,
      round: input.round,
      routeKey: null,
      routeType: null,
      bureau: null,
      fieldValues: [],
      operations: [{ kind: 'STATIC_INSERT', preserveStyle: true, notes: ['Static PDF component must be inserted unchanged.'] }],
      blockers: [],
      warnings: input.contract.warnings,
      diagnostics: {
        requiredFieldCount: 0,
        availableRequiredFieldCount: 0,
        missingRequiredFieldCount: 0,
        operationCount: 1,
        inlineOperationCount: 0,
        multilineOperationCount: 0,
        repeatOperationCount: 0,
        tableRowCloneCount: 0,
        conditionalOperationCount: 0,
        unresolvedPlaceholderCount: 0
      }
    };
  }

  const uniqueKeys = Array.from(new Set([...input.contract.requiredFields, ...input.contract.optionalFields, ...input.contract.fulfilledFields]));
  const fieldValues = uniqueKeys.map((key) => valueForField({ key, parsed: input.parsed, route: input.route, round: input.round, documentDate: input.documentDate }));
  const values = new Map(fieldValues.map((value) => [value.canonicalKey, value]));
  const blockers: string[] = [...input.contract.errors];
  const warnings: string[] = [...input.contract.warnings];

  for (const field of input.contract.requiredFields) {
    const value = values.get(field);
    if (!value?.available) blockers.push(`Required field ${field} has no source value for this route/document.`);
  }

  input.contract.unknownPlaceholders.filter((item) => item.required).forEach((item) => {
    blockers.push(`Unknown required placeholder ${item.alias} must be mapped before renderer-v2 can run.`);
  });

  const occurrenceOperations = input.contract.fieldOccurrences.map((occurrence) => operationForOccurrence(occurrence, values));
  const repeatOperations = input.contract.repeatBlocks.map((block) => operationForRepeatBlock(block, values));
  const operationKey = (operation: DynamicRenderPlanOperation) => [operation.kind, operation.canonicalKey, operation.partName, operation.tableRowIndex, operation.occurrenceIndex].join('::');
  const operations = Array.from(new Map([...occurrenceOperations, ...repeatOperations].map((operation) => [operationKey(operation), operation])).values());

  const availableRequired = input.contract.requiredFields.filter((field) => values.get(field)?.available).length;
  const tableRowCloneCount = operations.filter((operation) => operation.kind === 'TABLE_ROW_CLONE').length;
  const repeatOperationCount = operations.filter((operation) => operation.kind === 'REPEAT_BLOCK' || operation.kind === 'TABLE_ROW_CLONE').length;
  const status: DynamicRenderPlanStatus = blockers.length ? 'BLOCKED' : warnings.length ? 'WARNING' : 'READY';

  return {
    version: 1,
    rendererMode: 'CONTRACT_V2_RENDER_PLAN_ONLY',
    status,
    kind: input.contract.kind,
    round: input.round,
    routeKey: input.route ? `${input.route.type}:${input.route.bureau}` : null,
    routeType: input.route?.type || null,
    bureau: currentBureau(input.route),
    fieldValues,
    operations,
    blockers,
    warnings,
    diagnostics: {
      requiredFieldCount: input.contract.requiredFields.length,
      availableRequiredFieldCount: availableRequired,
      missingRequiredFieldCount: input.contract.requiredFields.length - availableRequired,
      operationCount: operations.length,
      inlineOperationCount: operations.filter((operation) => operation.kind === 'INLINE_REPLACE').length,
      multilineOperationCount: operations.filter((operation) => operation.kind === 'MULTILINE_REPLACE').length,
      repeatOperationCount,
      tableRowCloneCount,
      conditionalOperationCount: operations.filter((operation) => operation.kind === 'CONDITIONAL_SECTION').length,
      unresolvedPlaceholderCount: input.contract.unknownPlaceholders.length
    }
  };
}

export function dynamicRenderPlanSummary(plan: DynamicRenderPlan) {
  return {
    version: plan.version,
    rendererMode: plan.rendererMode,
    status: plan.status,
    kind: plan.kind,
    round: plan.round,
    routeKey: plan.routeKey,
    blockers: plan.blockers,
    warnings: plan.warnings,
    diagnostics: plan.diagnostics,
    operations: plan.operations.map((operation) => ({
      kind: operation.kind,
      canonicalKey: operation.canonicalKey || null,
      alias: operation.alias || null,
      location: operation.location || null,
      tableRowIndex: operation.tableRowIndex || null,
      repeatCount: operation.repeatCount ?? null,
      preserveStyle: operation.preserveStyle
    }))
  };
}
