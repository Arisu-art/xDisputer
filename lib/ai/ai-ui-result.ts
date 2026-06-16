import type { AiMode, JsonObject, JsonValue } from './ai-types';

export type AiUiFindingSeverity = 'info' | 'warning' | 'blocker';

export type AiUiFinding = {
  severity: AiUiFindingSeverity;
  title: string;
  detail: string;
  source?: string;
};

export type AiUiSuggestedAction = {
  id: string;
  label: string;
  requiresApproval: boolean;
};

export type AiUiResult = {
  summary: string;
  findings: AiUiFinding[];
  suggestedActions: AiUiSuggestedAction[];
  requestId: string | null;
  modelName: string | null;
  latencyMs: number;
};

export type AiUiRequest = {
  mode: Extract<AiMode, 'source_review' | 'template_intelligence' | 'rag_answer' | 'admin_review'>;
  message: string;
  documentIds?: string[];
  metadata?: JsonObject;
  deterministicFindings?: AiUiFinding[];
  deterministicActions?: AiUiSuggestedAction[];
};

const MAX_TEXT = 500;
const MAX_SUMMARY = 1_200;
const MAX_FINDINGS = 12;
const MAX_ACTIONS = 8;
const SEVERITIES = new Set<AiUiFindingSeverity>(['info', 'warning', 'blocker']);

function cleanText(value: unknown, fallback = '') {
  return (typeof value === 'string' ? value : fallback)
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TEXT);
}

function cleanSummary(value: unknown) {
  return cleanText(value, 'AI review completed.').slice(0, MAX_SUMMARY);
}

function jsonObject(value: unknown): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as JsonObject;
}

function stringValue(value: JsonValue | undefined) {
  return typeof value === 'string' ? value : '';
}

function numberValue(value: JsonValue | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function normalizeFinding(value: unknown): AiUiFinding | null {
  const object = jsonObject(value);
  const severity = stringValue(object.severity) as AiUiFindingSeverity;
  const title = cleanText(object.title);
  const detail = cleanText(object.detail);

  if (!SEVERITIES.has(severity) || !title || !detail) return null;

  const source = cleanText(object.source);
  return source ? { severity, title, detail, source } : { severity, title, detail };
}

function normalizeAction(value: unknown): AiUiSuggestedAction | null {
  const object = jsonObject(value);
  const id = cleanText(object.id).replace(/[^a-z0-9_.:-]+/gi, '-').toLowerCase();
  const label = cleanText(object.label);
  const requiresApproval = object.requiresApproval === true;

  if (!id || !label) return null;
  return { id, label, requiresApproval };
}

function isFinding(value: AiUiFinding | null): value is AiUiFinding {
  return Boolean(value);
}

function isAction(value: AiUiSuggestedAction | null): value is AiUiSuggestedAction {
  return Boolean(value);
}

function uniqueFindings(findings: AiUiFinding[]) {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = `${finding.severity}:${finding.title}:${finding.detail}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, MAX_FINDINGS);
}

function uniqueActions(actions: AiUiSuggestedAction[]) {
  const seen = new Set<string>();
  return actions.filter((action) => {
    if (seen.has(action.id)) return false;
    seen.add(action.id);
    return true;
  }).slice(0, MAX_ACTIONS);
}

export function mergeAiUiResult(input: {
  summary: string;
  findings?: AiUiFinding[];
  suggestedActions?: AiUiSuggestedAction[];
  requestId?: string | null;
  modelName?: string | null;
  latencyMs?: number;
}): AiUiResult {
  return {
    summary: cleanSummary(input.summary),
    findings: uniqueFindings(input.findings || []),
    suggestedActions: uniqueActions(input.suggestedActions || []),
    requestId: input.requestId || null,
    modelName: input.modelName || null,
    latencyMs: Math.max(0, Math.round(input.latencyMs || 0))
  };
}

export function aiUiResultFromApi(payload: unknown, fallback: Pick<AiUiRequest, 'deterministicFindings' | 'deterministicActions'>): AiUiResult {
  const object = jsonObject(payload);
  const data = jsonObject(object.data);
  const answer = cleanSummary(data.answer || object.summary || 'AI review completed.');
  const rawFindings = Array.isArray(object.findings) ? object.findings : [];
  const rawActions = Array.isArray(object.suggestedActions) ? object.suggestedActions : [];
  const providerFindings = rawFindings.map(normalizeFinding).filter(isFinding);
  const providerActions = rawActions.map(normalizeAction).filter(isAction);

  return mergeAiUiResult({
    summary: answer,
    findings: [...(fallback.deterministicFindings || []), ...providerFindings],
    suggestedActions: [...(fallback.deterministicActions || []), ...providerActions],
    requestId: stringValue(data.requestId) || null,
    modelName: stringValue(data.modelName) || null,
    latencyMs: numberValue(data.latencyMs)
  });
}

export function aiUiErrorResult(message: string, deterministicFindings: AiUiFinding[] = []): AiUiResult {
  return mergeAiUiResult({
    summary: cleanText(message, 'AI review failed.'),
    findings: [
      ...deterministicFindings,
      { severity: 'warning', title: 'AI review unavailable', detail: 'The deterministic workflow is still active. Try the AI review again after the connection is restored.' }
    ],
    suggestedActions: []
  });
}
