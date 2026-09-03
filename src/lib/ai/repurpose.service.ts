import { db } from '@/lib/db';
import { callAI, cleanAIResponse } from '@/lib/ai/client';

// ─── Repurpose Formats ───────────────────────────────────────

export type RepurposeFormat =
  | 'TWITTER_THREAD'
  | 'LINKEDIN_POST'
  | 'EMAIL_NEWSLETTER'
  | 'YOUTUBE_SCRIPT'
  | 'INSTAGRAM_CAPTION'
  | 'PRODUCT_HUNT';

export interface RepurposeResult {
  format: RepurposeFormat;
  content: string;
  metadata?: {
    wordCount: number;
    hashtags?: string[];
    cta?: string;
  };
}

// ─── Prompts per Format ──────────────────────────────────────

const REPURPOSE_PROMPTS: Record<RepurposeFormat, string> = {
  TWITTER_THREAD: `You are a viral Twitter/X thread writer. Transform this article into a compelling Twitter thread.
Rules:
- Start with a hook tweet that creates curiosity
- Each tweet should be under 280 characters
- Use 8-12 tweets
- End with a CTA and summary
- Include relevant emojis sparingly
- Number each tweet (1/, 2/, etc.)
- Make it shareable and valuable`,

  LINKEDIN_POST: `You are a LinkedIn content strategist. Transform this article into a LinkedIn post.
Rules:
- Start with a hook line (first 2 lines visible before "see more")
- Use short paragraphs and line breaks for readability
- Include 3-5 relevant hashtags
- End with a question to drive engagement
- Keep it under 1,300 characters
- Professional but conversational tone`,

  EMAIL_NEWSLETTER: `You are an email marketing expert. Transform this article into an email newsletter.
Rules:
- Write a compelling subject line (under 50 chars)
- Write a preview text (under 90 chars)
- Opening hook paragraph
- Key takeaways as bullet points
- CTA to read the full article
- Closing line
- Format as HTML-ready markdown`,

  YOUTUBE_SCRIPT: `You are a YouTube script writer. Transform this article into a video script.
Rules:
- Hook in first 5 seconds
- Structure: Hook → Intro → Main Content → CTA → Outro
- Include visual cues in [brackets]
- Conversational speaking style
- Target 5-8 minute video length
- Include timestamps for chapters
- End with subscribe/like CTA`,

  INSTAGRAM_CAPTION: `You are an Instagram content creator. Transform this article into an Instagram caption.
Rules:
- Hook in first line (before "more" cutoff)
- Use line breaks for readability
- Include 20-30 relevant hashtags at the end
- CTA in the caption
- Keep under 2,200 characters
- Engaging and visual language`,

  PRODUCT_HUNT: `You are a Product Hunt launcher. Transform this article/product description into a Product Hunt launch post.
Rules:
- Tagline: One line that captures the value prop
- Description: 3-5 sentences explaining what it does
- Maker comment: Personal story of why you built this
- First comment: Key features as bullet points
- Clear call-to-action`,
};

// ─── Main Repurpose Function ─────────────────────────────────

export async function repurposeContent(
  articleId: string,
  format: RepurposeFormat,
  siteId: string,
): Promise<RepurposeResult> {
  const article = await db.article.findFirst({
    where: { id: articleId, siteId },
    select: {
      id: true,
      title: true,
      rewrittenTitle: true,
      rewrittenContent: true,
      originalContent: true,
      excerpt: true,
      primaryKeyword: true,
      slug: true,
    },
  });

  if (!article) throw new Error('Article not found');

  const content = article.rewrittenContent || article.originalContent;
  const title = article.rewrittenTitle || article.title;

  const result = await callAI({
    siteId,
    articleId,
    jobType: 'REPURPOSE',
    systemPrompt: REPURPOSE_PROMPTS[format],
    userPrompt: `ARTICLE TITLE: ${title}\n${article.primaryKeyword ? `PRIMARY KEYWORD: ${article.primaryKeyword}\n` : ''}${article.excerpt ? `EXCERPT: ${article.excerpt}\n` : ''}\nARTICLE CONTENT:\n${content.slice(0, 8000)}\n\nTransform this into the requested format. Return ONLY the repurposed content, no explanations.`,
    temperature: 0.7,
    maxTokens: 2000,
  });
  const cleaned = cleanAIResponse(result.content);

  // Extract hashtags if applicable
  const hashtagMatch = cleaned.match(/#(\w+)/g);
  const hashtags = hashtagMatch ? [...new Set(hashtagMatch)] : [];

  // Extract CTA if present
  const ctaMatch = cleaned.match(/(?:CTA|Call to Action|Link|Read more):\s*(.+)/i);
  const cta = ctaMatch?.[1]?.trim();

  return {
    format,
    content: cleaned,
    metadata: {
      wordCount: cleaned.split(/\s+/).length,
      ...(hashtags.length > 0 ? { hashtags } : {}),
      ...(cta ? { cta } : {}),
    },
  };
}

// ─── Batch Repurpose ─────────────────────────────────────────

export async function batchRepurpose(
  articleId: string,
  formats: RepurposeFormat[],
  siteId: string,
): Promise<RepurposeResult[]> {
  const results = await Promise.allSettled(
    formats.map((format) => repurposeContent(articleId, format, siteId)),
  );

  return results
    .filter((r): r is PromiseFulfilledResult<RepurposeResult> => r.status === 'fulfilled')
    .map((r) => r.value);
}

// ─── Get Available Formats ───────────────────────────────────

export function getAvailableFormats(): { value: RepurposeFormat; label: string; description: string; icon: string }[] {
  return [
    { value: 'TWITTER_THREAD', label: 'Twitter/X Thread', description: '8-12 tweet thread with hook and CTA', icon: 'Twitter' },
    { value: 'LINKEDIN_POST', label: 'LinkedIn Post', description: 'Professional post with hashtags and engagement question', icon: 'Linkedin' },
    { value: 'EMAIL_NEWSLETTER', label: 'Email Newsletter', description: 'Subject line, preview text, and email body', icon: 'Mail' },
    { value: 'YOUTUBE_SCRIPT', label: 'YouTube Script', description: '5-8 minute video script with visual cues', icon: 'Video' },
    { value: 'INSTAGRAM_CAPTION', label: 'Instagram Caption', description: 'Caption with hashtags and engagement hook', icon: 'Instagram' },
    { value: 'PRODUCT_HUNT', label: 'Product Hunt', description: 'Launch post with tagline and maker comment', icon: 'Rocket' },
  ];
}
