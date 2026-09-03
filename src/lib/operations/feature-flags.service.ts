import { db } from '@/lib/db';

export async function isFeatureEnabled(featureKey: string, siteId?: string): Promise<boolean> {
  const flag = await db.featureFlag.findUnique({ where: { key: featureKey } });
  if (!flag) return false;
  if (flag.isGlobal) return flag.enabled;
  if (!siteId) return flag.enabled;
  const siteFlag = await db.siteFeatureFlag.findUnique({ where: { siteId_featureFlagId: { siteId, featureFlagId: flag.id } } });
  return siteFlag ? siteFlag.enabled : flag.enabled;
}
export async function listFeatureFlags() {
  return db.featureFlag.findMany({ orderBy: { key: 'asc' } });
}
export async function createFeatureFlag(data: { key: string; name: string; description?: string; isGlobal?: boolean; enabled?: boolean }) {
  return db.featureFlag.create({ data: { ...data, enabled: data.enabled ?? false, isGlobal: data.isGlobal ?? false } });
}
export async function toggleFeatureFlag(id: string, enabled: boolean) {
  return db.featureFlag.update({ where: { id }, data: { enabled } });
}
export async function setSiteFeatureFlag(siteId: string, featureFlagId: string, enabled: boolean) {
  return db.siteFeatureFlag.upsert({
    where: { siteId_featureFlagId: { siteId, featureFlagId } },
    create: { siteId, featureFlagId, enabled },
    update: { enabled },
  });
}
