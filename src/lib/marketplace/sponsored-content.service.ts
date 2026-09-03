import { db } from '@/lib/db';

// ─── Types ──────────────────────────────────────────────────

export type SponsorshipStatus = 'DRAFT' | 'OPEN' | 'APPLICATIONS_REVIEWING' | 'MATCHED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface Sponsorship {
  id: string;
  brandId: string;
  brandName: string;
  siteId: string;
  title: string;
  description: string;
  budget: number;
  currency: string;
  requirements: string[];
  contentFormat: string[];
  deadline: string;
  status: SponsorshipStatus;
  applicants: SponsorshipApplication[];
  createdAt: string;
}

export interface SponsorshipApplication {
  id: string;
  sponsorshipId: string;
  publisherId: string;
  publisherName: string;
  proposedPrice: number;
  proposal: string;
  portfolio: string[];
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
}

export interface MarketplaceListing {
  id: string;
  type: 'SPONSORSHIP_REQUEST' | 'PUBLISHER_OFFERING';
  title: string;
  description: string;
  budget: number | null;
  price: number | null;
  category: string;
  traffic: string;
  domain: string;
  rating: number;
  status: string;
  createdAt: string;
}

// ─── In-Memory Storage ──────────────────────────────────────

const SPONSORSHIPS = new Map<string, Sponsorship>();
const LISTINGS = new Map<string, MarketplaceListing>();

// ─── Brand Side ─────────────────────────────────────────────

export async function createSponsorship(data: {
  brandId: string;
  brandName: string;
  siteId: string;
  title: string;
  description: string;
  budget: number;
  requirements: string[];
  contentFormat: string[];
  deadline: string;
}): Promise<Sponsorship> {
  const sponsorship: Sponsorship = {
    id: `sponsor-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ...data,
    currency: 'NGN',
    status: 'OPEN',
    applicants: [],
    createdAt: new Date().toISOString(),
  };

  SPONSORSHIPS.set(sponsorship.id, sponsorship);

  // Create marketplace listing
  const listing: MarketplaceListing = {
    id: `listing-${sponsorship.id}`,
    type: 'SPONSORSHIP_REQUEST',
    title: data.title,
    description: data.description,
    budget: data.budget,
    price: null,
    category: data.contentFormat[0] || 'Blog Post',
    traffic: '',
    domain: '',
    rating: 0,
    status: 'OPEN',
    createdAt: new Date().toISOString(),
  };

  LISTINGS.set(listing.id, listing);

  return sponsorship;
}

export async function getBrandSponsorships(brandId: string): Promise<Sponsorship[]> {
  return Array.from(SPONSORSHIPS.values()).filter((s) => s.brandId === brandId);
}

export async function reviewApplications(
  sponsorshipId: string,
  brandId: string,
): Promise<Sponsorship | null> {
  const sponsorship = SPONSORSHIPS.get(sponsorshipId);
  if (!sponsorship || sponsorship.brandId !== brandId) return null;

  sponsorship.status = 'APPLICATIONS_REVIEWING';
  return sponsorship;
}

export async function acceptApplication(
  sponsorshipId: string,
  applicationId: string,
  brandId: string,
): Promise<Sponsorship | null> {
  const sponsorship = SPONSORSHIPS.get(sponsorshipId);
  if (!sponsorship || sponsorship.brandId !== brandId) return null;

  const app = sponsorship.applicants.find((a) => a.id === applicationId);
  if (!app) return null;

  app.status = 'ACCEPTED';
  sponsorship.status = 'MATCHED';

  // Reject other applicants
  for (const other of sponsorship.applicants) {
    if (other.id !== applicationId) other.status = 'REJECTED';
  }

  return sponsorship;
}

// ─── Publisher Side ──────────────────────────────────────────

export async function getOpenSponsorships(siteId?: string): Promise<Sponsorship[]> {
  return Array.from(SPONSORSHIPS.values()).filter(
    (s) => s.status === 'OPEN' && (!siteId || s.siteId !== siteId),
  );
}

export async function applyToSponsorship(
  sponsorshipId: string,
  data: {
    publisherId: string;
    publisherName: string;
    proposedPrice: number;
    proposal: string;
    portfolio: string[];
  },
): Promise<SponsorshipApplication | null> {
  const sponsorship = SPONSORSHIPS.get(sponsorshipId);
  if (!sponsorship || sponsorship.status !== 'OPEN') return null;

  // Check if already applied
  if (sponsorship.applicants.some((a) => a.publisherId === data.publisherId)) return null;

  const application: SponsorshipApplication = {
    id: `app-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    sponsorshipId,
    publisherId: data.publisherId,
    publisherName: data.publisherName,
    proposedPrice: data.proposedPrice,
    proposal: data.proposal,
    portfolio: data.portfolio,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };

  sponsorship.applicants.push(application);
  return application;
}

export async function getPublisherApplications(publisherId: string): Promise<{
  sponsorship: Sponsorship;
  application: SponsorshipApplication;
}[]> {
  const results: { sponsorship: Sponsorship; application: SponsorshipApplication }[] = [];

  for (const sponsorship of SPONSORSHIPS.values()) {
    for (const app of sponsorship.applicants) {
      if (app.publisherId === publisherId) {
        results.push({ sponsorship, application: app });
      }
    }
  }

  return results;
}

// ─── Marketplace ────────────────────────────────────────────

export async function getMarketplaceListings(filters?: {
  type?: MarketplaceListing['type'];
  category?: string;
  minBudget?: number;
  maxBudget?: number;
}): Promise<MarketplaceListing[]> {
  let listings = Array.from(LISTINGS.values());

  if (filters?.type) listings = listings.filter((l) => l.type === filters.type);
  if (filters?.category) listings = listings.filter((l) => l.category === filters.category);
  if (filters?.minBudget) listings = listings.filter((l) => (l.budget || l.price || 0) >= filters.minBudget!);
  if (filters?.maxBudget) listings = listings.filter((l) => (l.budget || l.price || 0) <= filters.maxBudget!);

  return listings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getSponsorshipStats(siteId: string): Promise<{
  totalSponsorships: number;
  activeSponsorships: number;
  completedSponsorships: number;
  totalEarnings: number;
  avgSponsorshipValue: number;
}> {
  const sponsorships = Array.from(SPONSORSHIPS.values()).filter((s) => s.siteId === siteId);

  return {
    totalSponsorships: sponsorships.length,
    activeSponsorships: sponsorships.filter((s) => ['MATCHED', 'IN_PROGRESS'].includes(s.status)).length,
    completedSponsorships: sponsorships.filter((s) => s.status === 'COMPLETED').length,
    totalEarnings: sponsorships
      .filter((s) => s.status === 'COMPLETED')
      .reduce((sum, s) => sum + s.budget, 0),
    avgSponsorshipValue: sponsorships.length > 0
      ? sponsorships.reduce((sum, s) => sum + s.budget, 0) / sponsorships.length
      : 0,
  };
}
