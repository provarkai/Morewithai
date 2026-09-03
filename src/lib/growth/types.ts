// ─── Opportunity Types ─────────────────────────────────────────

export const OPPORTUNITY_TYPES = {
  NEW_TOPIC: 'NEW_TOPIC',
  UPDATE: 'UPDATE',
  EXPAND: 'EXPAND',
  INTERNAL_LINK: 'INTERNAL_LINK',
  MONETIZE: 'MONETIZE',
  CONVERSION: 'CONVERSION',
  SEO: 'SEO',
} as const;

export type OpportunityType = (typeof OPPORTUNITY_TYPES)[keyof typeof OPPORTUNITY_TYPES];

// ─── Priority Levels ───────────────────────────────────────────

export const PRIORITIES = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

export type Priority = (typeof PRIORITIES)[keyof typeof PRIORITIES];

// ─── Opportunity Status ────────────────────────────────────────

export const OPPORTUNITY_STATUS = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  DISMISSED: 'DISMISSED',
} as const;

export type OpportunityStatus = (typeof OPPORTUNITY_STATUS)[keyof typeof OPPORTUNITY_STATUS];

// ─── Recommendation Status ─────────────────────────────────────

export const RECOMMENDATION_STATUS = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  DISMISSED: 'DISMISSED',
} as const;

export type RecommendationStatus = (typeof RECOMMENDATION_STATUS)[keyof typeof RECOMMENDATION_STATUS];

// ─── Calendar Event Types ──────────────────────────────────────

export const CALENDAR_EVENT_TYPES = {
  PUBLISH: 'PUBLISH',
  UPDATE: 'UPDATE',
  PROMOTE: 'PROMOTE',
  MONETIZE: 'MONETIZE',
  REPURPOSE: 'REPURPOSE',
} as const;

export type CalendarEventType = (typeof CALENDAR_EVENT_TYPES)[keyof typeof CALENDAR_EVENT_TYPES];

// ─── Cluster Article Roles ─────────────────────────────────────

export const CLUSTER_ARTICLE_ROLES = {
  PILLAR: 'PILLAR',
  SUPPORTING: 'SUPPORTING',
} as const;

export type ClusterArticleRole = (typeof CLUSTER_ARTICLE_ROLES)[keyof typeof CLUSTER_ARTICLE_ROLES];

// ─── Social Platforms ──────────────────────────────────────────

export const SOCIAL_PLATFORMS = {
  X: 'X',
  LINKEDIN: 'LINKEDIN',
  FACEBOOK: 'FACEBOOK',
  INSTAGRAM: 'INSTAGRAM',
  PINTEREST: 'PINTEREST',
} as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[keyof typeof SOCIAL_PLATFORMS];

// ─── Interfaces ────────────────────────────────────────────────

export interface CreateOpportunityInput {
  siteId: string;
  articleId?: string;
  type: OpportunityType;
  title: string;
  description: string;
  expectedImpact?: string;
  priority?: Priority;
  aiGenerated?: boolean;
  metadata?: string;
}

export interface UpdateOpportunityInput {
  title?: string;
  description?: string;
  expectedImpact?: string;
  priority?: Priority;
  status?: OpportunityStatus;
  metadata?: string;
}

export interface OpportunityFilters {
  type?: OpportunityType;
  priority?: Priority;
  status?: OpportunityStatus;
  aiGenerated?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateRecommendationInput {
  siteId: string;
  articleId?: string;
  problem: string;
  opportunity: string;
  recommendedAction: string;
  expectedImpact?: string;
  priority?: Priority;
  aiGenerated?: boolean;
  metadata?: string;
}

export interface UpdateRecommendationInput {
  problem?: string;
  opportunity?: string;
  recommendedAction?: string;
  expectedImpact?: string;
  priority?: Priority;
  status?: RecommendationStatus;
  metadata?: string;
}

export interface RecommendationFilters {
  priority?: Priority;
  status?: RecommendationStatus;
  page?: number;
  limit?: number;
}

export interface CreateClusterInput {
  siteId: string;
  name: string;
  slug: string;
  description?: string;
  pillarArticleId?: string;
}

export interface UpdateClusterInput {
  name?: string;
  description?: string;
  pillarArticleId?: string | null;
  status?: string;
}

export interface ClusterFilters {
  status?: string;
  page?: number;
  limit?: number;
}

export interface CreateSocialTemplateInput {
  siteId: string;
  platform: SocialPlatform;
  name: string;
  template: string;
}

export interface CreateSocialPostInput {
  siteId: string;
  articleId?: string;
  platform: SocialPlatform;
  content: string;
}

export interface SocialPostFilters {
  platform?: SocialPlatform;
  status?: string;
  articleId?: string;
  page?: number;
  limit?: number;
}

export interface CreateCalendarEventInput {
  siteId: string;
  articleId?: string;
  eventType: CalendarEventType;
  title: string;
  description?: string;
  scheduledDate: Date | string;
  priority?: Priority;
}

export interface UpdateCalendarEventInput {
  eventType?: CalendarEventType;
  title?: string;
  description?: string;
  scheduledDate?: Date | string;
  status?: string;
  priority?: Priority;
}

export interface CalendarEventFilters {
  eventType?: CalendarEventType;
  status?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  page?: number;
  limit?: number;
}

export interface CreateAutomationRuleInput {
  siteId: string;
  name: string;
  triggerCondition: object;
  action: object;
  isActive?: boolean;
}

export interface UpdateAutomationRuleInput {
  name?: string;
  triggerCondition?: object;
  action?: object;
  isActive?: boolean;
}

export interface MoneyScoreBreakdown {
  trafficPotential: number;
  searchIntent: number;
  commercialRelevance: number;
  conversionPotential: number;
  affiliateRelevance: number;
  existingPerformance: number;
}

export interface MoneyScoreResult {
  articleId: string;
  title: string;
  totalScore: number;
  breakdown: MoneyScoreBreakdown;
}

export interface RuleEvaluationResult {
  ruleId: string;
  ruleName: string;
  triggered: boolean;
  action: string;
  result?: string;
  error?: string;
}
