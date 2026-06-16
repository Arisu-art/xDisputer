'use client';

import type { AiUiRequest, AiUiResult } from './ai-ui-result';
import { aiUiErrorResult, aiUiResultFromApi } from './ai-ui-result';

export type AiUiClientState = 'idle' | 'loading' | 'ready' | 'error';

export async function runAiUiReview(request: AiUiRequest): Promise<AiUiResult> {
  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({
        mode: request.mode,
        message: request.message,
        documentIds: request.documentIds || [],
        metadata: request.metadata || {},
        stream: false
      })
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const message = payload?.error?.message || `AI request failed with status ${response.status}.`;
      return aiUiErrorResult(message, request.deterministicFindings || []);
    }

    return aiUiResultFromApi(payload, {
      deterministicFindings: request.deterministicFindings,
      deterministicActions: request.deterministicActions
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI review failed.';
    return aiUiErrorResult(message, request.deterministicFindings || []);
  }
}
