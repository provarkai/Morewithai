import { db } from '@/lib/db';
import { callAI, cleanAIResponse } from '@/lib/ai/client';

// ─── Types ──────────────────────────────────────────────────

export interface VoiceTranscription {
  id: string;
  text: string;
  duration: number;
  language: string;
  confidence: number;
  words: { word: string; start: number; end: number; confidence: number }[];
}

export interface VoiceContentResult {
  id: string;
  transcriptionId: string;
  title: string;
  content: string;
  excerpt: string;
  suggestedCategory: string;
  suggestedTags: string[];
  wordCount: number;
  readingTime: number;
  keyPoints: string[];
  generatedAt: string;
}

// ─── Transcription ──────────────────────────────────────────

/**
 * Transcribes audio using OpenAI Whisper API.
 * Accepts a base64-encoded audio or a URL.
 */
export async function transcribeAudio(params: {
  audioData?: string; // base64
  audioUrl?: string;
  language?: string;
}): Promise<VoiceTranscription> {
  const { audioData, audioUrl, language = 'en' } = params;

  if (!audioData && !audioUrl) {
    throw new Error('Either audioData or audioUrl is required');
  }

  // In production, this calls the Whisper API via an action
  // For now, we simulate the transcription with AI analysis
  const sourceText = audioUrl
    ? `Audio from URL: ${audioUrl}`
    : `Audio data provided (${Math.round((audioData?.length || 0) * 0.75 / 1024)}KB)`;

  // Simulated transcription result — in production, call OpenAI Whisper
  const transcription: VoiceTranscription = {
    id: `transcription-${Date.now()}`,
    text: `[Transcription of ${sourceText} — connect OPENAI_API_KEY for live Whisper transcription]`,
    duration: 0,
    language,
    confidence: 0.95,
    words: [],
  };

  return transcription;
}

// ─── Voice-to-Article ───────────────────────────────────────

const VOICE_TO_ARTICLE_SYSTEM = `You are an expert content writer and editor. Given a voice transcription or spoken notes, transform them into a polished, well-structured blog article.

Rules:
1. Clean up filler words, false starts, and rambling
2. Organize spoken thoughts into a logical article structure
3. Add headings, subheadings, and paragraph breaks
4. Expand on key points the speaker mentioned
5. Add an engaging introduction and conclusion
6. Optimize for readability and SEO
7. Preserve the speaker's unique insights and personality
8. Make the tone match the content type (informal for blog, formal for thought leadership)`;

export async function voiceToArticle(
  transcriptionText: string,
  siteId: string,
  options?: {
    targetWordCount?: number;
    tone?: string;
    niche?: string;
    articleType?: 'blog_post' | 'tutorial' | 'opinion' | 'how_to' | 'listicle';
  },
): Promise<VoiceContentResult> {
  const wordCount = transcriptionText.split(/\s+/).length;
  const estimatedDuration = Math.round(wordCount / 150); // ~150 words per minute speaking

  const userPrompt = `Transform this voice transcription into a polished blog article.

TRANSCRIPTION (${wordCount} words spoken, ~${estimatedDuration} min):
"""
${transcriptionText}
"""

${options?.targetWordCount ? `Target word count: ${options.targetWordCount}` : 'Target word count: 1500-2000'}
${options?.tone ? `Tone: ${options.tone}` : 'Tone: professional yet conversational'}
${options?.niche ? `Niche: ${options.niche}` : ''}
${options?.articleType ? `Article type: ${options.articleType}` : 'Article type: blog post'}

Return a JSON object:
{
  "title": "Engaging, SEO-friendly article title",
  "content": "Full article in HTML with proper headings, paragraphs, lists, etc.",
  "excerpt": "Compelling excerpt under 200 chars",
  "suggestedCategory": "category name",
  "suggestedTags": ["tag1", "tag2", "tag3"],
  "keyPoints": ["Key insight 1", "Key insight 2", "Key insight 3"]
}

Rules:
- Clean up the transcription completely
- Add structure the speaker implied but didn't explicitly state
- Keep the speaker's unique insights and examples
- Add relevant subheadings (H2/H3)
- Include a compelling introduction hook
- End with a clear conclusion and CTA
- Optimize for the target word count
- Return ONLY the JSON`;

  const result = await callAI({
    siteId,
    jobType: 'VOICE_TO_CONTENT',
    systemPrompt: VOICE_TO_ARTICLE_SYSTEM,
    userPrompt,
    temperature: 0.5,
    maxTokens: 6000,
    responseFormat: 'json',
  });

  let parsed: Record<string, unknown>;
  try {
    const match = result.content.match(/\{[\s\S]*\}/);
    if (match) {
      parsed = JSON.parse(match[0]);
    } else {
      throw new Error('No JSON');
    }
  } catch {
    parsed = {
      title: 'Voice Notes — Article Draft',
      content: `<p>${transcriptionText.replace(/\n/g, '</p><p>')}</p>`,
      excerpt: transcriptionText.slice(0, 200),
      suggestedCategory: 'Uncategorized',
      suggestedTags: [],
      keyPoints: [],
    };
  }

  const content = (parsed.content as string) || '';
  const contentWordCount = content.replace(/<[^>]+>/g, '').split(/\s+/).length;

  return {
    id: `voice-content-${Date.now()}`,
    transcriptionId: `transcription-${Date.now()}`,
    title: (parsed.title as string) || 'Untitled',
    content,
    excerpt: (parsed.excerpt as string) || '',
    suggestedCategory: (parsed.suggestedCategory as string) || 'Uncategorized',
    suggestedTags: (parsed.suggestedTags as string[]) || [],
    wordCount: contentWordCount,
    readingTime: Math.ceil(contentWordCount / 200),
    keyPoints: (parsed.keyPoints as string[]) || [],
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generates a structured outline from spoken notes.
 * Useful for planning before full article generation.
 */
export async function voiceToOutline(
  notes: string,
  siteId: string,
): Promise<{
  title: string;
  outline: { heading: string; points: string[] }[];
  keywords: string[];
  suggestedAngle: string;
}> {
  const result = await callAI({
    siteId,
    jobType: 'VOICE_OUTLINE',
    systemPrompt: 'You are a content strategist. Convert spoken notes into a structured article outline.',
    userPrompt: `Convert these spoken notes into a structured outline:

"""
${notes}
"""

Return JSON:
{
  "title": "Article title",
  "outline": [
    {"heading": "Section H2", "points": ["point 1", "point 2"]}
  ],
  "keywords": ["keyword1", "keyword2"],
  "suggestedAngle": "Recommended content angle"
}

Return ONLY the JSON.`,
    temperature: 0.4,
    maxTokens: 2000,
    responseFormat: 'json',
  });

  try {
    const match = result.content.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch { /* ignore */ }

  return {
    title: 'Untitled Article',
    outline: [{ heading: 'Introduction', points: ['Main topic overview'] }],
    keywords: [],
    suggestedAngle: 'Cover the key points from the notes',
  };
}
