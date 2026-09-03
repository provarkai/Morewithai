import { callAI, cleanAIResponse } from './client';
import { parseAIResponse, ResearchResultSchema, OutlineResultSchema, GeneratedArticleSchema, TaxonomyResultSchema } from './schemas';
import { getResearchPrompt, getOutlinePrompt, getArticlePrompt, getTaxonomyPrompt } from './prompts';
import type { GenerationMode, Tone, Audience, Length } from './types';
import { db } from '@/lib/db';

// ─── RESEARCH ─────────────────────────────────────────

export async function researchArticle(articleId: string, siteId: string): Promise<Record<string, unknown>> {
  const article = await db.article.findUnique({ where: { id: articleId } });
  if (!article) throw new Error('Article not found');

  const site = await db.site.findUnique({ where: { id: siteId } });
  const prompt = getResearchPrompt({
    title: article.originalTitle || article.title,
    content: article.originalContent,
    sourceUrl: article.sourceUrl || undefined,
    siteName: site?.name,
  });

  const result = await callAI({
    siteId,
    articleId,
    jobType: 'RESEARCH',
    systemPrompt: 'You are a research analyst. Always respond with valid JSON only, no markdown.',
    userPrompt: prompt,
  });

  const research = parseAIResponse(cleanAIResponse(result.content), ResearchResultSchema);

  // Store research as JSON in automation log for reference
  await db.automationLog.create({
    data: {
      action: 'RESEARCH',
      status: 'completed',
      message: `Research completed for: ${article.title}`,
      details: JSON.stringify(research),
      siteId,
    },
  });

  return research;
}

// ─── OUTLINE ───────────────────────────────────────────

export async function generateOutline(articleId: string, siteId: string, options?: {
  primaryKeyword?: string;
  mode?: GenerationMode;
}): Promise<Record<string, unknown>> {
  const article = await db.article.findUnique({ where: { id: articleId } });
  if (!article) throw new Error('Article not found');

  const prompt = getOutlinePrompt({
    topic: article.originalTitle || article.title,
    primaryKeyword: options?.primaryKeyword || article.primaryKeyword || undefined,
    mode: options?.mode,
  });

  const result = await callAI({
    siteId,
    articleId,
    jobType: 'OUTLINE',
    systemPrompt: 'You are an expert content editor. Always respond with valid JSON only.',
    userPrompt: prompt,
  });

  const outline = parseAIResponse(cleanAIResponse(result.content), OutlineResultSchema);

  await db.article.update({
    where: { id: articleId },
    data: { status: 'OUTLINE' },
  });

  return outline;
}

// ─── ARTICLE GENERATION ────────────────────────────────

export async function generateArticle(
  articleId: string,
  siteId: string,
  options: {
    outline?: string;
    research?: string;
    tone?: Tone;
    audience?: Audience;
    length?: Length;
    mode?: GenerationMode;
    primaryKeyword?: string;
    brandVoice?: string;
    contentRules?: string;
  } = {},
): Promise<Record<string, unknown>> {
  const article = await db.article.findUnique({ where: { id: articleId } });
  if (!article) throw new Error('Article not found');

  const site = await db.site.findUnique({ where: { id: siteId } });

  // Get settings for AI configuration
  const settings = await db.setting.findMany({ where: { siteId } });
  const settingsMap: Record<string, string> = {};
  for (const s of settings) settingsMap[s.key] = s.value;

  const tone = options.tone || (settingsMap.ai_tone as Tone) || 'professional';
  const audience = options.audience || (settingsMap.ai_audience as Audience) || 'intermediate';
  const length = options.length || (settingsMap.ai_length as Length) || 'standard';
  const mode = options.mode || 'EVERGREEN';

  const prompt = getArticlePrompt({
    topic: article.originalTitle || article.title,
    outline: options.outline || '',
    research: options.research,
    tone,
    audience,
    length,
    mode,
    primaryKeyword: options.primaryKeyword || article.primaryKeyword || undefined,
    siteName: site?.name,
    brandVoice: settingsMap.brand_voice,
    contentRules: settingsMap.content_rules,
  });

  await db.article.update({ where: { id: articleId }, data: { status: 'DRAFT' } });

  const result = await callAI({
    siteId,
    articleId,
    jobType: 'GENERATE',
    systemPrompt: 'You are a professional blog writer. Always respond with valid JSON only, no markdown code blocks.',
    userPrompt: prompt,
  });

  const generated = parseAIResponse(cleanAIResponse(result.content), GeneratedArticleSchema);

  // Calculate word count and reading time
  const words = generated.content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;
  const slug = generated.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);

  // Update article with generated content
  await db.article.update({
    where: { id: articleId },
    data: {
      title: generated.title,
      rewrittenTitle: generated.title,
      rewrittenContent: generated.content,
      excerpt: generated.excerpt || null,
      primaryKeyword: generated.primaryKeyword || null,
      secondaryKeywords: generated.secondaryKeywords?.join(', ') || null,
      slug,
      wordCount: words,
      readingTime: Math.max(1, Math.ceil(words / 200)),
      status: 'AI_REVIEW',
      rewrittenAt: new Date(),
    },
  });

  // Store FAQ in schema if present
  if (generated.faq && generated.faq.length > 0) {
    const siteDomain = site?.domain || 'morewithai.online';
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: generated.faq.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    };
    await db.article.update({
      where: { id: articleId },
      data: { seoSchema: JSON.stringify(schema) },
    });
  }

  return generated;
}

// ─── IMPROVE ARTICLE ───────────────────────────────────

export async function improveArticle(
  articleId: string,
  siteId: string,
  focus: string,
): Promise<Record<string, unknown>> {
  const article = await db.article.findUnique({ where: { id: articleId } });
  if (!article) throw new Error('Article not found');

  const result = await callAI({
    siteId,
    articleId,
    jobType: 'GENERATE',
    systemPrompt: 'You are an expert editor. Always respond with valid JSON only.',
    userPrompt: `Improve this article focusing on: ${focus}

Title: ${article.title}
Content: ${(article.rewrittenContent || article.originalContent).slice(0, 5000)}

Return JSON: { "title": "improved", "content": "improved HTML", "excerpt": "updated" }`,
  });

  const improved = parseAIResponse(cleanAIResponse(result.content), GeneratedArticleSchema);

  const words = improved.content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;

  await db.article.update({
    where: { id: articleId },
    data: {
      title: improved.title,
      rewrittenTitle: improved.title,
      rewrittenContent: improved.content,
      excerpt: improved.excerpt || null,
      wordCount: words,
      readingTime: Math.max(1, Math.ceil(words / 200)),
      rewrittenAt: new Date(),
    },
  });

  return improved;
}

// ─── TAXONOMY SUGGESTION ────────────────────────────────

export async function suggestTaxonomy(articleId: string, siteId: string): Promise<Record<string, unknown>> {
  const article = await db.article.findUnique({ where: { id: articleId } });
  if (!article) throw new Error('Article not found');

  const existingCategories = await db.category.findMany({
    where: { siteId },
    select: { name: true },
  });
  const existingTags = await db.tag.findMany({
    where: { siteId },
    select: { name: true },
  });

  const prompt = getTaxonomyPrompt({
    title: article.rewrittenTitle || article.title,
    content: article.rewrittenContent || article.originalContent,
    existingCategories: existingCategories.map((c) => c.name),
    existingTags: existingTags.map((t) => t.name),
  });

  const result = await callAI({
    siteId,
    articleId,
    jobType: 'TAXONOMY',
    systemPrompt: 'You are a content taxonomist. Always respond with valid JSON only.',
    userPrompt: prompt,
  });

  const taxonomy = parseAIResponse(cleanAIResponse(result.content), TaxonomyResultSchema);
  return taxonomy;
}
