/**
 * Multi-provider AI client supporting OpenAI, Anthropic, and Google Gemini.
 * Falls back through providers in order if one fails.
 */

export interface AiProviderConfig {
  provider: 'openai' | 'anthropic' | 'google' | 'local';
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
}

export interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiCompletionOptions {
  messages: AiMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
}

export interface AiCompletionResult {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  model: string;
  provider: string;
}

export interface AiProvider {
  name: string;
  isAvailable(): boolean;
  complete(options: AiCompletionOptions): Promise<AiCompletionResult>;
}

// ─── OpenAI Provider ───────────────────────────────────────────

class OpenAiProvider implements AiProvider {
  name = 'openai';

  constructor(private config: AiProviderConfig) {}

  isAvailable(): boolean {
    return !!this.config.apiKey;
  }

  async complete(options: AiCompletionOptions): Promise<AiCompletionResult> {
    const model = options.model || this.config.defaultModel || 'gpt-4o-mini';
    const baseUrl = this.config.baseUrl || 'https://api.openai.com/v1';

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
        response_format: options.responseFormat === 'json' ? { type: 'json_object' } : undefined,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${err}`);
    }

    const data = await response.json();
    return {
      content: data.choices?.[0]?.message?.content || '',
      usage: data.usage ? {
        inputTokens: data.usage.prompt_tokens,
        outputTokens: data.usage.completion_tokens,
      } : undefined,
      model,
      provider: 'openai',
    };
  }
}

// ─── Anthropic Provider ────────────────────────────────────────

class AnthropicProvider implements AiProvider {
  name = 'anthropic';

  constructor(private config: AiProviderConfig) {}

  isAvailable(): boolean {
    return !!this.config.apiKey;
  }

  async complete(options: AiCompletionOptions): Promise<AiCompletionResult> {
    const model = options.model || this.config.defaultModel || 'claude-3-5-haiku-20241022';
    const baseUrl = this.config.baseUrl || 'https://api.anthropic.com/v1';

    // Anthropic requires system message separate from messages
    const systemMsg = options.messages.find(m => m.role === 'system');
    const nonSystemMsgs = options.messages.filter(m => m.role !== 'system');

    const body: Record<string, unknown> = {
      model,
      messages: nonSystemMsgs.map(m => ({ role: m.role, content: m.content })),
      max_tokens: options.maxTokens ?? 4096,
      temperature: options.temperature ?? 0.7,
    };
    if (systemMsg) body.system = systemMsg.content;

    const response = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${err}`);
    }

    const data = await response.json();
    const textBlock = data.content?.find((b: { type: string }) => b.type === 'text');
    return {
      content: textBlock?.text || '',
      usage: data.usage ? {
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens,
      } : undefined,
      model,
      provider: 'anthropic',
    };
  }
}

// ─── Google Gemini Provider ────────────────────────────────────

class GoogleProvider implements AiProvider {
  name = 'google';

  constructor(private config: AiProviderConfig) {}

  isAvailable(): boolean {
    return !!this.config.apiKey;
  }

  async complete(options: AiCompletionOptions): Promise<AiCompletionResult> {
    const model = options.model || this.config.defaultModel || 'gemini-1.5-flash';
    const baseUrl = this.config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';

    // Convert messages to Gemini format
    const systemMsg = options.messages.find(m => m.role === 'system');
    const contents = options.messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 4096,
        ...(options.responseFormat === 'json' ? { responseMimeType: 'application/json' } : {}),
      },
    };
    if (systemMsg) {
      body.systemInstruction = { parts: [{ text: systemMsg.content }] };
    }

    const response = await fetch(
      `${baseUrl}/models/${model}:generateContent?key=${this.config.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Google Gemini API error (${response.status}): ${err}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return {
      content: text,
      usage: data.usageMetadata ? {
        inputTokens: data.usageMetadata.promptTokenCount || 0,
        outputTokens: data.usageMetadata.candidatesTokenCount || 0,
      } : undefined,
      model,
      provider: 'google',
    };
  }
}

// ─── Local/Fallback Provider ───────────────────────────────────

class LocalProvider implements AiProvider {
  name = 'local';

  isAvailable(): boolean {
    return true; // Always available as fallback
  }

  async complete(options: AiCompletionOptions): Promise<AiCompletionResult> {
    // Use z-ai-web-dev-sdk as local fallback if available
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ZAI = require('z-ai-web-dev-sdk');
      const sdk = new (ZAI.default || ZAI.ZAI || ZAI)();
      const response = await sdk.chat.completions.create({
        model: 'default',
        messages: options.messages,
      });
      return {
        content: response.choices?.[0]?.message?.content || '',
        usage: response.usage ? {
          inputTokens: response.usage.prompt_tokens || response.usage.input_tokens || 0,
          outputTokens: response.usage.completion_tokens || response.usage.output_tokens || 0,
        } : undefined,
        model: 'local',
        provider: 'local',
      };
    } catch {
      throw new Error('No AI provider available. Configure OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_AI_API_KEY in Settings → Environment.');
    }
  }
}

// ─── Provider Factory ──────────────────────────────────────────

function getProviders(): AiProvider[] {
  const providers: AiProvider[] = [];

  // Priority: check env vars for each provider
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    providers.push(new OpenAiProvider({
      provider: 'openai',
      apiKey: openaiKey,
      baseUrl: process.env.OPENAI_BASE_URL,
      defaultModel: process.env.OPENAI_MODEL,
    }));
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    providers.push(new AnthropicProvider({
      provider: 'anthropic',
      apiKey: anthropicKey,
      defaultModel: process.env.ANTHROPIC_MODEL,
    }));
  }

  const googleKey = process.env.GOOGLE_AI_API_KEY;
  if (googleKey) {
    providers.push(new GoogleProvider({
      provider: 'google',
      apiKey: googleKey,
      defaultModel: process.env.GOOGLE_AI_MODEL,
    }));
  }

  // Always add local fallback last
  providers.push(new LocalProvider());

  return providers;
}

// ─── Main Completion Function ──────────────────────────────────

export async function completeWithFallback(options: AiCompletionOptions): Promise<AiCompletionResult> {
  const providers = getProviders();
  const available = providers.filter(p => p.isAvailable());

  if (available.length === 0) {
    throw new Error('No AI provider configured. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_AI_API_KEY in Settings → Environment.');
  }

  let lastError: Error | null = null;

  for (const provider of available) {
    try {
      const result = await provider.complete(options);
      return result;
    } catch (error) {
      lastError = error as Error;
      console.warn(`AI provider ${provider.name} failed:`, lastError.message);
      // Continue to next provider
    }
  }

  throw lastError || new Error('All AI providers failed');
}

export function getAvailableProviders(): string[] {
  return getProviders().filter(p => p.isAvailable()).map(p => p.name);
}
