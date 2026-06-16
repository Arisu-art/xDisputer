import { fail, ok, safeMessage, type Result } from '../core/result';
import type { AiMode, AiUsage } from './ai-types';
import { buildAiDeveloperInstruction } from './ai-guardrails';

type ChatChoice = {
  message?: {
    content?: string | null;
  };
};

type ChatUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

type ChatCompletionResponse = {
  model?: string;
  choices?: ChatChoice[];
  usage?: ChatUsage;
  error?: {
    message?: string;
  };
};

export type AiProviderResult = {
  answer: string;
  modelName: string | null;
  usage: AiUsage;
};

function providerBaseUrl(): string {
  return (process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
}

function providerTimeoutMs(): number {
  const configured = Number(process.env.AI_REQUEST_TIMEOUT_MS || '20000');
  return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : 20_000;
}

function emptyUsage(): AiUsage {
  return {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0
  };
}

export function isAiProviderConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY && (process.env.AI_MODEL_NAME || process.env.OPENAI_MODEL));
}

export async function runConfiguredAiProvider(input: {
  mode: AiMode;
  message: string;
  context?: string;
}): Promise<Result<AiProviderResult>> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.AI_MODEL_NAME || process.env.OPENAI_MODEL;

  if (!apiKey || !model) {
    return fail(
      'CONFIGURATION_ERROR',
      'AI provider is not configured. Set OPENAI_API_KEY and AI_MODEL_NAME in server environment variables.'
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), providerTimeoutMs());

  try {
    const response = await fetch(`${providerBaseUrl()}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          {
            role: 'developer',
            content: buildAiDeveloperInstruction(input.mode)
          },
          ...(input.context ? [{ role: 'user', content: `Trusted application context:\n${input.context}` }] : []),
          {
            role: 'user',
            content: input.message
          }
        ]
      })
    });

    const payload = await response.json().catch((): ChatCompletionResponse => ({}));
    const data = payload as ChatCompletionResponse;

    if (!response.ok) {
      return fail('AI_ERROR', data.error?.message || `AI provider returned HTTP ${response.status}.`);
    }

    const answer = data.choices?.[0]?.message?.content?.trim();

    if (!answer) {
      return fail('AI_ERROR', 'AI provider returned an empty answer.');
    }

    return ok({
      answer,
      modelName: data.model || model,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0
      }
    });
  } catch (error) {
    return fail('AI_ERROR', safeMessage(error, 'AI provider request failed.'));
  } finally {
    clearTimeout(timeout);
  }
}

export function configuredFallbackProviderResult(answer: string): AiProviderResult {
  return {
    answer,
    modelName: null,
    usage: emptyUsage()
  };
}
