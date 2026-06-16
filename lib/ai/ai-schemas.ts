import { fail, ok, type Result } from '../core/result';
import { AI_MODES, type AiMode, type AiRequestInput, type JsonObject, type JsonValue } from './ai-types';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_MESSAGE_LENGTH = 8_000;
const MAX_DOCUMENT_IDS = 50;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null) return true;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return Number.isFinite(value as number) || typeof value !== 'number';
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  if (isRecord(value)) {
    return Object.values(value).every(isJsonValue);
  }

  return false;
}

function toJsonObject(value: unknown): JsonObject {
  if (!isRecord(value)) return {};

  return Object.entries(value).reduce<JsonObject>((metadata, [key, item]) => {
    if (key && isJsonValue(item)) {
      metadata[key] = item;
    }

    return metadata;
  }, {});
}

function isAiMode(value: unknown): value is AiMode {
  return typeof value === 'string' && AI_MODES.includes(value as AiMode);
}

function parseDocumentIds(value: unknown): Result<string[]> {
  if (value === undefined || value === null) return ok([]);

  if (!Array.isArray(value)) {
    return fail('VALIDATION_ERROR', 'documentIds must be an array of UUID strings.');
  }

  if (value.length > MAX_DOCUMENT_IDS) {
    return fail('VALIDATION_ERROR', `documentIds cannot exceed ${MAX_DOCUMENT_IDS} items.`);
  }

  const ids = value.map((item) => String(item).trim()).filter(Boolean);
  const invalidId = ids.find((id) => !UUID_PATTERN.test(id));

  if (invalidId) {
    return fail('VALIDATION_ERROR', 'documentIds contains an invalid UUID.', { invalidId });
  }

  return ok(Array.from(new Set(ids)));
}

export function parseAiRequestInput(raw: unknown): Result<AiRequestInput> {
  if (!isRecord(raw)) {
    return fail('VALIDATION_ERROR', 'Request body must be a JSON object.');
  }

  const mode = raw.mode === undefined ? 'direct_answer' : raw.mode;

  if (!isAiMode(mode)) {
    return fail('VALIDATION_ERROR', 'Invalid AI mode.', { allowedModes: AI_MODES });
  }

  const message = typeof raw.message === 'string' ? raw.message.trim() : '';

  if (!message) {
    return fail('VALIDATION_ERROR', 'message is required.');
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return fail('VALIDATION_ERROR', `message cannot exceed ${MAX_MESSAGE_LENGTH} characters.`);
  }

  const documentIds = parseDocumentIds(raw.documentIds);

  if (!documentIds.ok) return documentIds;

  return ok({
    mode,
    message,
    documentIds: documentIds.data,
    metadata: toJsonObject(raw.metadata),
    stream: raw.stream === true
  });
}
