import { NextResponse, type NextRequest } from 'next/server';
import { configuredRateLimit } from '../../../lib/core/rate-limit';
import { fail, statusForErrorCode } from '../../../lib/core/result';
import { parseAiRequestInput } from '../../../lib/ai/ai-schemas';
import { runAiRequest } from '../../../lib/ai/ai-service';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { logSystemEvent, requestIdFrom, safeErrorMessage } from '../../../lib/saas/system-observability';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = requestIdFrom(request);
  const supabase = await createSupabaseServerClient();

  try {
    const { data: userResult, error: userError } = await supabase.auth.getUser();

    if (userError || !userResult.user) {
      const errorResult = fail('UNAUTHORIZED', userError?.message || 'No authenticated user.');
      return noStoreJson(errorResult, { status: statusForErrorCode(errorResult.error.code) });
    }

    const rateLimit = configuredRateLimit(`ai:${userResult.user.id}`);

    if (!rateLimit.allowed) {
      const errorResult = fail('RATE_LIMITED', 'AI request limit reached. Try again after the reset time.', rateLimit);
      const response = noStoreJson(errorResult, { status: statusForErrorCode(errorResult.error.code) });
      response.headers.set('Retry-After', String(Math.ceil(rateLimit.retryAfterMs / 1000)));
      return response;
    }

    const rawBody = await request.json().catch(() => null);
    const parsed = parseAiRequestInput(rawBody);

    if (!parsed.ok) {
      return noStoreJson(parsed, { status: statusForErrorCode(parsed.error.code) });
    }

    const result = await runAiRequest(parsed.data, {
      supabase,
      userId: userResult.user.id
    });

    await logSystemEvent(supabase, {
      requestId,
      routePath: '/api/ai',
      eventType: 'ai_request',
      eventStatus: result.ok ? 'success' : 'error',
      durationMs: Date.now() - startedAt,
      safeMessage: result.ok ? null : result.error.message,
      metadata: result.ok
        ? {
            mode: result.data.mode,
            requestId: result.data.requestId,
            modelName: result.data.modelName,
            totalTokens: result.data.usage.totalTokens,
            remaining: rateLimit.remaining
          }
        : {
            code: result.error.code,
            remaining: rateLimit.remaining
          }
    });

    if (!result.ok) {
      return noStoreJson(result, { status: statusForErrorCode(result.error.code) });
    }

    return noStoreJson(result);
  } catch (error) {
    await logSystemEvent(supabase, {
      requestId,
      routePath: '/api/ai',
      eventType: 'ai_request',
      eventStatus: 'error',
      durationMs: Date.now() - startedAt,
      safeMessage: safeErrorMessage(error)
    });

    const errorResult = fail('INTERNAL_ERROR', safeErrorMessage(error));
    return noStoreJson(errorResult, { status: 500 });
  }
}
