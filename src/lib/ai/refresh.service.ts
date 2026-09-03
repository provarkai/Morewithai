import { callAI, cleanAIResponse } from './client';
import { getRefreshPrompt } from './prompts';
import { db } from '@/lib/db';
import { createVersion } from '@/lib/articles/versioning';

export async function refreshArticleContent(articleId: string, siteId: string, reason: string = 'MANUAL') {
  const article = await db.article.findUnique({ where: { id: articleId } });
  if (!article) throw new Error('Article not found');

  const title = article.rewrittenTitle || article.title;
  const content = article.rewrittenContent || article.originalContent;

  // Create ContentRefresh record
  const refreshRecord = await db.contentRefresh.create({
    data: {
      articleId,
      reason,
      status: 'RUNNING',
      scheduledFor: new Date(),
    },
  });

  try {
    // Step 1: AI analyzes what's outdated
    const analysisResult = await callAI({
      siteId,
      articleId,
      jobType: 'REFRESH_ANALYSIS',
      systemPrompt: 'You are a content freshness analyst. Always respond with valid JSON only, no markdown.',
      userPrompt: getRefreshPrompt({ title, content }),
    });
    const analysis = JSON.parse(cleanAIResponse(analysisResult.content));

    // Step 2: Generate updated content if outdated info was found
    if (analysis.outdatedInfo?.length > 0 || analysis.missingInfo?.length > 0) {
      const updatePrompt =
        'Update this article to address the following issues identified in a freshness review.' +
        '\n\nTitle: ' + title +
        '\n\nCurrent Content:\n' + content.slice(0, 5000) +
        '\n\nOutdated Information Found:\n' + (analysis.outdatedInfo || []).join('\n') +
        '\n\nMissing Information (should be added):\n' + (analysis.missingInfo || []).join('\n') +
        (analysis.newSearchIntent?.length > 0 ? '\n\nNew search intent queries to address:\n' + analysis.newSearchIntent.join('\n') : '') +
        '\n\nReturn JSON: { "title": "updated title if needed", "content": "full updated article HTML preserving structure", "excerpt": "updated excerpt", "changesSummary": "brief summary of changes made" }' +
        '\n\nRespond with ONLY valid JSON.';

      const updateResult = await callAI({
        siteId,
        articleId,
        jobType: 'REFRESH_GENERATE',
        systemPrompt: 'You are an expert content updater. Update the article to be current and comprehensive. Always respond with valid JSON only, no markdown.',
        userPrompt: updatePrompt,
      });
      const updated = JSON.parse(cleanAIResponse(updateResult.content));

      // Step 3: Create version before updating
      await createVersion({
        articleId,
        title,
        content,
        excerpt: article.excerpt,
        changeReason: 'Auto-version before content refresh: ' + (analysis.refreshNotes || reason),
      });

      // Step 4: Update article with refreshed content
      const newContent = updated.content || content;
      const newTitle = updated.title || title;
      const newExcerpt = updated.excerpt || article.excerpt;
      const wordCount = newContent.split(/\s+/).filter(Boolean).length;
      const readingTime = Math.max(1, Math.ceil(wordCount / 200));

      await db.article.update({
        where: { id: articleId },
        data: {
          rewrittenTitle: newTitle !== title ? newTitle : undefined,
          rewrittenContent: newContent,
          excerpt: newExcerpt,
          wordCount,
          readingTime,
          status: 'UPDATING',
          seoScore: null,
          qualityScore: null,
        },
      });

      // Step 5: Re-run SEO and quality analysis on updated content
      let seoScore: number | null = null;
      let qualityScore: number | null = null;

      try {
        const { analyzeSeoWithAI } = await import('./seo.service');
        const seoResult = await analyzeSeoWithAI(articleId, siteId);
        seoScore = seoResult.overallScore || null;
      } catch {}

      try {
        const { scoreContent } = await import('./quality.service');
        const qualityResult = await scoreContent(articleId, siteId);
        qualityScore = qualityResult.overallScore || null;
      } catch {}

      // Step 6: Set to UPDATED status (requires editor review before republishing)
      await db.article.update({
        where: { id: articleId },
        data: {
          status: 'UPDATED',
          seoScore,
          qualityScore,
          lastReviewedAt: new Date(),
        },
      });

      // Update refresh record
      await db.contentRefresh.update({
        where: { id: refreshRecord.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          notes: analysis.refreshNotes || 'Content refreshed. Changes: ' + (updated.changesSummary || 'N/A'),
        },
      });

      return {
        success: true,
        analysis,
        updated: true,
        changesSummary: updated.changesSummary,
        seoScore,
        qualityScore,
      };
    } else {
      // No changes needed — article is still fresh
      await db.contentRefresh.update({
        where: { id: refreshRecord.id },
        data: {
          status: 'SKIPPED',
          completedAt: new Date(),
          notes: 'Article still fresh — no outdated or missing information detected.',
        },
      });

      // Push nextReviewAt forward 90 days
      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + 90);
      await db.article.update({
        where: { id: articleId },
        data: { nextReviewAt: nextReview },
      });

      return {
        success: true,
        analysis,
        updated: false,
        message: 'Article is still fresh. Next review scheduled in 90 days.',
      };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Refresh failed';
    await db.contentRefresh.update({
      where: { id: refreshRecord.id },
      data: { status: 'FAILED', completedAt: new Date(), notes: errorMsg },
    });
    // Revert status if it was changed
    if (article.status === 'PUBLISHED' || article.status === 'published') {
      await db.article.update({ where: { id: articleId }, data: { status: article.status } }).catch(() => {});
    }
    throw error;
  }
}
