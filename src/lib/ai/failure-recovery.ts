import { routeTask, type TaskType, type RoutingDecision } from './router';

interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

interface ExecutionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  modelUsed?: string;
  attempts: AttemptRecord[];
  totalDurationMs: number;
}

interface AttemptRecord {
  attempt: number;
  model: string;
  provider: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  error?: string;
  statusCode?: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

function calculateDelay(attempt: number, config: RetryConfig): number {
  const delay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
  return Math.min(delay, config.maxDelayMs);
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute an AI task with automatic fallback to alternate models on failure.
 * Never silently produces incomplete output.
 */
export async function executeWithRecovery<T>(
  taskType: TaskType,
  executor: (model: string, provider: string) => Promise<T>,
  options?: {
    retryConfig?: Partial<RetryConfig>;
    maxCost?: number;
    onAttempt?: (attempt: AttemptRecord) => void;
  }
): Promise<ExecutionResult<T>> {
  const config = { ...DEFAULT_RETRY_CONFIG, ...options?.retryConfig };
  const routing = routeTask(taskType, { maxCost: options?.maxCost });

  // Build ordered list of models to try (primary + fallbacks)
  const modelsToTry = [
    { model: routing.selectedModel.model, provider: routing.selectedModel.provider },
    ...routing.fallbackModels.map((m) => ({ model: m.model, provider: m.provider })),
  ];

  const attempts: AttemptRecord[] = [];
  const startTime = Date.now();

  for (let attempt = 1; attempt <= Math.min(config.maxRetries, modelsToTry.length); attempt++) {
    const modelInfo = modelsToTry[Math.min(attempt - 1, modelsToTry.length - 1)];
    const attemptStart = Date.now();
    let record: AttemptRecord;

    try {
      const result = await executor(modelInfo.model, modelInfo.provider);
      record = {
        attempt,
        model: modelInfo.model,
        provider: modelInfo.provider,
        startTime: attemptStart,
        endTime: Date.now(),
        durationMs: Date.now() - attemptStart,
      };
      attempts.push(record);
      options?.onAttempt?.(record);

      return {
        success: true,
        data: result,
        modelUsed: modelInfo.model,
        attempts,
        totalDurationMs: Date.now() - startTime,
      };
    } catch (err: unknown) {
      const error = err as { message?: string; status?: number; statusCode?: number };
      record = {
        attempt,
        model: modelInfo.model,
        provider: modelInfo.provider,
        startTime: attemptStart,
        endTime: Date.now(),
        durationMs: Date.now() - attemptStart,
        error: error.message || 'Unknown error',
        statusCode: error.status || error.statusCode,
      };
      attempts.push(record);
      options?.onAttempt?.(record);

      // Don't retry on auth errors or validation errors
      if (error.status === 401 || error.status === 403 || error.statusCode === 401 || error.statusCode === 403) {
        break;
      }

      // Wait before retrying (exponential backoff)
      if (attempt < config.maxRetries && attempt < modelsToTry.length) {
        const delay = calculateDelay(attempt, config);
        await sleep(delay);
      }
    }
  }

  return {
    success: false,
    error: `All ${attempts.length} attempts failed. Last error: ${attempts[attempts.length - 1]?.error}`,
    attempts,
    totalDurationMs: Date.now() - startTime,
  };
}

export { type RoutingDecision, type RetryConfig, type AttemptRecord };
