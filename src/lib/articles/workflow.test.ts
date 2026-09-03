import { describe, it, expect } from 'vitest';
import { canTransition, getStatusGroup } from './workflow';

describe('canTransition', () => {
  describe('happy-path transitions', () => {
    it('allows IDEA → FETCHED', () => {
      expect(canTransition('IDEA', 'FETCHED').allowed).toBe(true);
    });

    it('allows FETCHED → RESEARCHING', () => {
      expect(canTransition('FETCHED', 'RESEARCHING').allowed).toBe(true);
    });

    it('allows FETCHED → OUTLINE', () => {
      expect(canTransition('FETCHED', 'OUTLINE').allowed).toBe(true);
    });

    it('allows FETCHED → DRAFT', () => {
      expect(canTransition('FETCHED', 'DRAFT').allowed).toBe(true);
    });

    it('allows RESEARCHING → OUTLINE', () => {
      expect(canTransition('RESEARCHING', 'OUTLINE').allowed).toBe(true);
    });

    it('allows OUTLINE → DRAFT', () => {
      expect(canTransition('OUTLINE', 'DRAFT').allowed).toBe(true);
    });

    it('allows DRAFT → AI_REVIEW', () => {
      expect(canTransition('DRAFT', 'AI_REVIEW').allowed).toBe(true);
    });

    it('allows DRAFT → EDITOR_REVIEW', () => {
      expect(canTransition('DRAFT', 'EDITOR_REVIEW').allowed).toBe(true);
    });

    it('allows DRAFT → APPROVED', () => {
      expect(canTransition('DRAFT', 'APPROVED').allowed).toBe(true);
    });

    it('allows AI_REVIEW → EDITOR_REVIEW', () => {
      expect(canTransition('AI_REVIEW', 'EDITOR_REVIEW').allowed).toBe(true);
    });

    it('allows AI_REVIEW → APPROVED', () => {
      expect(canTransition('AI_REVIEW', 'APPROVED').allowed).toBe(true);
    });

    it('allows EDITOR_REVIEW → APPROVED', () => {
      expect(canTransition('EDITOR_REVIEW', 'APPROVED').allowed).toBe(true);
    });

    it('allows EDITOR_REVIEW → REJECTED', () => {
      expect(canTransition('EDITOR_REVIEW', 'REJECTED').allowed).toBe(true);
    });

    it('allows APPROVED → SCHEDULED', () => {
      expect(canTransition('APPROVED', 'SCHEDULED').allowed).toBe(true);
    });

    it('allows APPROVED → PUBLISHED', () => {
      expect(canTransition('APPROVED', 'PUBLISHED').allowed).toBe(true);
    });

    it('allows SCHEDULED → PUBLISHED', () => {
      expect(canTransition('SCHEDULED', 'PUBLISHED').allowed).toBe(true);
    });

    it('allows PUBLISHED → UPDATING', () => {
      expect(canTransition('PUBLISHED', 'UPDATING').allowed).toBe(true);
    });

    it('allows UPDATING → DRAFT', () => {
      expect(canTransition('UPDATING', 'DRAFT').allowed).toBe(true);
    });

    it('allows UPDATING → PUBLISHED', () => {
      expect(canTransition('UPDATING', 'PUBLISHED').allowed).toBe(true);
    });
  });

  describe('terminal status (ARCHIVED)', () => {
    it('allows ARCHIVED → DRAFT', () => {
      expect(canTransition('ARCHIVED', 'DRAFT').allowed).toBe(true);
    });

    it('allows ARCHIVED → UPDATING', () => {
      expect(canTransition('ARCHIVED', 'UPDATING').allowed).toBe(true);
    });
  });

  describe('FAILED status', () => {
    it('allows FAILED → DRAFT', () => {
      expect(canTransition('FAILED', 'DRAFT').allowed).toBe(true);
    });

    it('allows FAILED → FETCHED', () => {
      expect(canTransition('FAILED', 'FETCHED').allowed).toBe(true);
    });

    it('allows FAILED → RESEARCHING', () => {
      expect(canTransition('FAILED', 'RESEARCHING').allowed).toBe(true);
    });
  });

  describe('reject transitions', () => {
    it('rejects DRAFT → PUBLISHED (skip workflow)', () => {
      const result = canTransition('DRAFT', 'PUBLISHED');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('rejects RESEARCHING → PUBLISHED', () => {
      const result = canTransition('RESEARCHING', 'PUBLISHED');
      expect(result.allowed).toBe(false);
    });

    it('rejects PUBLISHED → DRAFT', () => {
      expect(canTransition('PUBLISHED', 'DRAFT').allowed).toBe(false);
    });

    it('rejects SCHEDULED → DRAFT', () => {
      expect(canTransition('SCHEDULED', 'DRAFT').allowed).toBe(false);
    });

    it('rejects EDITOR_REVIEW → PUBLISHED (skip approval)', () => {
      expect(canTransition('EDITOR_REVIEW', 'PUBLISHED').allowed).toBe(false);
    });

    it('rejects invalid status', () => {
      const result = canTransition('NONEXISTENT', 'DRAFT');
      expect(result.allowed).toBe(false);
    });
  });

  describe('legacy status transitions', () => {
    it('allows fetched → rewriting (legacy)', () => {
      expect(canTransition('fetched', 'rewriting').allowed).toBe(true);
    });

    it('allows rewriting → rewritten (legacy)', () => {
      expect(canTransition('rewriting', 'rewritten').allowed).toBe(true);
    });

    it('allows rewritten → approved (legacy)', () => {
      expect(canTransition('rewritten', 'approved').allowed).toBe(true);
    });

    it('allows approved → scheduled (legacy)', () => {
      expect(canTransition('approved', 'scheduled').allowed).toBe(true);
    });

    it('allows scheduled → published (via APPROVED or approved)', () => {
      expect(canTransition('scheduled', 'PUBLISHED').allowed).toBe(true);
    });

    it('allows rewritten → EDITOR_REVIEW', () => {
      expect(canTransition('rewritten', 'EDITOR_REVIEW').allowed).toBe(true);
    });
  });

  describe('bidirectional transitions', () => {
    it('allows DRAFT ↔ AI_REVIEW', () => {
      expect(canTransition('DRAFT', 'AI_REVIEW').allowed).toBe(true);
      expect(canTransition('AI_REVIEW', 'DRAFT').allowed).toBe(true);
    });

    it('allows DRAFT ↔ EDITOR_REVIEW', () => {
      expect(canTransition('DRAFT', 'EDITOR_REVIEW').allowed).toBe(true);
      expect(canTransition('EDITOR_REVIEW', 'DRAFT').allowed).toBe(true);
    });

    it('allows APPROVED → DRAFT (send back for edits)', () => {
      expect(canTransition('APPROVED', 'DRAFT').allowed).toBe(true);
    });
  });
});

describe('getStatusGroup', () => {
  it('maps IDEA to draft', () => {
    expect(getStatusGroup('IDEA')).toBe('draft');
  });

  it('maps FETCHED to draft', () => {
    expect(getStatusGroup('FETCHED')).toBe('draft');
  });

  it('maps RESEARCHING to draft', () => {
    expect(getStatusGroup('RESEARCHING')).toBe('draft');
  });

  it('maps OUTLINE to draft', () => {
    expect(getStatusGroup('OUTLINE')).toBe('draft');
  });

  it('maps DRAFT to draft', () => {
    expect(getStatusGroup('DRAFT')).toBe('draft');
  });

  it('maps legacy fetched/rewriting/rewritten to draft', () => {
    expect(getStatusGroup('fetched')).toBe('draft');
    expect(getStatusGroup('rewriting')).toBe('draft');
    expect(getStatusGroup('rewritten')).toBe('draft');
  });

  it('maps AI_REVIEW to in-review', () => {
    expect(getStatusGroup('AI_REVIEW')).toBe('in-review');
  });

  it('maps EDITOR_REVIEW to in-review', () => {
    expect(getStatusGroup('EDITOR_REVIEW')).toBe('in-review');
  });

  it('maps APPROVED to approved', () => {
    expect(getStatusGroup('APPROVED')).toBe('approved');
  });

  it('maps SCHEDULED to approved', () => {
    expect(getStatusGroup('SCHEDULED')).toBe('approved');
  });

  it('maps legacy approved/scheduled to approved', () => {
    expect(getStatusGroup('approved')).toBe('approved');
    expect(getStatusGroup('scheduled')).toBe('approved');
  });

  it('maps PUBLISHED to published', () => {
    expect(getStatusGroup('PUBLISHED')).toBe('published');
  });

  it('maps UPDATING to published', () => {
    expect(getStatusGroup('UPDATING')).toBe('published');
  });

  it('maps UPDATED to published', () => {
    expect(getStatusGroup('UPDATED')).toBe('published');
  });

  it('maps ARCHIVED to archived', () => {
    expect(getStatusGroup('ARCHIVED')).toBe('archived');
  });

  it('maps FAILED to failed', () => {
    expect(getStatusGroup('FAILED')).toBe('failed');
  });

  it('maps unknown status to failed (fallback)', () => {
    expect(getStatusGroup('UNKNOWN_STATUS')).toBe('failed');
  });
});
