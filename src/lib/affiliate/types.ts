// ─── Affiliate Program Status ──────────────────────────────

export const PROGRAM_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  ARCHIVED: 'ARCHIVED',
} as const;

export type ProgramStatus = (typeof PROGRAM_STATUS)[keyof typeof PROGRAM_STATUS];

// ─── Click Status ──────────────────────────────────────────────

export const CLICK_STATUS = {
  CLICKED: 'CLICKED',
  CONVERTED: 'CONVERTED',
  BOUNCED: 'BOUNCED',
} as const;

export type ClickStatus = (typeof CLICK_STATUS)[keyof typeof CLICK_STATUS];

// ─── Input Types ───────────────────────────────────────────────

export interface CreateProgramInput {
  siteId: string;
  name: string;
  network?: string;
  website?: string;
  commissionType?: string;
  commissionValue?: number;
  cookieDuration?: number;
  terms?: string;
  status?: ProgramStatus;
}

export interface UpdateProgramInput {
  name?: string;
  network?: string;
  website?: string;
  commissionType?: string;
  commissionValue?: number;
  cookieDuration?: number;
  terms?: string;
  status?: ProgramStatus;
}

export interface CreateOfferInput {
  siteId: string;
  programId: string;
  name: string;
  description?: string;
  destinationUrl: string;
  affiliateUrl: string;
  category?: string;
  commission?: number;
  priority?: number;
  status?: string;
}

export interface UpdateOfferInput {
  name?: string;
  description?: string;
  destinationUrl?: string;
  affiliateUrl?: string;
  category?: string;
  commission?: number;
  priority?: number;
  status?: string;
}

export interface TrackClickInput {
  siteId: string;
  offerId: string;
  articleId?: string;
  subscriberId?: string;
  sessionIdentifier?: string;
  ip?: string;
  userAgent?: string;
  referrer?: string;
}

export interface ClickStatsFilters {
  articleId?: string;
  offerId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface OfferListFilters {
  programId?: string;
  category?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface AffiliateRecommendation {
  offer: Record<string, unknown>;
  score: number;
  scoreBreakdown: {
    relevance: number;
    commission: number;
    conversionHistory: number;
    editorPriority: number;
  };
}
