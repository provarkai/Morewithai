import { db } from '@/lib/db';

export async function createOrganization(data: { name: string; ownerId: string }) {
  const org = await db.organization.create({
    data: { name: data.name, ownerId: data.ownerId },
  });
  // Add owner as member
  await db.organizationMember.create({
    data: { organizationId: org.id, userId: data.ownerId, role: 'OWNER' },
  });
  return org;
}

export async function getOrganization(id: string) {
  return db.organization.findFirst({
    where: { id },
    include: { members: { include: { user: { select: { id: true, email: true, name: true } } } }, _count: { select: { sites: true, members: true } } },
  });
}

export async function updateOrganization(id: string, data: { name?: string; planId?: string; status?: string }) {
  return db.organization.update({ where: { id }, data });
}

export async function addMember(organizationId: string, userId: string, role: string) {
  return db.organizationMember.create({ data: { organizationId, userId, role } });
}

export async function removeMember(organizationId: string, userId: string) {
  return db.organizationMember.delete({ where: { organizationId_userId: { organizationId, userId } } });
}

export async function updateMemberRole(organizationId: string, userId: string, role: string) {
  return db.organizationMember.update({
    where: { organizationId_userId: { organizationId, userId } },
    data: { role },
  });
}

export async function getUsageRecords(organizationId: string, periodStart?: Date, periodEnd?: Date) {
  const where: Record<string, unknown> = { organizationId };
  if (periodStart) where.periodStart = { gte: periodStart };
  if (periodEnd) where.periodEnd = { lte: periodEnd };
  return db.usageRecord.findMany({ where, orderBy: { createdAt: 'desc' } });
}

export async function recordUsage(organizationId: string, siteId: string, metric: string, value: number = 1) {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return db.usageRecord.create({
    data: { organizationId, siteId, metric, value, periodStart, periodEnd },
  });
}
