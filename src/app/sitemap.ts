import { db } from '@/lib/db';
import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sites = await db.site.findMany({ select: { id: true, domain: true, slug: true } });
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://morewithai.online';

  const entries: MetadataRoute.Sitemap = [];

  for (const site of sites) {
    const domain = site.domain || `${site.slug}.morewithai.online`;
    const siteBase = `https://${domain}`;

    entries.push({ url: siteBase, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 });

    const articles = await db.article.findMany({
      where: { siteId: site.id, status: { in: ['PUBLISHED', 'published', 'UPDATED'] } },
      select: { slug: true, updatedAt: true, rewrittenTitle: true, title: true, publishedAt: true },
    });

    for (const article of articles) {
      const slug = article.slug || article.rewrittenTitle?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || '';
      if (!slug) continue;
      entries.push({
        url: `${siteBase}/blog/${slug}`,
        lastModified: new Date(article.updatedAt),
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }

    const categories = await db.category.findMany({
      where: { siteId: site.id, isActive: true },
      select: { slug: true, updatedAt: true },
    });

    for (const cat of categories) {
      entries.push({
        url: `${siteBase}/category/${cat.slug}`,
        lastModified: new Date(cat.updatedAt),
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }

    const authors = await db.author.findMany({
      where: { siteId: site.id, isActive: true },
      select: { slug: true, updatedAt: true },
    });

    for (const author of authors) {
      entries.push({
        url: `${siteBase}/author/${author.slug}`,
        lastModified: new Date(author.updatedAt),
        changeFrequency: 'monthly',
        priority: 0.5,
      });
    }
  }

  return entries;
}
