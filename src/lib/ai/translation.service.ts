import { db } from '@/lib/db';
import { callAI, cleanAIResponse } from '@/lib/ai/client';

// ─── Types ──────────────────────────────────────────────────

export interface TranslationResult {
  id: string;
  articleId: string;
  sourceLanguage: string;
  targetLanguage: string;
  translatedTitle: string;
  translatedContent: string;
  translatedExcerpt: string;
  translatedSeoTitle: string;
  translatedSeoDescription: string;
  translatedSeoKeywords: string[];
  hreflangTag: string;
  culturalNotes: string[];
  generatedAt: string;
}

export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  rtl: boolean;
  completeness: 'FULL' | 'PARTIAL' | 'EXPERIMENTAL';
}

// ─── Supported Languages ────────────────────────────────────

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'en', name: 'English', nativeName: 'English', rtl: false, completeness: 'FULL' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', rtl: false, completeness: 'FULL' },
  { code: 'fr', name: 'French', nativeName: 'Français', rtl: false, completeness: 'FULL' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', rtl: false, completeness: 'FULL' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', rtl: false, completeness: 'FULL' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', rtl: false, completeness: 'FULL' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', rtl: false, completeness: 'PARTIAL' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', rtl: false, completeness: 'PARTIAL' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', rtl: false, completeness: 'PARTIAL' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true, completeness: 'PARTIAL' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', rtl: false, completeness: 'PARTIAL' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', rtl: false, completeness: 'FULL' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', rtl: false, completeness: 'FULL' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', rtl: false, completeness: 'EXPERIMENTAL' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', rtl: false, completeness: 'EXPERIMENTAL' },
];

// ─── Translation Engine ─────────────────────────────────────

const TRANSLATION_SYSTEM = `You are a professional translator and localization expert. Translate articles while:
1. Preserving the original meaning and tone
2. Adapting cultural references for the target audience
3. Optimizing SEO keywords for the target language
4. Maintaining proper grammar and natural phrasing (not word-for-word translation)
5. Keeping technical terms accurate

Always translate as a native speaker would write it, not as a machine translation.`;

export async function translateArticle(
  articleId: string,
  siteId: string,
  targetLanguage: string,
): Promise<TranslationResult> {
  const lang = SUPPORTED_LANGUAGES.find((l) => l.code === targetLanguage);
  if (!lang) throw new Error(`Unsupported language: ${targetLanguage}`);

  const article = await db.article.findFirst({
    where: { id: articleId, siteId },
    select: {
      id: true,
      title: true,
      rewrittenTitle: true,
      rewrittenContent: true,
      originalContent: true,
      excerpt: true,
      seoTitle: true,
      seoDescription: true,
      seoKeywords: true,
      primaryKeyword: true,
      slug: true,
    },
  });

  if (!article) throw new Error('Article not found');

  const title = article.rewrittenTitle || article.title;
  const content = article.rewrittenContent || article.originalContent || '';

  const userPrompt = `Translate this article to ${lang.name} (${lang.nativeName}).

SOURCE ARTICLE:
Title: "${title}"
${article.primaryKeyword ? `Primary keyword: ${article.primaryKeyword}` : ''}
${article.excerpt ? `Excerpt: ${article.excerpt}` : ''}
${article.seoTitle ? `SEO Title: ${article.seoTitle}` : ''}
${article.seoDescription ? `SEO Description: ${article.seoDescription}` : ''}

Content:
${content.slice(0, 6000)}

Return a JSON object:
{
  "translatedTitle": "translated title optimized for ${lang.name} SEO",
  "translatedContent": "full translated content in HTML",
  "translatedExcerpt": "translated excerpt under 200 chars",
  "translatedSeoTitle": "SEO-optimized title in ${lang.name}",
  "translatedSeoDescription": "meta description under 160 chars in ${lang.name}",
  "translatedSeoKeywords": ["keyword1", "keyword2", "keyword3"],
  "culturalNotes": ["Note about cultural adaptation 1", "Note 2"]
}

Rules:
- Use natural ${lang.name} phrasing, not literal translation
- Adapt any cultural references (currencies, idioms, examples)
- Optimize keywords for ${lang.name} search engines
- Keep the same HTML structure
- Return ONLY the JSON`;

  const result = await callAI({
    siteId,
    articleId,
    jobType: 'TRANSLATION',
    systemPrompt: TRANSLATION_SYSTEM,
    userPrompt,
    temperature: 0.3,
    maxTokens: 8000,
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
      translatedTitle: title,
      translatedContent: content,
      translatedExcerpt: article.excerpt || '',
      translatedSeoTitle: article.seoTitle || title,
      translatedSeoDescription: article.seoDescription || '',
      translatedSeoKeywords: [],
      culturalNotes: ['Translation may need review'],
    };
  }

  return {
    id: `translation-${articleId}-${targetLanguage}-${Date.now()}`,
    articleId,
    sourceLanguage: 'en',
    targetLanguage,
    translatedTitle: (parsed.translatedTitle as string) || title,
    translatedContent: (parsed.translatedContent as string) || content,
    translatedExcerpt: (parsed.translatedExcerpt as string) || '',
    translatedSeoTitle: (parsed.translatedSeoTitle as string) || '',
    translatedSeoDescription: (parsed.translatedSeoDescription as string) || '',
    translatedSeoKeywords: (parsed.translatedSeoKeywords as string[]) || [],
    hreflangTag: `<link rel="alternate" hreflang="${targetLanguage}" href="/blog/${article.slug}?lang=${targetLanguage}" />`,
    culturalNotes: (parsed.culturalNotes as string[]) || [],
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Batch translate an article into multiple languages.
 */
export async function batchTranslate(
  articleId: string,
  siteId: string,
  targetLanguages: string[],
): Promise<TranslationResult[]> {
  const results = await Promise.allSettled(
    targetLanguages.map((lang) => translateArticle(articleId, siteId, lang)),
  );

  return results
    .filter((r): r is PromiseFulfilledResult<TranslationResult> => r.status === 'fulfilled')
    .map((r) => r.value);
}

/**
 * Returns available languages for translation.
 */
export function getSupportedLanguages(): SupportedLanguage[] {
  return SUPPORTED_LANGUAGES;
}
