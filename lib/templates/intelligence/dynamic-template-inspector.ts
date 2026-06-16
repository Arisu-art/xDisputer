import type { DynamicTemplateAssetInput, DynamicTemplateFinding, DynamicTemplateInspectionResult } from './dynamic-template-types';

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function finding(input: Omit<DynamicTemplateFinding, 'id' | 'suggestedRuleKey'> & { key: string }): DynamicTemplateFinding {
  const safeKey = input.key.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 96) || 'finding';
  return {
    id: safeKey,
    suggestedRuleKey: safeKey,
    ...input
  };
}

function canonicalGuess(token: string) {
  const lower = token.toLowerCase();
  if (lower.includes('name')) return 'consumer.full_name';
  if (lower.includes('address')) return 'consumer.address';
  if (lower.includes('creditor')) return 'account.creditor_name';
  if (lower.includes('account')) return 'account.account_number';
  if (lower.includes('bureau')) return 'bureau.name';
  if (lower.includes('reason')) return 'dispute.reason';
  if (token.includes('.')) return token;
  return undefined;
}

function detectVariablesFromValidation(asset: DynamicTemplateAssetInput) {
  const validation = asset.validation_json || {};
  const required = asStringArray(validation.requiredFields);
  const fulfilled = asStringArray(validation.fulfilledFields);
  const missing = new Set([...asStringArray(validation.missingFields), ...asStringArray(validation.unknownRequiredFields)]);
  const aliases = asStringArray(validation.aliasesUsed);
  const merged = Array.from(new Set([...required, ...fulfilled, ...aliases, ...Array.from(missing)]));
  return merged.map((token, index) => finding({
    key: `variable-${index + 1}-${token}`,
    type: missing.has(token) ? 'blocker-rule' : 'replace-variable',
    scope: 'field',
    sourcePath: `validation.fields[${index}]`,
    sourceText: token,
    suggestedCanonicalField: canonicalGuess(token),
    suggestedOutputToken: `{{${token}}}`,
    confidence: missing.has(token) ? 0.92 : 0.78,
    preserve: false,
    required: required.includes(token) || missing.has(token),
    reason: missing.has(token) ? 'Required variable is not mapped or fulfilled.' : 'Variable can be replaced from canonical/client data.'
  }));
}

function detectEntitiesFromVariables(variables: DynamicTemplateFinding[]) {
  const entityMap = new Map<string, string>();
  variables.forEach((variable) => {
    const field = variable.suggestedCanonicalField || variable.sourceText;
    const root = field.split('.')[0];
    if (root && root !== field) entityMap.set(root, field);
  });
  return Array.from(entityMap.entries()).map(([entity, sample], index) => finding({
    key: `entity-${entity}`,
    type: 'detect-entity',
    scope: 'template',
    sourcePath: `entities[${index}]`,
    sourceText: entity,
    suggestedCanonicalField: sample,
    confidence: 0.74,
    preserve: false,
    required: false,
    reason: `${entity} entity detected from canonical field usage.`
  }));
}

function detectStaticText(asset: DynamicTemplateAssetInput) {
  const filename = asset.original_filename || 'manager-template';
  return ['document-heading', 'legal-instruction-copy', 'signature-declaration'].map((key, index) => finding({
    key: `static-${key}`,
    type: key.includes('declaration') ? 'declaration-rule' : 'preserve-static-text',
    scope: key.includes('heading') ? 'section' : 'paragraph',
    sourcePath: `document.static[${index}]`,
    sourceText: `${filename}:${key}`,
    confidence: 0.68,
    preserve: true,
    required: key.includes('declaration'),
    reason: 'Static legal/document copy should be preserved unless a manager override exists.'
  }));
}

function detectTables(asset: DynamicTemplateAssetInput, variables: DynamicTemplateFinding[]) {
  const hasAccountFields = variables.some((variable) => variable.sourceText.toLowerCase().includes('account'));
  if (!hasAccountFields) return [];
  return [finding({
    key: 'table-account-summary-layout',
    type: 'table-layout',
    scope: 'table',
    sourcePath: 'document.tables.account-summary',
    sourceText: 'Account summary table',
    confidence: 0.71,
    preserve: true,
    required: true,
    reason: 'Account-related fields imply a table layout that must preserve visual structure while rows render dynamically.'
  })];
}

function detectParserFindings(variables: DynamicTemplateFinding[]) {
  return variables.filter((variable) => variable.suggestedOutputToken).slice(0, 12).map((variable, index) => finding({
    key: `parser-${variable.sourceText}`,
    type: 'parser-directive',
    scope: 'field',
    sourcePath: `parser.tokens[${index}]`,
    sourceText: variable.suggestedOutputToken || variable.sourceText,
    suggestedOutputToken: variable.suggestedOutputToken,
    confidence: 0.7,
    preserve: false,
    required: variable.required,
    reason: 'Parser must recognize this token before renderer replacement.'
  }));
}

function detectRendererFindings(variables: DynamicTemplateFinding[], tables: DynamicTemplateFinding[]) {
  const rendererVariables = variables.slice(0, 12).map((variable, index) => finding({
    key: `renderer-${variable.sourceText}`,
    type: 'renderer-directive',
    scope: 'field',
    sourcePath: `renderer.bindings[${index}]`,
    sourceText: variable.suggestedOutputToken || variable.sourceText,
    suggestedCanonicalField: variable.suggestedCanonicalField,
    suggestedOutputToken: variable.suggestedOutputToken,
    confidence: variable.suggestedCanonicalField ? 0.76 : 0.48,
    preserve: false,
    required: variable.required,
    reason: variable.suggestedCanonicalField ? 'Renderer can bind token to canonical field.' : 'Renderer needs a canonical field before release.'
  }));
  return [...rendererVariables, ...tables];
}

export function inspectDynamicTemplateFromAsset(asset: DynamicTemplateAssetInput): DynamicTemplateInspectionResult {
  const variables = detectVariablesFromValidation(asset);
  const staticTextBlocks = detectStaticText(asset);
  const entities = detectEntitiesFromVariables(variables);
  const tableLayouts = detectTables(asset, variables);
  const parserFindings = detectParserFindings(variables);
  const rendererFindings = detectRendererFindings(variables, tableLayouts);
  const blockers = variables.filter((item) => item.type === 'blocker-rule' || (item.required && !item.suggestedCanonicalField)).map((item) => `Resolve ${item.sourceText}.`);
  const warnings = [
    ...tableLayouts.map((item) => `Review table layout: ${item.sourceText}.`),
    ...(variables.length ? [] : ['No dynamic variables were detected from the template contract.'])
  ];
  const mappedFields = variables.filter((item) => item.suggestedCanonicalField);
  const suggestedRules = [...staticTextBlocks, ...variables, ...entities, ...tableLayouts, ...parserFindings, ...rendererFindings];
  return {
    templateAssetId: asset.id,
    managerUserId: asset.manager_user_id,
    roundLabel: asset.round_label || '1st Round',
    status: blockers.length ? 'blocked' : warnings.length ? 'warning' : 'ready',
    staticTextBlocks,
    variables,
    entities,
    mappedFields,
    tableLayouts,
    parserFindings,
    rendererFindings,
    blockers,
    warnings,
    suggestedRules
  };
}

export async function inspectDynamicTemplate(input: DynamicTemplateAssetInput) {
  return inspectDynamicTemplateFromAsset(input);
}
