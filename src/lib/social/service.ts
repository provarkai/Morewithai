import { db } from '@/lib/db';
import { callAI, cleanAIResponse } from '@/lib/ai/client';
import type { CreateSocialTemplateInput, CreateSocialPostInput, SocialPostFilters } from '@/lib/growth/types';

// ─── Templates CRUD ──────────────────────────────────────────

export async function createTemplate(data: CreateSocialTemplateInput) {
  return db.socialTemplate.create({
    data: {
      siteId: data.siteId,
      platform: data.platform,
      name: data.name,
      template: data.template,
    },
  });
}

export async function listTemplates(siteId: string, filters?: { platform?: string }) {
  const where: Record<string, unknown> = { siteId };
  if (filters?.platform) where.platform = filters.platform;

  return db.socialTemplate.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateTemplate(id: string, siteId: string, data: Partial<CreateSocialTemplateInput>) {
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.platform !== undefined) updateData.platform = data.platform;
  if (data.template !== undefined) updateData.template = data.template;

  return db.socialTemplate.update({
    where: { id, siteId },
    data: updateData,
  });
}

export async function deleteTemplate(id: string, siteId: string) {
  return db.socialTemplate.delete({ where: { id, siteId } });
}

// ─── Social Posts CRUD ───────────────────────────────────────

export async function createSocialPost(data: CreateSocialPostInput) {
  return (db as any).socialPost.create({
    data: {
      siteId: data.siteId,
      articleId: data.articleId ?? null,
      platform: data.platform,
      content: data.content,
    },
  });
}

export async function listSocialPosts(siteId: string, filters?: SocialPostFilters) {
  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { siteId };
  if (filters?.platform) where.platform = filters.platform;
  if (filters?.status) where.status = filters.status;
  if (filters?.articleId) where.articleId = filters.articleId;

  const [data, total] = await Promise.all([
    db.socialPost.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { article: { select: { id: true, title: true } } },
    }),
    db.socialPost.count({ where }),
  ]);

  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function updateSocialPost(id: string, siteId: string, data: Partial<CreateSocialPostInput> & { status?: string; publishedAt?: Date }) {
  const updateData: Record<string, unknown> = {};
  if (data.platform !== undefined) updateData.platform = data.platform;
  if (data.content !== undefined) updateData.content = data.content;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.publishedAt !== undefined) updateData.publishedAt = data.publishedAt;
  if ((data as any).engagementLikes !== undefined) updateData.engagementLikes = (data as any).engagementLikes;
  if ((data as any).engagementShares !== undefined) updateData.engagementShares = (data as any).engagementShares;
  if ((data as any).engagementComments !== undefined) updateData.engagementComments = (data as any).engagementComments;
  if ((data as any).engagementClicks !== undefined) updateData.engagementClicks = (data as any).engagementClicks;

  return db.socialPost.update({
    where: { id, siteId },
    data: updateData,
  });
}

export async function deleteSocialPost(id: string, siteId: string) {
  return db.socialPost.delete({ where: { id, siteId } });
}

// ─── Generate Social Post from Template ───────────────────────

export async function generateSocialPost(articleId: string, siteId: string, platform: string) {
  const [article, template] = await Promise.all([
    db.article.findFirst({
      where: { id: articleId, siteId },
      include: { author: { select: { name: true } } },
    }),
    db.socialTemplate.findFirst({
      where: { siteId, platform, isActive: true },
    }),
  ]);

  if (!article) throw new Error('Article not found');
  if (!template) throw new Error(`No active template found for platform: ${platform}`);

  const excerpt = article.excerpt ?? article.originalContent?.slice(0, 200) ?? '';
  const authorName = article.author?.name ?? '';
  const url = article.slug ? `/articles/${article.slug}` : '';

  const content = template.template
    .replace(/\{\{title\}\}/g, article.title)
    .replace(/\{\{excerpt\}\}/g, excerpt)
    .replace(/\{\{url\}\}/g, url)
    .replace(/\{\{author\}\}/g, authorName);

  return createSocialPost({
    siteId,
    articleId,
    platform: platform as any,
    content,
  });
}

// ─── Generate Posts for All Active Templates ─────────────────

export async function generatePostsForArticle(articleId: string, siteId: string) {
  const templates = await db.socialTemplate.findMany({
    where: { siteId, isActive: true },
  });

  const posts = await Promise.all(
    templates.map((t) => generateSocialPost(articleId, siteId, t.platform))
  );

  return posts;
}

// ─── AI Repurpose Article ─────────────────────────────────────

export async function repurposeArticle(articleId: string, siteId: string) {
  const article = await db.article.findFirst({
    where: { id: articleId, siteId },
  });

  if (!article) throw new Error('Article not found');

  const content = article.rewrittenContent ?? article.originalContent;

  const response = await callAI({
    siteId,
    articleId,
    jobType: 'CONTENT_REPURPOSING',
    systemPrompt:
      'You are a social media content strategist. Repurpose the given article into different formats. Return ONLY a valid JSON object with these keys: "newsletter_snippet" (2-3 sentence teaser for email), "linkedin_post" (professional post with insights, under 300 words), "x_post" (concise tweet under 280 chars), "short_form_script" (idea for a 60-second video script, 3-4 sentences), "faq_section" (3 relevant FAQ questions and answers as a JSON array of {q, a} objects).',
    userPrompt: `Title: ${article.title}\n\nExcerpt: ${article.excerpt ?? ''}\n\nContent: ${content?.slice(0, 3000) ?? ''}`,
  });

  let repurposed: Record<string, unknown>;
  try {
    repurposed = JSON.parse(cleanAIResponse(response.content));
  } catch {
    repurposed = {};
  }

  const posts = [];

  const entries: Array<{ platform: string; content: string }> = [
    { platform: 'X', content: typeof repurposed.x_post === 'string' ? repurposed.x_post : '' },
    { platform: 'LINKEDIN', content: typeof repurposed.linkedin_post === 'string' ? repurposed.linkedin_post : '' },
    { platform: 'X', content: typeof repurposed.newsletter_snippet === 'string' ? `📧 Newsletter: ${repurposed.newsletter_snippet}` : '' },
    { platform: 'X', content: typeof repurposed.short_form_script === 'string' ? `🎬 Video Idea: ${repurposed.short_form_script}` : '' },
  ];

  for (const entry of entries) {
    if (!entry.content.trim()) continue;
    const post = await createSocialPost({
      siteId,
      articleId,
      platform: entry.platform as any,
      content: entry.content,
    });
    // @ts-expect-error Prisma type
    posts.push(post as any);
  }

  return { posts, repurposed };
}

// ─── Social Stats ─────────────────────────────────────────────

export async function getSocialStats(siteId: string) {
  const [total, byPlatform, byStatus] = await Promise.all([
    db.socialPost.count({ where: { siteId } }),
    db.socialPost.groupBy({
      by: ['platform'],
      where: { siteId },
      _count: true,
      _sum: {
        engagementLikes: true,
        engagementShares: true,
        engagementComments: true,
        engagementClicks: true,
      },
    }),
    db.socialPost.groupBy({
      by: ['status'],
      where: { siteId },
      _count: true,
    }),
  ]);

  const totalEngagement = byPlatform.reduce(
    (sum, p) =>
      sum +
      (p._sum.engagementLikes ?? 0) +
      (p._sum.engagementShares ?? 0) +
      (p._sum.engagementComments ?? 0) +
      (p._sum.engagementClicks ?? 0),
    0
  );

  return {
    totalPosts: total,
    totalEngagement,
    byPlatform: byPlatform.map((p) => ({
      platform: p.platform,
      count: p._count,
      engagement: {
        likes: p._sum.engagementLikes ?? 0,
        shares: p._sum.engagementShares ?? 0,
        comments: p._sum.engagementComments ?? 0,
        clicks: p._sum.engagementClicks ?? 0,
      },
    })),
    byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
  };
}
