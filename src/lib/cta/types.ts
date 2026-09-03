// ─── CTA Type Constants ────────────────────────────────────────
export const CTA_TYPES = {
  NEWSLETTER: 'NEWSLETTER',
  LEAD_MAGNET: 'LEAD_MAGNET',
  AFFILIATE: 'AFFILIATE',
  PRODUCT: 'PRODUCT',
  SERVICE: 'SERVICE',
  DOWNLOAD: 'DOWNLOAD',
  COURSE: 'COURSE',
  CUSTOM: 'CUSTOM',
} as const;

export type CtaType = (typeof CTA_TYPES)[keyof typeof CTA_TYPES];

// ─── Placement Constants ──────────────────────────────────────
export const PLACEMENTS = {
  TOP: 'TOP',
  AFTER_INTRO: 'AFTER_INTRO',
  MID_ARTICLE: 'MID_ARTICLE',
  AFTER_SECTION: 'AFTER_SECTION',
  BEFORE_CONCLUSION: 'BEFORE_CONCLUSION',
  AFTER_ARTICLE: 'AFTER_ARTICLE',
  SIDEBAR: 'SIDEBAR',
  STICKY: 'STICKY',
} as const;

export type Placement = (typeof PLACEMENTS)[keyof typeof PLACEMENTS];

// ─── Experiment Status Constants ──────────────────────────────
export const EXPERIMENT_STATUSES = {
  RUNNING: 'RUNNING',
  PAUSED: 'PAUSED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type ExperimentStatus = (typeof EXPERIMENT_STATUSES)[keyof typeof EXPERIMENT_STATUSES];

// ─── Interfaces ───────────────────────────────────────────────

export interface CreateCtaInput {
  siteId: string;
  name: string;
  type?: CtaType;
  headline: string;
  description?: string;
  buttonText: string;
  buttonUrl?: string;
  targetPlacement?: Placement;
  targetArticleId?: string;
  targetCategoryId?: string;
  targetTagId?: string;
  leadMagnetId?: string;
  affiliateOfferId?: string;
  productId?: string;
  isActive?: boolean;
}

export interface UpdateCtaInput {
  name?: string;
  type?: CtaType;
  headline?: string;
  description?: string;
  buttonText?: string;
  buttonUrl?: string;
  targetPlacement?: Placement;
  targetArticleId?: string;
  targetCategoryId?: string;
  targetTagId?: string;
  leadMagnetId?: string;
  affiliateOfferId?: string;
  productId?: string;
  isActive?: boolean;
}

export interface CtaWithStats {
  id: string;
  siteId: string;
  name: string;
  type: string;
  headline: string;
  description: string | null;
  buttonText: string;
  buttonUrl: string | null;
  targetPlacement: string;
  targetArticleId: string | null;
  targetCategoryId: string | null;
  targetTagId: string | null;
  leadMagnetId: string | null;
  affiliateOfferId: string | null;
  productId: string | null;
  isActive: boolean;
  impressionCount: number;
  clickCount: number;
  conversionCount: number;
  ctr: number;
  conversionRate: number;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    placements: number;
    experiments: number;
  };
}

export interface CtaRenderContext {
  articleId?: string;
  categoryId?: string;
  tags?: string[];
  source?: string;
  device?: string;
  placement?: string;
}

export interface CtaTargetingRule {
  targetPlacement?: Placement;
  targetArticleId?: string;
  targetCategoryId?: string;
  targetTagId?: string;
}

export interface CtaListFilters {
  type?: string;
  placement?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateExperimentVariantInput {
  name: string;
  headline: string;
  description?: string;
  buttonText: string;
  buttonUrl: string;
  isControl?: boolean;
}

export interface CreateExperimentInput {
  siteId: string;
  name: string;
  ctaId: string;
  variants: CreateExperimentVariantInput[];
}
