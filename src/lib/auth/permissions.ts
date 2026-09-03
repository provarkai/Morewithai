import { ROLE_PERMISSIONS, PERMISSIONS, type Role, type Permission } from './config';

export function hasPermission(role: string, permission: string): boolean {
  const rolePerms: Record<string, string[]> = {
    ADMIN: [...PERMISSIONS],
    EDITOR: ['site.read', 'article.read', 'article.create', 'article.edit', 'article.publish', 'feed.read', 'feed.write', 'ai.generate', 'ai.analyze', 'settings.read', 'subscriber.read', 'subscriber.write', 'email.read', 'email.write', 'cta.read', 'cta.write', 'affiliate.read', 'affiliate.write', 'product.read', 'product.write', 'ad.read', 'ad.write', 'revenue.read', 'revenue.write', 'analytics.read', 'analytics.write', 'growth.read', 'growth.write'],
    AUTHOR: ['site.read', 'article.read', 'article.create', 'article.edit', 'feed.read', 'ai.generate', 'settings.read', 'subscriber.read', 'email.read', 'cta.read', 'affiliate.read', 'product.read', 'ad.read', 'revenue.read', 'analytics.read', 'growth.read'],
  };
  return rolePerms[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}
