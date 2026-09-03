export const REFRESH_REASONS = {
  AGE_30: 'AGE_30',
  AGE_60: 'AGE_60',
  AGE_90: 'AGE_90',
  AGE_180: 'AGE_180',
  LOW_SEO: 'LOW_SEO',
  LOW_QUALITY: 'LOW_QUALITY',
  MANUAL: 'MANUAL',
  SCHEDULED: 'SCHEDULED',
} as const;

export type RefreshReason = (typeof REFRESH_REASONS)[keyof typeof REFRESH_REASONS];

export const REFRESH_STATUSES = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  SKIPPED: 'SKIPPED',
} as const;

export type RefreshStatus = (typeof REFRESH_STATUSES)[keyof typeof REFRESH_STATUSES];

export const FRESHNESS_LABELS: Record<string, { label: string; color: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  FRESH: { label: 'Fresh', color: 'text-emerald-600', variant: 'default' },
  AGING: { label: 'Aging', color: 'text-amber-600', variant: 'secondary' },
  STALE: { label: 'Stale', color: 'text-orange-600', variant: 'secondary' },
  OUTDATED: { label: 'Outdated', color: 'text-red-600', variant: 'destructive' },
};

export interface RefreshCandidate {
  id: string;
  title: string;
  status: string;
  publishedAt: string | Date | null;
  updatedAt: string | Date;
  seoScore: number | null;
  qualityScore: number | null;
  nextReviewAt: string | Date | null;
  wordCount: number | null;
  freshnessStatus: string;
  suggestedReason: string;
  daysSincePublish: number | null;
  daysSinceUpdate: number;
}

export const AGE_THRESHOLDS_DAYS = [
  { days: 30, reason: 'AGE_30' as const, freshness: 'AGING' },
  { days: 60, reason: 'AGE_60' as const, freshness: 'STALE' },
  { days: 90, reason: 'AGE_90' as const, freshness: 'STALE' },
  { days: 180, reason: 'AGE_180' as const, freshness: 'OUTDATED' },
];

export const SCORE_THRESHOLDS = {
  SEO: 50,
  QUALITY: 50,
} as const;
