import { db } from '@/lib/db';
import { callAI, cleanAIResponse } from './client';
import { parseAIResponse } from './schemas';
import { getSeoPrompt } from './prompts';

export const SEO_WEIGHTS = {
  title: 10, meta: 10, keyword: 10, structure: 10,
  searchIntent: 15, link: 15, authority: 10, readability: 10,
  schema: 5, url: 5,
};

export function analyzeSeoRules(article: {
  title?: string | null; content?: string | null;
  seoTitle?: string | null; seoDescription?: string | null;
  primaryKeyword?: string | null; slug?: string | null;
  seoKeywords?: string | null; seoSchema?: string | null;
}) {
  const checks: { name: string; passed: boolean; score: number; maxScore: number; message: string }[] = [];
  const title = article.seoTitle || article.title || '';
  const desc = article.seoDescription || '';
  const keyword = article.primaryKeyword || '';
  const content = article.content || '';
  const slug = article.slug || '';
  const kwInTitle = keyword ? title.toLowerCase().includes(keyword.toLowerCase()) : false;
  checks.push({ name: 'Keyword in title', passed: kwInTitle, score: kwInTitle ? 10 : 3, maxScore: 10, message: kwInTitle ? 'Primary keyword found' : 'Add primary keyword to title' });
  checks.push({ name: 'Title length', passed: title.length >= 30 && title.length <= 60, score: (title.length >= 30 && title.length <= 60) ? 10 : (title.length >= 20 && title.length <= 70) ? 6 : 2, maxScore: 10, message: title.length + ' chars (ideal 30-60)' });
  checks.push({ name: 'Meta description', passed: desc.length >= 120 && desc.length <= 160, score: desc.length >= 100 ? 10 : 3, maxScore: 10, message: desc.length > 0 ? desc.length + ' chars (ideal 120-160)' : 'No meta description' });
  const kwLower = keyword.toLowerCase();
  const contentLower = content.toLowerCase();
  const kwCount = kwLower ? (contentLower.match(new RegExp(kwLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length : 0;
  checks.push({ name: 'Keyword usage', passed: kwCount >= 2, score: kwCount >= 2 ? 10 : 4, maxScore: 10, message: 'Keyword appears ' + kwCount + ' times' });
  const headings = content.match(/<h[23][^>]*>[^<]*<\/h[23]>/gi) || [];
  checks.push({ name: 'Heading structure', passed: headings.length >= 3, score: Math.min(10, headings.length * 2), maxScore: 10, message: headings.length + ' subheadings (ideal 4+)' });
  checks.push({ name: 'Readability', passed: true, score: 8, maxScore: 10, message: 'Content readable' });
  checks.push({ name: 'URL slug', passed: slug.length > 0, score: slug.length > 0 ? 10 : 0, maxScore: 10, message: slug ? '/blog/' + slug : 'No slug' });
  checks.push({ name: 'Schema markup', passed: !!article.seoSchema, score: article.seoSchema ? 10 : 3, maxScore: 10, message: article.seoSchema ? 'Schema present' : 'Add schema' });
  const totalScore = Math.min(100, Math.round(checks.reduce((sum, c) => sum + c.score, 0) / checks.length * 10));
  return { checks, totalScore };
}

export async function analyzeSeoWithAI(articleId: string, siteId: string) {
  const article = await db.article.findUnique({ where: { id: articleId } });
  if (!article) throw new Error('Article not found');
  const prompt = getSeoPrompt({
    title: article.rewrittenTitle || article.title,
    content: article.rewrittenContent || article.originalContent,
    metaDescription: article.seoDescription || undefined,
    primaryKeyword: article.primaryKeyword || undefined,
  });
  const result = await callAI({
    siteId, articleId, jobType: 'SEO',
    systemPrompt: 'You are an SEO expert. Always respond with valid JSON only, no markdown.',
    userPrompt: prompt,
  });
  const text = cleanAIResponse(result.content);
  let analysis: any;
  try {
    analysis = JSON.parse(text);
  } catch { throw new Error('Invalid AI response'); }
  await db.seoAnalysis.upsert({
    where: { articleId },
    create: {
      articleId, primaryKeyword: analysis.primaryKeyword || null,
      secondaryKeywords: analysis.secondaryKeywords?.join(', ') || null,
      searchIntent: analysis.searchIntent || null,
      titleScore: analysis.titleScore || 0, metaScore: analysis.metaScore || 0,
      keywordScore: analysis.keywordScore || 0, structureScore: analysis.structureScore || 0,
      linkScore: analysis.linkScore || 0, schemaScore: analysis.schemaScore || 0,
      readabilityScore: analysis.readabilityScore || 0, overallScore: analysis.overallScore || 0,
      recommendations: analysis.recommendations?.join('\n') || null,
    },
    update: {
      primaryKeyword: analysis.primaryKeyword || null,
      secondaryKeywords: analysis.secondaryKeywords?.join(', ') || null,
      searchIntent: analysis.searchIntent || null,
      titleScore: analysis.titleScore || 0, metaScore: analysis.metaScore || 0,
      keywordScore: analysis.keywordScore || 0, structureScore: analysis.structureScore || 0,
      linkScore: analysis.linkScore || 0, schemaScore: analysis.schemaScore || 0,
      readabilityScore: analysis.readabilityScore || 0, overallScore: analysis.overallScore || 0,
      recommendations: analysis.recommendations?.join('\n') || null,
    },
  });
  await db.article.update({
    where: { id: articleId },
    data: { seoScore: analysis.overallScore, primaryKeyword: analysis.primaryKeyword || article.primaryKeyword, secondaryKeywords: analysis.secondaryKeywords?.join(', ') || article.secondaryKeywords, searchIntent: analysis.searchIntent || article.searchIntent },
  });
  return analysis;
}

export function buildArticleSchema(article: { title: string; seoTitle?: string | null; seoDescription?: string | null; slug?: string | null; domain?: string; authorName?: string; publishedAt?: string | null }): string {
  const url = 'https://' + (article.domain || 'morewithai.online') + '/blog/' + (article.slug || '');
  return JSON.stringify({
    '@context': 'https://schema.org', '@type': 'Article',
    headline: article.seoTitle || article.title,
    description: article.seoDescription || '',
    author: { '@type': article.authorName ? 'Person' : 'Organization', name: article.authorName || 'MoreWithAI' },
    publisher: { '@type': 'Organization', name: 'MoreWithAI', url: 'https://' + (article.domain || 'morewithai.online') },
    url, mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    ...(article.publishedAt ? { datePublished: article.publishedAt } : {}),
    dateModified: new Date().toISOString(),
  });
}

export function buildBreadcrumbSchema(items: { name: string; url: string }[]): string {
  return JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, item: item.url })) });
}
