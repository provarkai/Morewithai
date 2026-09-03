import { db } from '@/lib/db';

export interface LinkRecommendation {
  targetArticleId: string;
  title: string;
  relevanceScore: number;
  suggestedAnchor: string;
  reason: string;
}

export async function recommendInternalLinks(
  articleId: string,
  siteId: string,
): Promise<LinkRecommendation[]> {
  const article = await db.article.findUnique({
    where: { id: articleId },
    include: { category: true, tags: { include: { tag: true } } },
  });
  if (!article) throw new Error('Article not found');

  const keywords = [
    article.primaryKeyword,
    article.secondaryKeywords,
    article.category?.name,
    ...(article.tags?.map((t) => t.tag?.name) || []),
  ].filter(Boolean).join(' ').toLowerCase();

  // Get candidate articles (same site, not self, published)
  const candidates = await db.article.findMany({
    where: {
      siteId,
      id: { not: articleId },
      status: { in: ['PUBLISHED', 'published'] },
    },
    include: { category: true, tags: { include: { tag: true } } },
    take: 50,
  });

  const scored: LinkRecommendation[] = [];

  for (const candidate of candidates) {
    let score = 0;
    const cKeywords = [
      candidate.primaryKeyword,
      candidate.secondaryKeywords,
      candidate.category?.name,
      ...(candidate.tags?.map((t) => t.tag?.name) || []),
    ].filter(Boolean).join(' ').toLowerCase();

    // Category match
    if (article.categoryId && article.categoryId === candidate.categoryId) score += 30;

    // Tag overlap
    const articleTags = new Set(article.tags?.map((t) => t.tagId) || []);
    const candidateTags = new Set(candidate.tags?.map((t) => t.tagId) || []);
    const sharedTags = [...articleTags].filter((t) => candidateTags.has(t));
    score += sharedTags.length * 15;

    // Keyword overlap
    const articleKwSet = new Set(keywords.split(/\s+/));
    const candidateKwSet = new Set(cKeywords.split(/\s+/));
    const sharedKw = [...articleKwSet].filter((w) => w.length > 3 && candidateKwSet.has(w));
    score += Math.min(sharedKw.length * 5, 25);

    if (score > 20) {
      const bestAnchor = sharedKw[0] || candidate.title.split(' ').slice(0, 3).join(' ');
      scored.push({
        targetArticleId: candidate.id,
        title: candidate.rewrittenTitle || candidate.title,
        relevanceScore: Math.min(99, score),
        suggestedAnchor: bestAnchor,
        reason: score > 60
          ? 'Strong topic overlap'
          : sharedTags.length > 0
            ? `Shares ${sharedTags.length} tag(s)`
            : 'Related topic',
      });
    }
  }

  // Sort by relevance, return top 8
  scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
  return scored.slice(0, 8);
}
