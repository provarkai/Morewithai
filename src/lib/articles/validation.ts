import { db } from '@/lib/db';
import { canTransition } from './workflow';

export interface PublishingGateResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

export async function validateStatusTransition(
  articleId: string,
  newStatus: string,
): Promise<{ allowed: boolean; reason?: string }> {
  const article = await db.article.findUnique({ where: { id: articleId } });
  if (!article) return { allowed: false, reason: 'Article not found' };
  return canTransition(article.status, newStatus);
}

export async function validatePublishingGate(articleId: string): Promise<PublishingGateResult> {
  const article = await db.article.findUnique({
    where: { id: articleId },
    include: { author: true, category: true },
  });

  if (!article) return { passed: false, errors: ['Article not found'], warnings: [] };

  const errors: string[] = [];
  const warnings: string[] = [];

  if (!article.rewrittenTitle && !article.title) errors.push('Article has no title');
  if (!article.slug) errors.push('Article has no slug');
  if (!article.rewrittenContent && !article.originalContent) errors.push('Article has no content');
  if (!article.authorId) warnings.push('No author assigned');
  if (!article.categoryId) warnings.push('No category assigned');
  if (!article.seoTitle) warnings.push('No SEO title');
  if (!article.seoDescription) warnings.push('No meta description');
  if (article.seoScore !== null && article.seoScore < 50) warnings.push(`SEO score is low (${article.seoScore}/100)`);
  if (article.qualityScore !== null && article.qualityScore < 50) warnings.push(`Quality score is low (${article.qualityScore}/100)`);

  return { passed: errors.length === 0, errors, warnings };
}

export async function recordScoreOverride(articleId: string, userId: string, reason: string): Promise<void> {
  const article = await db.article.findUnique({ where: { id: articleId }, select: { siteId: true } });
  if (!article) return;
  await db.automationLog.create({
    data: {
      action: 'SCORE_OVERRIDE',
      status: 'completed',
      message: `Score override for article ${articleId}`,
      details: JSON.stringify({ articleId, userId, reason }),
      siteId: article.siteId,
    },
  });
}
