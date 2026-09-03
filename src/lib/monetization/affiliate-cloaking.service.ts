import { db } from '@/lib/db';
import crypto from 'crypto';

// ─── Types ──────────────────────────────────────────────────

export interface CloakedLink {
  id: string;
  siteId: string;
  originalUrl: string;
  cloakedUrl: string;
  slug: string;
  title: string;
  category: string;
  destinationDomain: string;
  isActive: boolean;
  discloseAutomatically: boolean;
  disclosureText: string;
  clickCount: number;
  conversionCount: number;
  revenueGenerated: number;
  abTestEnabled: boolean;
  abVariants: CloakedLinkVariant[];
  createdAt: string;
}

export interface CloakedLinkVariant {
  id: string;
  url: string;
  weight: number;
  clicks: number;
  conversions: number;
}

export interface CloakedLinkAnalytics {
  totalLinks: number;
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  topLinks: { slug: string; title: string; clicks: number; conversions: number; ctr: number }[];
  categoryBreakdown: { category: string; links: number; clicks: number }[];
}

// ─── Link Management ────────────────────────────────────────

const CLOAKED_LINKS = new Map<string, CloakedLink>();

export async function createCloakedLink(
  siteId: string,
  data: {
    originalUrl: string;
    title: string;
    category?: string;
    discloseAutomatically?: boolean;
  },
): Promise<CloakedLink> {
  const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  const destinationUrl = new URL(data.originalUrl);
  const destinationDomain = destinationUrl.hostname;

  const link: CloakedLink = {
    id: `link-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    siteId,
    originalUrl: data.originalUrl,
    cloakedUrl: `/go/${slug}`,
    slug,
    title: data.title,
    category: data.category || 'general',
    destinationDomain,
    isActive: true,
    discloseAutomatically: true,
    disclosureText: `This is an affiliate link. We may earn a commission if you purchase through this link.`,
    clickCount: 0,
    conversionCount: 0,
    revenueGenerated: 0,
    abTestEnabled: false,
    abVariants: [],
    createdAt: new Date().toISOString(),
  };

  CLOAKED_LINKS.set(link.id, link);

  // Store as affiliate offer
  const program = await db.affiliateProgram.findFirst({ where: { siteId } });
  if (program) {
    await db.affiliateOffer.create({
      data: {
        siteId,
        programId: program.id,
        name: data.title,
        description: `Cloaked affiliate link for ${destinationDomain}`,
        destinationUrl: data.originalUrl,
        affiliateUrl: `/go/${slug}`,
        category: data.category || 'general',
        status: 'ACTIVE',
      },
    });
  }

  return link;
}

export async function getCloakedLinks(siteId: string): Promise<CloakedLink[]> {
  return Array.from(CLOAKED_LINKS.values()).filter((l) => l.siteId === siteId);
}

export async function getCloakedLinkBySlug(slug: string): Promise<CloakedLink | null> {
  for (const link of CLOAKED_LINKS.values()) {
    if (link.slug === slug) return link;
  }
  return null;
}

/**
 * Resolves a cloaked link — redirects to the real URL and tracks the click.
 */
export async function resolveCloakedLink(
  slug: string,
  visitorId?: string,
): Promise<{ redirectUrl: string; disclosureHtml: string } | null> {
  const link = Array.from(CLOAKED_LINKS.values()).find((l) => l.slug === slug);
  if (!link || !link.isActive) return null;

  let targetUrl = link.originalUrl;

  // A/B testing: pick a variant
  if (link.abTestEnabled && link.abVariants.length > 0) {
    const totalWeight = link.abVariants.reduce((s, v) => s + v.weight, 0);
    let random = Math.random() * totalWeight;
    for (const variant of link.abVariants) {
      random -= variant.weight;
      if (random <= 0) {
        targetUrl = variant.url;
        variant.clicks++;
        break;
      }
    }
  }

  link.clickCount++;

  // Record click as an affiliate event
  if (link.siteId) {
    await db.affiliateClick.create({
      data: {
        siteId: link.siteId,
        offerId: link.id,
        subscriberId: visitorId || null,
      },
    }).catch(() => {}); // Ignore if offer ID doesn't match
  }

  // Generate disclosure HTML
  const disclosureHtml = link.discloseAutomatically
    ? `<div class="affiliate-disclosure text-xs text-muted-foreground border-t pt-2 mt-4">${link.disclosureText}</div>`
    : '';

  return { redirectUrl: targetUrl, disclosureHtml };
}

// ─── A/B Testing ────────────────────────────────────────────

export async function enableAbTest(
  linkId: string,
  variants: { url: string; weight: number }[],
): Promise<CloakedLink | null> {
  const link = CLOAKED_LINKS.get(linkId);
  if (!link) return null;

  link.abTestEnabled = true;
  link.abVariants = variants.map((v, i) => ({
    id: `variant-${i}-${Date.now()}`,
    url: v.url,
    weight: v.weight,
    clicks: 0,
    conversions: 0,
  }));

  return link;
}

export async function getAbTestResults(linkId: string): Promise<CloakedLinkVariant[] | null> {
  const link = CLOAKED_LINKS.get(linkId);
  if (!link || !link.abTestEnabled) return null;
  return link.abVariants;
}

// ─── Analytics ──────────────────────────────────────────────

export async function getAffiliateAnalytics(siteId: string): Promise<CloakedLinkAnalytics> {
  const links = Array.from(CLOAKED_LINKS.values()).filter((l) => l.siteId === siteId);

  const categoryMap: Record<string, { links: number; clicks: number }> = {};

  for (const link of links) {
    if (!categoryMap[link.category]) categoryMap[link.category] = { links: 0, clicks: 0 };
    categoryMap[link.category].links++;
    categoryMap[link.category].clicks += link.clickCount;
  }

  return {
    totalLinks: links.length,
    totalClicks: links.reduce((s, l) => s + l.clickCount, 0),
    totalConversions: links.reduce((s, l) => s + l.conversionCount, 0),
    totalRevenue: links.reduce((s, l) => s + l.revenueGenerated, 0),
    topLinks: links
      .sort((a, b) => b.clickCount - a.clickCount)
      .slice(0, 10)
      .map((l) => ({
        slug: l.slug,
        title: l.title,
        clicks: l.clickCount,
        conversions: l.conversionCount,
        ctr: l.clickCount > 0 ? (l.conversionCount / l.clickCount) * 100 : 0,
      })),
    categoryBreakdown: Object.entries(categoryMap).map(([category, data]) => ({
      category,
      ...data,
    })),
  };
}
