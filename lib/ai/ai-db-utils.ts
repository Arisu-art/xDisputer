import { safeMessage } from '../core/result';
import type { AiUsage, JsonObject } from './ai-types';

type SupabaseErrorLike = {
  message?: string;
  code?: string;
};

export function isRecoverableAiSchemaError(error: SupabaseErrorLike | null | undefined): boolean {
  const message = error?.message || '';
  const code = error?.code || '';

  return Boolean(
    code === '42P01' ||
    code === '42883' ||
    message.includes('does not exist') ||
    message.includes('Could not find the function') ||
    message.includes('schema cache')
  );
}

export function recordIdFrom(value: unknown): string | null {
  if (typeof value !== 'object' || value === null) return null;
  const id = (value as { id?: unknown }).id;
  return typeof id === 'string' && id ? id : null;
}

export function usagePayload(usage: AiUsage): JsonObject {
  return {
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    totalTokens: usage.totalTokens
  };
}

export function safeAiErrorMessage(error: unknown): string {
  return safeMessage(error, 'AI backend error.');
}
