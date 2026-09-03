export const CAMPAIGN_TYPE = {
  WELCOME: 'WELCOME',
  NEWSLETTER: 'NEWSLETTER',
  LEAD_MAGNET: 'LEAD_MAGNET',
  PRODUCT: 'PRODUCT',
  RE_ENGAGEMENT: 'RE_ENGAGEMENT',
  ARTICLE_DIGEST: 'ARTICLE_DIGEST',
} as const;

export type CampaignType = (typeof CAMPAIGN_TYPE)[keyof typeof CAMPAIGN_TYPE];

export const CAMPAIGN_STATUS = {
  DRAFT: 'DRAFT',
  SCHEDULED: 'SCHEDULED',
  SENDING: 'SENDING',
  SENT: 'SENT',
  FAILED: 'FAILED',
} as const;

export type CampaignStatus = (typeof CAMPAIGN_STATUS)[keyof typeof CAMPAIGN_STATUS];

export const EVENT_TYPE = {
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  OPENED: 'OPENED',
  CLICKED: 'CLICKED',
  BOUNCED: 'BOUNCED',
  UNSUBSCRIBED: 'UNSUBSCRIBED',
  COMPLAINED: 'COMPLAINED',
} as const;

export type EventType = (typeof EVENT_TYPE)[keyof typeof EVENT_TYPE];

export const AUTOMATION_TRIGGER = {
  SUBSCRIBED: 'SUBSCRIBED',
  LEAD_CAPTURED: 'LEAD_CAPTURED',
  PURCHASE: 'PURCHASE',
  MANUAL: 'MANUAL',
} as const;

export type AutomationTrigger = (typeof AUTOMATION_TRIGGER)[keyof typeof AUTOMATION_TRIGGER];

export interface CreateCampaignInput {
  siteId: string;
  name: string;
  type?: CampaignType;
  subject: string;
  previewText?: string;
  content: string;
}

export interface AutomationStep {
  id: string;
  type: 'EMAIL' | 'WAIT' | 'CONDITION';
  delayMinutes?: number;
  subject?: string;
  body?: string;
  previewText?: string;
  condition?: string;
  thenSteps?: AutomationStep[];
  elseSteps?: AutomationStep[];
}

export interface SendEmailOptions {
  from?: string;
  replyTo?: string;
  previewText?: string;
  campaignId?: string;
  subscriberId?: string;
  siteId?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}
