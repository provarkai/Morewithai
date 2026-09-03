import { describe, it, expect } from 'vitest';
import { hasPermission, hasAnyPermission, hasAllPermissions } from './permissions';

describe('hasPermission', () => {
  describe('ADMIN role', () => {
    it('has all permissions', () => {
      expect(hasPermission('ADMIN', 'site.read')).toBe(true);
      expect(hasPermission('ADMIN', 'site.write')).toBe(true);
      expect(hasPermission('ADMIN', 'article.read')).toBe(true);
      expect(hasPermission('ADMIN', 'article.create')).toBe(true);
      expect(hasPermission('ADMIN', 'article.edit')).toBe(true);
      expect(hasPermission('ADMIN', 'article.delete')).toBe(true);
      expect(hasPermission('ADMIN', 'article.publish')).toBe(true);
      expect(hasPermission('ADMIN', 'feed.read')).toBe(true);
      expect(hasPermission('ADMIN', 'feed.write')).toBe(true);
      expect(hasPermission('ADMIN', 'ai.generate')).toBe(true);
      expect(hasPermission('ADMIN', 'ai.analyze')).toBe(true);
      expect(hasPermission('ADMIN', 'settings.read')).toBe(true);
      expect(hasPermission('ADMIN', 'settings.write')).toBe(true);
      expect(hasPermission('ADMIN', 'user.read')).toBe(true);
      expect(hasPermission('ADMIN', 'user.write')).toBe(true);
      expect(hasPermission('ADMIN', 'subscriber.read')).toBe(true);
      expect(hasPermission('ADMIN', 'subscriber.write')).toBe(true);
      expect(hasPermission('ADMIN', 'email.read')).toBe(true);
      expect(hasPermission('ADMIN', 'email.write')).toBe(true);
      expect(hasPermission('ADMIN', 'revenue.read')).toBe(true);
      expect(hasPermission('ADMIN', 'revenue.write')).toBe(true);
      expect(hasPermission('ADMIN', 'analytics.read')).toBe(true);
      expect(hasPermission('ADMIN', 'analytics.write')).toBe(true);
      expect(hasPermission('ADMIN', 'growth.read')).toBe(true);
      expect(hasPermission('ADMIN', 'growth.write')).toBe(true);
    });
  });

  describe('EDITOR role', () => {
    it('has article management permissions', () => {
      expect(hasPermission('EDITOR', 'article.read')).toBe(true);
      expect(hasPermission('EDITOR', 'article.create')).toBe(true);
      expect(hasPermission('EDITOR', 'article.edit')).toBe(true);
      expect(hasPermission('EDITOR', 'article.publish')).toBe(true);
    });

    it('has feed permissions', () => {
      expect(hasPermission('EDITOR', 'feed.read')).toBe(true);
      expect(hasPermission('EDITOR', 'feed.write')).toBe(true);
    });

    it('has AI permissions', () => {
      expect(hasPermission('EDITOR', 'ai.generate')).toBe(true);
      expect(hasPermission('EDITOR', 'ai.analyze')).toBe(true);
    });

    it('has monetization permissions', () => {
      expect(hasPermission('EDITOR', 'subscriber.write')).toBe(true);
      expect(hasPermission('EDITOR', 'email.write')).toBe(true);
      expect(hasPermission('EDITOR', 'cta.write')).toBe(true);
      expect(hasPermission('EDITOR', 'affiliate.write')).toBe(true);
      expect(hasPermission('EDITOR', 'product.write')).toBe(true);
      expect(hasPermission('EDITOR', 'ad.write')).toBe(true);
      expect(hasPermission('EDITOR', 'revenue.write')).toBe(true);
      expect(hasPermission('EDITOR', 'analytics.write')).toBe(true);
      expect(hasPermission('EDITOR', 'growth.write')).toBe(true);
    });

    it('cannot delete articles', () => {
      expect(hasPermission('EDITOR', 'article.delete')).toBe(false);
    });

    it('cannot manage users', () => {
      expect(hasPermission('EDITOR', 'user.read')).toBe(false);
      expect(hasPermission('EDITOR', 'user.write')).toBe(false);
    });

    it('cannot write settings', () => {
      expect(hasPermission('EDITOR', 'settings.write')).toBe(false);
    });
  });

  describe('AUTHOR role', () => {
    it('has read permissions', () => {
      expect(hasPermission('AUTHOR', 'site.read')).toBe(true);
      expect(hasPermission('AUTHOR', 'article.read')).toBe(true);
      expect(hasPermission('AUTHOR', 'feed.read')).toBe(true);
      expect(hasPermission('AUTHOR', 'settings.read')).toBe(true);
    });

    it('has limited write permissions', () => {
      expect(hasPermission('AUTHOR', 'article.create')).toBe(true);
      expect(hasPermission('AUTHOR', 'article.edit')).toBe(true);
      expect(hasPermission('AUTHOR', 'ai.generate')).toBe(true);
    });

    it('cannot publish articles', () => {
      expect(hasPermission('AUTHOR', 'article.publish')).toBe(false);
    });

    it('cannot delete articles', () => {
      expect(hasPermission('AUTHOR', 'article.delete')).toBe(false);
    });

    it('cannot write feeds', () => {
      expect(hasPermission('AUTHOR', 'feed.write')).toBe(false);
    });

    it('cannot manage monetization', () => {
      expect(hasPermission('AUTHOR', 'subscriber.write')).toBe(false);
      expect(hasPermission('AUTHOR', 'email.write')).toBe(false);
      expect(hasPermission('AUTHOR', 'revenue.write')).toBe(false);
    });

    it('cannot manage users', () => {
      expect(hasPermission('AUTHOR', 'user.read')).toBe(false);
      expect(hasPermission('AUTHOR', 'user.write')).toBe(false);
    });
  });

  describe('unknown role', () => {
    it('returns false for unknown role', () => {
      expect(hasPermission('GUEST', 'article.read')).toBe(false);
      expect(hasPermission('SUPER_ADMIN', 'article.read')).toBe(false);
    });
  });

  describe('unknown permission', () => {
    it('returns false for unknown permission', () => {
      expect(hasPermission('ADMIN', 'fake.permission')).toBe(false);
    });
  });
});

describe('hasAnyPermission', () => {
  it('returns true when user has at least one permission', () => {
    expect(hasAnyPermission('AUTHOR', ['article.publish', 'article.create'])).toBe(true);
  });

  it('returns false when user has none of the permissions', () => {
    expect(hasAnyPermission('AUTHOR', ['article.publish', 'article.delete'])).toBe(false);
  });

  it('returns true when all permissions match', () => {
    expect(hasAnyPermission('ADMIN', ['article.read', 'article.edit'])).toBe(true);
  });

  it('returns false for empty permissions array', () => {
    expect(hasAnyPermission('ADMIN', [])).toBe(false);
  });
});

describe('hasAllPermissions', () => {
  it('returns true when user has all permissions', () => {
    expect(hasAllPermissions('ADMIN', ['article.read', 'article.create', 'article.edit'])).toBe(true);
  });

  it('returns false when user is missing one permission', () => {
    expect(hasAllPermissions('AUTHOR', ['article.read', 'article.publish'])).toBe(false);
  });

  it('returns true for empty permissions array', () => {
    expect(hasAllPermissions('AUTHOR', [])).toBe(true);
  });

  it('EDITOR has all article permissions except delete', () => {
    expect(
      hasAllPermissions('EDITOR', ['article.read', 'article.create', 'article.edit', 'article.publish'])
    ).toBe(true);
    expect(hasAllPermissions('EDITOR', ['article.read', 'article.delete'])).toBe(false);
  });
});
