// ─── Placement Types ──────────────────────────────────────────

export const AD_PLACEMENT = {
  HEADER: 'HEADER',
  IN_ARTICLE: 'IN_ARTICLE',
  SIDEBAR: 'SIDEBAR',
  FOOTER: 'FOOTER',
} as const;

export type AdPlacementType = (typeof AD_PLACEMENT)[keyof typeof AD_PLACEMENT];

// ─── Event Types ──────────────────────────────────────────────

export const AD_EVENT_TYPE = {
  IMPRESSION: 'IMPRESSION',
  CLICK: 'CLICK',
} as const;

export type AdEventType = (typeof AD_EVENT_TYPE)[keyof typeof AD_EVENT_TYPE];

// ─── Input Types ───────────────────────────────────────────────

export interface CreateAdPlacementInput {
  siteId: string;
  name: string;
  placement?: AdPlacementType;
  provider?: string;
  adUnitId?: string;
  enabled?: boolean;
  articleId?: string;
  categoryId?: string;
  priority?: number;
}

export interface UpdateAdPlacementInput {
  name?: string;
  placement?: AdPlacementType;
  provider?: string;
  adUnitId?: string;
  enabled?: boolean;
  articleId?: string;
  categoryId?: string;
  priority?: number;
}

export interface RecordAdEventInput {
  siteId: string;
  placementId: string;
  articleId?: string;
  type: AdEventType;
  metadata?: Record<string, unknown>;
  estimatedRevenue?: number;
}

export interface AdPlacementListFilters {
  placement?: string;
  enabled?: boolean;
  page?: number;
  limit?: number;
}
