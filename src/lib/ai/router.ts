export interface ModelOption {
  provider: string; // 'openai' | 'anthropic' | 'google' | 'local'
  model: string; // e.g. 'gpt-4o-mini', 'claude-3-haiku', 'gemini-flash'
  costPer1kInput: number; // in USD
  costPer1kOutput: number;
  maxTokens: number;
  latency: 'fast' | 'medium' | 'slow';
  quality: 'low' | 'medium' | 'high' | 'premium';
  capabilities: string[]; // 'chat' | 'reasoning' | 'code' | 'analysis' | 'creative'
}

export interface RoutingDecision {
  selectedModel: ModelOption;
  reason: string;
  estimatedCost: number;
  fallbackModels: ModelOption[];
}

export type TaskComplexity = 'simple' | 'standard' | 'complex' | 'strategic';
export type TaskType =
  | 'classification'
  | 'tagging'
  | 'summarization'
  | 'research'
  | 'outline'
  | 'generation'
  | 'seo'
  | 'quality'
  | 'analysis'
  | 'strategic'
  | 'reasoning'
  | 'creative';

// Model catalog
const MODEL_CATALOG: ModelOption[] = [
  // Fast/cheap models for simple tasks
  {
    provider: 'openai',
    model: 'gpt-4o-mini',
    costPer1kInput: 0.00015,
    costPer1kOutput: 0.0006,
    maxTokens: 16384,
    latency: 'fast',
    quality: 'medium',
    capabilities: ['chat', 'analysis', 'creative'],
  },
  // Standard models for most tasks
  {
    provider: 'openai',
    model: 'gpt-4o',
    costPer1kInput: 0.0025,
    costPer1kOutput: 0.01,
    maxTokens: 128000,
    latency: 'medium',
    quality: 'high',
    capabilities: ['chat', 'reasoning', 'code', 'analysis', 'creative'],
  },
  // Premium for strategic tasks
  {
    provider: 'openai',
    model: 'o1-mini',
    costPer1kInput: 0.003,
    costPer1kOutput: 0.012,
    maxTokens: 128000,
    latency: 'slow',
    quality: 'premium',
    capabilities: ['reasoning', 'analysis', 'strategic'],
  },
];

// Task complexity mapping
const TASK_COMPLEXITY: Record<TaskType, TaskComplexity> = {
  classification: 'simple',
  tagging: 'simple',
  summarization: 'standard',
  analysis: 'standard',
  outline: 'standard',
  seo: 'standard',
  quality: 'standard',
  generation: 'complex',
  research: 'complex',
  creative: 'complex',
  reasoning: 'strategic',
  strategic: 'strategic',
};

// Quality requirements per task type
const MIN_QUALITY: Record<TaskType, string> = {
  classification: 'low',
  tagging: 'low',
  summarization: 'medium',
  analysis: 'medium',
  outline: 'medium',
  seo: 'medium',
  quality: 'high',
  generation: 'high',
  research: 'high',
  creative: 'high',
  reasoning: 'premium',
  strategic: 'premium',
};

const QUALITY_LEVEL: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  premium: 4,
};

export function routeTask(
  taskType: TaskType,
  options?: {
    maxCost?: number;
    preferFast?: boolean;
    requiredCapability?: string;
  }
): RoutingDecision {
  const complexity = TASK_COMPLEXITY[taskType] || 'standard';
  const minQuality = MIN_QUALITY[taskType] || 'medium';
  const minQualityLevel = QUALITY_LEVEL[minQuality];

  // Filter models that meet quality requirements
  let candidates = MODEL_CATALOG.filter((m) => {
    if (QUALITY_LEVEL[m.quality] < minQualityLevel) return false;
    if (options?.requiredCapability && !m.capabilities.includes(options.requiredCapability)) return false;
    if (options?.maxCost && m.costPer1kInput > options.maxCost) return false;
    return true;
  });

  // Sort by cost (cheapest first that meets requirements)
  candidates.sort((a, b) => a.costPer1kInput - b.costPer1kInput);

  // If preferFast, prioritize fast models
  if (options?.preferFast) {
    const fast = candidates.filter((m) => m.latency === 'fast');
    if (fast.length > 0) candidates = fast;
  }

  const selectedModel = candidates[0] || MODEL_CATALOG[0];
  const fallbackModels = candidates.slice(1, 3);
  const estimatedCost = (selectedModel.costPer1kInput + selectedModel.costPer1kOutput) / 2; // rough average

  const reason = `Task '${taskType}' (${complexity} complexity) routed to ${selectedModel.model} (${selectedModel.quality} quality, ${selectedModel.latency} latency)`;

  return { selectedModel, reason, estimatedCost, fallbackModels };
}

export function getModelCatalog(): ModelOption[] {
  return MODEL_CATALOG;
}

export function getRoutingDecision(
  taskType: TaskType,
  inputTokens?: number,
  outputTokens?: number
): { model: string; estimatedCost: number; reason: string } {
  const decision = routeTask(taskType);
  const inputCost = ((inputTokens || 1000) / 1000) * decision.selectedModel.costPer1kInput;
  const outputCost = ((outputTokens || 500) / 1000) * decision.selectedModel.costPer1kOutput;
  return {
    model: decision.selectedModel.model,
    estimatedCost: Math.round((inputCost + outputCost) * 10000) / 10000,
    reason: decision.reason,
  };
}
