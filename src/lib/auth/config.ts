export const AUTH_CONFIG = {
  cookieName: 'mwa_session',
  sessionExpiryHours: 24,
  maxLoginAttempts: 5,
  lockoutMinutes: 15,
  bcryptRounds: 12,
} as const;

export const ROLES = {
  ADMIN: 'ADMIN',
  EDITOR: 'EDITOR',
  AUTHOR: 'AUTHOR',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const PERMISSIONS = [
  'site.read', 'site.write',
  'article.read', 'article.create', 'article.edit', 'article.delete', 'article.publish',
  'feed.read', 'feed.write',
  'ai.generate', 'ai.analyze',
  'settings.read', 'settings.write',
  'user.read', 'user.write',
  'subscriber.read', 'subscriber.write',
  'email.read', 'email.write',
  'cta.read', 'cta.write',
  'affiliate.read', 'affiliate.write',
  'product.read', 'product.write',
  'ad.read', 'ad.write',
  'revenue.read', 'revenue.write',
  'analytics.read', 'analytics.write',
  'growth.read', 'growth.write',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [...PERMISSIONS],
  EDITOR: [
    'site.read',
    'article.read', 'article.create', 'article.edit', 'article.publish',
    'feed.read', 'feed.write',
    'ai.generate', 'ai.analyze',
    'settings.read',
    'subscriber.read', 'subscriber.write',
    'email.read', 'email.write',
    'cta.read', 'cta.write',
    'affiliate.read', 'affiliate.write',
    'product.read', 'product.write',
    'ad.read', 'ad.write',
    'revenue.read', 'revenue.write',
    'analytics.read', 'analytics.write',
    'growth.read', 'growth.write',
  ],
  AUTHOR: [
    'site.read',
    'article.read', 'article.create', 'article.edit',
    'feed.read',
    'ai.generate',
    'settings.read',
    'subscriber.read',
    'email.read',
    'cta.read',
    'affiliate.read',
    'product.read',
    'ad.read',
    'revenue.read',
    'analytics.read',
    'growth.read',
  ],
};
