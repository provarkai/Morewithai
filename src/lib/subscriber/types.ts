export const SUBSCRIBER_STATUS = {
  SUBSCRIBED: 'SUBSCRIBED',
  UNSUBSCRIBED: 'UNSUBSCRIBED',
  BOUNCED: 'BOUNCED',
  SUPPRESSED: 'SUPPRESSED',
} as const;

export type SubscriberStatus = (typeof SUBSCRIBER_STATUS)[keyof typeof SUBSCRIBER_STATUS];

export const SUBSCRIBER_SOURCE = {
  ARTICLE: 'ARTICLE',
  POPUP: 'POPUP',
  LEAD_MAGNET: 'LEAD_MAGNET',
  LANDING_PAGE: 'LANDING_PAGE',
  CHECKOUT: 'CHECKOUT',
  MANUAL: 'MANUAL',
  OTHER: 'OTHER',
} as const;

export type SubscriberSource = (typeof SUBSCRIBER_SOURCE)[keyof typeof SUBSCRIBER_SOURCE];

export interface CreateSubscriberInput {
  siteId: string;
  email: string;
  firstName?: string;
  source?: SubscriberSource;
}

export interface SubscriberWithStats {
  id: string;
  siteId: string;
  email: string;
  firstName: string | null;
  status: string;
  source: string;
  consentAt: Date;
  unsubscribedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    leads: number;
    emailEvents: number;
    productPurchases: number;
    affiliateClicks: number;
    conversionEvents: number;
  };
}
