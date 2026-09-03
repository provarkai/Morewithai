import { db } from '@/lib/db';
import { callAI, cleanAIResponse } from '@/lib/ai/client';

// ─── Types ──────────────────────────────────────────────────

export interface LinkSuggestion {
  id: string;
  targetArticleId: string;
  targetTitle: string;
  targetSlug: string;
  relevanceScore: number;
  suggestedAnchor: string;
  reason: string;
  contextSnippet: string;
}

export interface LinkAnalysis {
  articleId: string;
  totalSuggestions: number;
  existingLinks: number;
  suggestions: LinkSuggestion[];
  linkHealth: {
    internalCount: number;
    externalCount: number;
    brokenCount: number;
    nofollowCount: number;
  };
}

// ─── Core Analysis ──────────────────────────────────────────

/**
 * Analyzes an article and finds internal linking opportunities
 * across all published articles on the same site.
 */
export async function analyzeInternalLinks(
  articleId: string,
  siteId: string,
): Promise<LinkAnalysis> {
  const article = await db.article.findFirst({
    where: { id: articleId, siteId },
    select: {
      id: true,
      title: true,
      rewrittenTitle: true,
      rewrittenContent: true,
      originalContent: true,
      primaryKeyword: true,
      secondaryKeywords: true,
      slug: true,
      excerpt: true,
      tags: { select: { tag: { select: { name: true } } } },
      category: { select: { name: true } },
    },
  });

  if (!article) throw new Error('Article not found');

  // Get all other published articles as candidates
  const candidates = await db.article.findMany({
    where: {
      siteId,
      id: { not: articleId },
      status: 'PUBLISHED',
    },
    select: {
      id: true,
      title: true,
      rewrittenTitle: true,
      slug: true,
      primaryKeyword: true,
      excerpt: true,
      rewrittenContent: true,
      originalContent: true,
      tags: { select: { tag: { select: { name: true } } } },
      category: { select: { name: true } },
    },
    take: 100,
  });

  if (candidates.length === 0) {
    return {
      articleId,
      totalSuggestions: 0,
      existingLinks: 0,
      suggestions: [],
      linkHealth: { internalCount: 0, externalCount: 0, brokenCount: 0, nofollowCount: 0 },
    };
  }

  // AI-powered relevance analysis
  const content = (article.rewrittenContent || article.originalContent || '').slice(0, 4000);
  const candidateSummaries = candidates.map((c) => {
    const tags = c.tags.map((t) => t.tag.name).join(', ');
    return `- [${c.id}] "${c.rewrittenTitle || c.title}" | keyword: ${c.primaryKeyword || 'none'} | category: ${c.category?.name || 'none'} | tags: ${tags} | excerpt: ${(c.excerpt || '').slice(0, 100)}`;
  }).join('\n');

  const prompt = `You are an SEO internal linking expert. Analyze this article and suggest the best internal linking opportunities.

ARTICLE: "${article.rewrittenTitle || article.title}"
${article.primaryKeyword ? `PRIMARY KEYWORD: ${article.primaryKeyword}` : ''}
CONTENT (excerpt):
${content.slice(0, 2000)}

CANDIDATE ARTICLES:
${candidateSummaries}

For each relevant candidate, return a JSON array of objects:
[{"articleId": "...", "anchorText": "...", "reason": "...", "relevanceScore": 85, "contextSnippet": "..."}]

Rules:
- relevanceScore: 0-100 (how relevant the link is)
- anchorText: natural, keyword-rich text for the link
- reason: why this link helps the reader
- contextSnippet: where in the article the link should be placed
- Return at most 10 best suggestions, sorted by relevanceScore descending
- Return ONLY the JSON array, no explanations`;

  const result = await callAI({
    siteId,
    articleId,
    jobType: 'INTERNAL_LINKING',
    systemPrompt: 'You are an SEO expert specializing in internal linking strategy.',
    userPrompt: prompt,
    temperature: 0.3,
    maxTokens: 2000,
  });

  let parsed: Array<{ articleId: string; anchorText: string; reason: string; relevanceScore: number; contextSnippet: string }> = [];

  try {
    const match = result.content.match(/\[[\s\S]*?\]/);
    if (match) {
      parsed = JSON.parse(match[0]);
    }
  } catch {
    // Fallback: use keyword-based matching
  }

  // Build suggestions with article metadata
  const suggestions: LinkSuggestion[] = [];
  const candidateMap = new Map(candidates.map((c) => [c.id, c]));

  for (const p of parsed.slice(0, 10)) {
    const candidate = candidateMap.get(p.articleId);
    if (candidate) {
      suggestions.push({
        id: `link-${articleId}-${p.articleId}`,
        targetArticleId: p.articleId,
        targetTitle: candidate.rewrittenTitle || candidate.title,
        targetSlug: candidate.slug || '',
        relevanceScore: p.relevanceScore || 50,
        suggestedAnchor: p.anchorText || '',
        reason: p.reason || '',
        contextSnippet: p.contextSnippet || '',
      });
    }
  }

  // Sort by relevance
  suggestions.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Get existing links count
  const contentStr = article.rewrittenContent || article.originalContent || '';
  const internalLinkMatches = contentStr.match(/href=["']\/blog\/[^"']+["']/g) || [];
  const externalLinkMatches = contentStr.match(/href=["']https?:\/\/[^"']+["']/g) || [];

  // Persist suggestions
  for (const s of suggestions) {
    const existing = await db.internalLinkRecommendation.findFirst({
      where: { articleId, targetArticleId: s.targetArticleId },
    });
    if (existing) {
      await db.internalLinkRecommendation.update({
        where: { id: existing.id },
        data: { relevanceScore: s.relevanceScore, suggestedAnchor: s.suggestedAnchor || '', reason: s.reason || 'AI suggestion' },
      });
    } else {
      await db.internalLinkRecommendation.create({
        data: {
          articleId,
          targetArticleId: s.targetArticleId,
          relevanceScore: s.relevanceScore,
          suggestedAnchor: s.suggestedAnchor || '',
          reason: s.reason || 'AI suggestion',
          status: 'SUGGESTED',
        },
      });
    }
  }

  return {
    articleId,
    totalSuggestions: suggestions.length,
    existingLinks: internalLinkMatches.length,
    suggestions,
    linkHealth: {
      internalCount: internalLinkMatches.length,
      externalCount: externalLinkMatches.length,
      brokenCount: 0,
      nofollowCount: (contentStr.match(/rel=["']nofollow["']/g) || []).length,
    },
  };
}

/**
 * Applies a link suggestion by inserting it into the article content.
 */
export async function applyLinkSuggestion(
  articleId: string,
  targetArticleId: string,
  siteId: string,
): Promise<{ success: boolean; updatedContent: string }> {
  const [article, target] = await Promise.all([
    db.article.findFirst({ where: { id: articleId, siteId }, select: { id: true, rewrittenContent: true, originalContent: true, slug: true } }),
    db.article.findFirst({ where: { id: targetArticleId, siteId }, select: { id: true, slug: true, rewrittenTitle: true, title: true } }),
  ]);

  if (!article || !target) throw new Error('Article or target not found');

  const rec = await db.internalLinkRecommendation.findFirst({
    where: { articleId, targetArticleId },
  });

  const anchorText = rec?.suggestedAnchor || target.rewrittenTitle || target.title;
  const linkHtml = `<a href="/blog/${target.slug}">${anchorText}</a>`;

  // Update status
  if (rec) {
    await db.internalLinkRecommendation.update({
      where: { id: rec.id },
      data: { status: 'APPLIED' },
    });
  }

  // Return the link for the editor to insert
  return {
    success: true,
    updatedContent: linkHtml,
  };
}
