import { callAI, cleanAIResponse } from './client';
import { getQualityPrompt } from './prompts';
import { db } from '@/lib/db';

export async function scoreContent(articleId: string, siteId: string) {
  const article = await db.article.findUnique({ where: { id: articleId } });
  if (!article) throw new Error('Article not found');
  const prompt = getQualityPrompt({
    title: article.rewrittenTitle || article.title,
    content: article.rewrittenContent || article.originalContent,
    primaryKeyword: article.primaryKeyword || undefined,
  });
  const result = await callAI({
    siteId, articleId, jobType: 'QUALITY',
    systemPrompt: 'You are a content quality evaluator. Always respond with valid JSON only, no markdown.',
    userPrompt: prompt,
  });
  const score = JSON.parse(cleanAIResponse(result.content));
  const overall = score.overallScore || 0;
  const recs = score.recommendations?.join('\n') || null;
  await db.contentScore.upsert({
    where: { articleId },
    create: {
      articleId, overallScore: overall,
      originalityScore: score.originalityScore || 0,
      readabilityScore: score.readabilityScore || 0,
      searchIntentScore: score.searchIntentScore || 0,
      depthScore: score.depthScore || 0,
      authorityScore: score.authorityScore || 0,
      factualScore: score.factualScore || 0,
      internalLinkScore: score.internalLinkScore || 0,
      monetizationReadinessScore: score.monetizationReadinessScore || 0,
      recommendations: recs,
    },
    update: {
      overallScore: overall,
      originalityScore: score.originalityScore || 0,
      readabilityScore: score.readabilityScore || 0,
      searchIntentScore: score.searchIntentScore || 0,
      depthScore: score.depthScore || 0,
      authorityScore: score.authorityScore || 0,
      factualScore: score.factualScore || 0,
      internalLinkScore: score.internalLinkScore || 0,
      monetizationReadinessScore: score.monetizationReadinessScore || 0,
      recommendations: recs,
    },
  });
  await db.article.update({ where: { id: articleId }, data: { qualityScore: overall, lastReviewedAt: new Date() } });
  return score;
}
