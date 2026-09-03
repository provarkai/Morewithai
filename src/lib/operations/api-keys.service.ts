import { db } from '@/lib/db';
import crypto from 'crypto';

export async function createApiKey(data: { organizationId?: string; siteId?: string; name: string; scopes: string[]; expiresAt?: Date }) {
  const rawKey = `mwa_${crypto.randomBytes(24).toString('hex')}`;
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const keyPrefix = rawKey.substring(0, 12);
  const record = await db.apiKey.create({ data: { ...data, keyHash, keyPrefix, scopes: JSON.stringify(data.scopes), expiresAt: data.expiresAt } });
  return { id: record.id, key: rawKey, prefix: keyPrefix, name: data.name }; // Only return raw key once
}
export async function listApiKeys(organizationId?: string, siteId?: string) {
  const where: Record<string, unknown> = { isActive: true };
  if (organizationId) where.organizationId = organizationId;
  if (siteId) where.siteId = siteId;
  return db.apiKey.findMany({ where, select: { id: true, name: true, keyPrefix: true, scopes: true, expiresAt: true, lastUsedAt: true, createdAt: true } });
}
export async function revokeApiKey(id: string) {
  return db.apiKey.update({ where: { id }, data: { isActive: false } });
}
export async function validateApiKey(rawKey: string) {
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const key = await db.apiKey.findFirst({ where: { keyHash, isActive: true } });
  if (!key) return null;
  if (key.expiresAt && key.expiresAt < new Date()) return null;
  await db.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });
  return { id: key.id, organizationId: key.organizationId, siteId: key.siteId, scopes: JSON.parse(key.scopes || '[]') };
}
