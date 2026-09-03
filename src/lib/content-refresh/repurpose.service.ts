import { db } from '@/lib/db';
import { callAI, cleanAIResponse } from '@/lib/ai/client';

export interface RepurposedContent {
  articleId: string;
  formats: {
    twitterThread: string[];
    linkedinPost: string;
    newsletterTeaser: string;
    videoScript: string;
    faqSection: { question: string; answer: string }[];
    emailDigest: string;
    blogSummary: string;
  };
  distributionScore: number; // 0-100
}

/**
 * Repurpose an article into multiple content formats using AI.
 */
export async function repurposeArticleToFormats(
  articleId: string,
  siteId: string
): Promise<RepurposedContent> {
  const article = await db.article.findFirst({
    where: { id: articleId, siteId },
    include: {
      author: { select: { name: true } },
      category: { select: { name: true } },
    },
  });

  if (!article) throw new Error('Article not found');

  const content = article.rewrittenContent ?? article.originalContent;
  const excerpt = article.excerpt ?? content?.slice(0, 200) ?? '';

  const response = await callAI({
    siteId,
    articleId,
    jobType: 'CONTENT_REPURPOSING',
    systemPrompt: `You are a content repurposing expert. Given an article, create multiple content formats.

Return ONLY a valid JSON object with these keys:
- "twitter_thread": an array of 3-5 tweets for a thread (each under 280 chars), the first should hook readers
- "linkedin_post": a professional LinkedIn post (under 300 words) with insights and a call-to-action
- "newsletter_teaser": a 2-3 sentence email teaser to drive clicks
- "video_script": a 60-second video script with hook, 3 key points, and CTA
- "faq_section": an array of 3 relevant FAQ objects with "question" and "answer" keys
- "email_digest": a weekly newsletter section summarizing the article (2-3 paragraphs)
- "blog_summary": a 2-3 sentence summary for the homepage or social bio`,
    userPrompt: `Title: ${article.title}
Category: ${article.category?.name ?? 'General'}
Author: ${article.author?.name ?? 'Unknown'}
Excerpt: ${excerpt}
Content (first 3000 chars): ${content?.slice(0, 3000) ?? ''}`,
  });

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleanAIResponse(response.content));
  } catch {
    parsed = {};
  }

  const formats: RepurposedContent['formats'] = {
    twitterThread: Array.isArray(parsed.twitter_thread)
      ? parsed.twitter_thread.map(String)
      : typeof parsed.x_post === 'string' ? [parsed.x_post] : [],
    linkedinPost: typeof parsed.linkedin_post === 'string' ? parsed.linkedin_post : '',
    newsletterTeaser: typeof parsed.newsletter_teaser === 'string' ? parsed.newsletter_teaser : '',
    videoScript: typeof parsed.video_script === 'string' ? parsed.video_script : '',
    faqSection: Array.isArray(parsed.faq_section) ? parsed.faq_section : [],
    emailDigest: typeof parsed.email_digest === 'string' ? parsed.email_digest : '',
    blogSummary: typeof parsed.blog_summary === 'string' ? parsed.blog_summary : '',
  };

  // Calculate distribution score based on how many formats were generated
  const filledFormats = [
    formats.twitterThread.length > 0,
    formats.linkedinPost.length > 0,
    formats.newsletterTeaser.length > 0,
    formats.videoScript.length > 0,
    formats.faqSection.length > 0,
    formats.emailDigest.length > 0,
    formats.blogSummary.length > 0,
  ].filter(Boolean).length;

  const distributionScore = Math.round((filledFormats / 7) * 100);

  return { articleId, formats, distributionScore };
}

/**
 * Get the distribution score for all published articles on a site.
 * Shows how well each article has been repurposed across channels.
 */
export async function getDistributionScores(siteId: string) {
  const articles = await db.article.findMany({
    where: {
      siteId,
      status: { in: ['PUBLISHED', 'published', 'UPDATED'] },
    },
    select: {
      id: true,
      title: true,
      slug: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  });

  // Check how many social posts exist per article
  const articleIds = articles.map((a) => a.id);
  const socialPosts = await db.socialPost.groupBy({
    by: ['articleId'],
    where: {
      siteId,
      articleId: { in: articleIds },
      status: { not: 'deleted' },
    },
    _count: true,
  });

  const postCountMap = new Map<string, number>();
  for (const group of socialPosts) {
    if (group.articleId) postCountMap.set(group.articleId, group._count);
  }

  return articles.map((article) => {
    const postCount = postCountMap.get(article.id) ?? 0;
    // Score: 0 posts = 0%, 1 post = 20%, 3+ posts = 60%, 5+ posts = 80%, 7+ = 100%
    const distributionScore = Math.min(100, Math.round(
      postCount >= 7 ? 100 :
      postCount >= 5 ? 80 :
      postCount >= 3 ? 60 :
      postCount >= 1 ? 20 + postCount * 10 :
      0
    ));

    return {
      articleId: article.id,
      title: article.title,
      slug: article.slug,
      socialPostCount: postCount,
      distributionScore,
    };
  }).sort((a, b) => a.distributionScore - b.distributionScore);
}
