// ─── Source Type ────────────────────────────────

export const SOURCE_TYPE = {
  AFFILIATE: 'AFFILIATE',
  PRODUCT: 'PRODUCT',
  ADS: 'ADS',
  SPONSORSHIP: 'SPONSORSHIP',
  SERVICE: 'SERVICE',
  OTHER: 'OTHER',
} as const;

export type SourceType = (typeof SOURCE_TYPE)[keyof typeof SOURCE_TYPE];

// ─── Revenue Status ──────────────────────────────

export const REVENUE_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  FAILED: 'FAILED',
  ADJUSTED: 'ADJUSTED',
} as const;

export type RevenueStatus = (typeof REVENUE_STATUS)[keyof typeof REVENUE_STATUS];

// ─── Input Types ───────────────────────────────

export interface RecordRevenueInput {
  siteId: string;
  articleId?: string;
  sourceType: SourceType;
  sourceId?: string;
  amount: number;
  currency?: string;
  status?: RevenueStatus;
}

export interface CreateAdjustmentInput {
  siteId: string;
  relatedEventId: string;
  amount: number;
  reason: string;
  createdBy?: string;
}

export interface RevenuePeriod {
  startDate?: Date;
  endDate?: Date;
}

export interface ArticleRevenueData {
  articleId: string;
  articleTitle: string;
  totalRevenue: number;
  visitors: number;
  rpm: number;
  conversions: number;
  bySource: Record<string, number>;
}