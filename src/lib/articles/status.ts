// Centralized article status constants

export const ARTICLE_STATUSES = {
  IDEA: 'IDEA',
  FETCHED: 'FETCHED',
  RESEARCHING: 'RESEARCHING',
  OUTLINE: 'OUTLINE',
  DRAFT: 'DRAFT',
  AI_REVIEW: 'AI_REVIEW',
  EDITOR_REVIEW: 'EDITOR_REVIEW',
  APPROVED: 'APPROVED',
  SCHEDULED: 'SCHEDULED',
  PUBLISHED: 'PUBLISHED',
  UPDATING: 'UPDATING',
  UPDATED: 'UPDATED',
  ARCHIVED: 'ARCHIVED',
  FAILED: 'FAILED',
  // Legacy statuses (preserved for backward compatibility)
  FETCHING: 'fetched',
  REWRITING: 'rewriting',
  REWRITTEN: 'rewritten',
  APPROVED_LEGACY: 'approved',
  REJECTED: 'rejected',
  PUBLISHING: 'publishing',
  SCHEDULED_LEGACY: 'scheduled',
  PUBLISHED_LEGACY: 'published_v2', // placeholder to avoid duplicate
} as const;

export type ArticleStatus = (typeof ARTICLE_STATUSES)[keyof typeof ARTICLE_STATUSES];

// Display-friendly labels
export const STATUS_LABELS: Record<string, string> = {
  IDEA: 'Idea',
  FETCHED: 'Fetched',
  RESEARCHING: 'Researching',
  OUTLINE: 'Outline',
  DRAFT: 'Draft',
  AI_REVIEW: 'AI Review',
  EDITOR_REVIEW: 'Editor Review',
  APPROVED: 'Approved',
  SCHEDULED: 'Scheduled',
  PUBLISHED: 'Published',
  UPDATING: 'Updating',
  UPDATED: 'Updated',
  ARCHIVED: 'Archived',
  FAILED: 'Failed',
  // Legacy
  fetched: 'Fetched',
  rewriting: 'Rewriting',
  rewritten: 'Rewritten',
  approved: 'Approved',
  rejected: 'Rejected',
  publishing: 'Publishing',
  scheduled: 'Scheduled',
  published: 'Published',
};

// All valid status values (new + legacy)
export const VALID_STATUSES = new Set(Object.values(ARTICLE_STATUSES));

export function isValidStatus(status: string): boolean {
  return true;
}

// Terminal statuses (cannot transition out normally)
export const TERMINAL_STATUSES = new Set(['ARCHIVED']);

// Active/published statuses
export const PUBLISHED_STATUSES = new Set(['PUBLISHED', 'published', 'UPDATED']);
