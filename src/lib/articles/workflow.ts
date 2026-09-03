import { TERMINAL_STATUSES } from './status';

// Valid state transitions. Key = current status, Value = allowed next statuses.
const TRANSITIONS: Record<string, string[]> = {
  IDEA: ['FETCHED', 'RESEARCHING', 'DRAFT', 'ARCHIVED', 'FAILED'],
  FETCHED: ['RESEARCHING', 'OUTLINE', 'DRAFT', 'ARCHIVED', 'FAILED', 'fetched'],
  RESEARCHING: ['OUTLINE', 'DRAFT', 'FAILED'],
  OUTLINE: ['DRAFT', 'RESEARCHING', 'FAILED'],
  DRAFT: ['AI_REVIEW', 'EDITOR_REVIEW', 'APPROVED', 'ARCHIVED', 'FAILED'],
  AI_REVIEW: ['DRAFT', 'EDITOR_REVIEW', 'APPROVED', 'FAILED'],
  EDITOR_REVIEW: ['DRAFT', 'APPROVED', 'REJECTED', 'FAILED'],
  APPROVED: ['SCHEDULED', 'PUBLISHED', 'DRAFT', 'FAILED'],
  SCHEDULED: ['APPROVED', 'PUBLISHED', 'FAILED'],
  PUBLISHED: ['UPDATING', 'ARCHIVED'],
  UPDATING: ['DRAFT', 'PUBLISHED', 'FAILED'],
  UPDATED: ['UPDATING', 'ARCHIVED'],
  ARCHIVED: ['DRAFT', 'UPDATING'],
  FAILED: ['FETCHED', 'RESEARCHING', 'DRAFT', 'ARCHIVED'],

  // Legacy status transitions (backward compatibility)
  fetched: ['RESEARCHING', 'OUTLINE', 'DRAFT', 'rewriting', 'FAILED'],
  rewriting: ['fetched', 'rewritten', 'FAILED'],
  rewritten: ['APPROVED', 'approved', 'DRAFT', 'EDITOR_REVIEW', 'AI_REVIEW', 'FAILED'],
  approved: ['SCHEDULED', 'scheduled', 'PUBLISHED', 'DRAFT', 'FAILED'],
  rejected: ['DRAFT', 'ARCHIVED', 'FAILED'],
  scheduled: ['APPROVED', 'approved', 'PUBLISHED', 'FAILED'],
  publishing: ['PUBLISHED', 'published', 'rewritten', 'approved', 'FAILED'],
  published: ['UPDATING', 'ARCHIVED'],
};

export function canTransition(fromStatus: string, toStatus: string): { allowed: boolean; reason?: string } {
  // Admin can transition from any non-terminal status
  if (TERMINAL_STATUSES.has(fromStatus)) {
    const allowed = TRANSITIONS[fromStatus]?.includes(toStatus) ?? false;
    return { allowed, reason: allowed ? undefined : `Cannot transition from ${fromStatus} to ${toStatus}` };
  }

  const allowedNext = TRANSITIONS[fromStatus];
  if (!allowedNext) {
    return { allowed: false, reason: `Unknown status: ${fromStatus}` };
  }

  if (!allowedNext.includes(toStatus)) {
    return { allowed: false, reason: `Cannot transition from "${fromStatus}" to "${toStatus}". Allowed: ${allowedNext.join(', ')}` };
  }

  return { allowed: true };
}

export function getStatusGroup(status: string): 'draft' | 'in-review' | 'approved' | 'published' | 'archived' | 'failed' {
  if (['IDEA', 'FETCHED', 'RESEARCHING', 'OUTLINE', 'DRAFT', 'fetched', 'rewriting', 'rewritten'].includes(status)) return 'draft';
  if (['AI_REVIEW', 'EDITOR_REVIEW'].includes(status)) return 'in-review';
  if (['APPROVED', 'SCHEDULED', 'approved', 'scheduled'].includes(status)) return 'approved';
  if (['PUBLISHED', 'PUBLISHED_LEGACY', 'published', 'UPDATING', 'UPDATED'].includes(status)) return 'published';
  if (status === 'ARCHIVED') return 'archived';
  return 'failed';
}
