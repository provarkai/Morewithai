import { db } from '@/lib/db';
import { completeWithFallback, type AiMessage } from '@/lib/ai/providers';
import { logAgentAction } from '@/lib/ai/agent-audit';

export interface AiCallOptions {
  siteId: string;
  articleId?: string;
  jobType: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
}

export interface AiCallResult {
  content: string;
  usage?: { inputTokens?: number; outputTokens?: number };
  model?: string;
  provider?: string;
}

export async function callAI(options: AiCallOptions): Promise<AiCallResult> {
  const { siteId, articleId, jobType, systemPrompt, userPrompt, temperature, maxTokens, responseFormat } = options;
  let job: { id: string } | null = null;
  try {
    job = await db.aiJob.create({
      data: {
        siteId,
        articleId: articleId || null,
        type: jobType,
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });
  } catch {}

  const startTime = Date.now();
  let lastError: Error | null = null;
  const maxRetries = 3;
  const baseDelay = 1000;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const messages: AiMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];

      const result = await completeWithFallback({
        messages,
        temperature,
        maxTokens,
        responseFormat,
      });

      if (job) {
        await db.aiJob.update({
          where: { id: job.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            inputTokens: result.usage?.inputTokens || null,
            outputTokens: result.usage?.outputTokens || null,
            estimatedCost: estimateCost(result.usage?.inputTokens, result.usage?.outputTokens),
          },
        }).catch(() => {});
      }

      const durationMs = Date.now() - startTime;
      // Log successful action for audit trail
      logAgentAction({
        agent: 'ai-client',
        task: jobType,
        input: { userPrompt: userPrompt.slice(0, 200), jobType },
        output: { model: result.model, provider: result.provider },
        articleId,
        siteId,
        model: result.model,
        cost: estimateCost(result.usage?.inputTokens, result.usage?.outputTokens) ?? undefined,
        result: 'SUCCESS',
        durationMs,
      }).catch(() => {}); // Non-blocking

      return {
        content: result.content,
        usage: result.usage ? {
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
        } : undefined,
        model: result.model,
        provider: result.provider,
      };
    } catch (error) {
      lastError = error as Error;
      // Exponential backoff with jitter
      if (attempt < maxRetries - 1) {
        const delayMs = baseDelay * Math.pow(2, attempt) + Math.random() * 500;
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }

  const errorMsg = lastError?.message || 'AI call failed after all retries';
  const durationMs = Date.now() - startTime;
  if (job) {
    await db.aiJob.update({
      where: { id: job.id },
      data: {
        status: 'FAILED',
        error: errorMsg,
        completedAt: new Date(),
        retryCount: maxRetries,
      },
    }).catch(() => {});
  }
  // Log failed action for audit trail
  logAgentAction({
    agent: 'ai-client',
    task: jobType,
    input: { userPrompt: userPrompt.slice(0, 200), jobType },
    articleId,
    siteId,
    result: 'FAILURE',
    durationMs,
    error: errorMsg,
  }).catch(() => {}); // Non-blocking
  throw new Error(errorMsg);
}

function estimateCost(inputTokens?: number, outputTokens?: number): number | null {
  if (!inputTokens && !outputTokens) return null;
  // Approximate cost: assume GPT-4o-mini pricing ($0.15/M input, $0.60/M output)
  const cost = ((inputTokens || 0) / 1_000_000) * 0.15 + ((outputTokens || 0) / 1_000_000) * 0.60;
  return Math.round(cost * 10000) / 10000;
}

export function cleanAIResponse(text: string): string {
  return text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
}
