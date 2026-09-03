import { db } from '@/lib/db';

export async function logAudit(data: { organizationId?: string; siteId?: string; actorId?: string; actorEmail?: string; action: string; resource: string; resourceId?: string; ipAddress?: string; userAgent?: string; metadata?: Record<string, unknown> }) {
  return db.auditLog.create({ data: { ...data, metadata: data.metadata ? JSON.stringify(data.metadata) : null } });
}
export async function getAuditLogs(filters?: { organizationId?: string; siteId?: string; actorId?: string; action?: string; resource?: string; page?: number; limit?: number }) {
  const where: Record<string, unknown> = {};
  if (filters?.organizationId) where.organizationId = filters.organizationId;
  if (filters?.siteId) where.siteId = filters.siteId;
  if (filters?.actorId) where.actorId = filters.actorId;
  if (filters?.action) where.action = filters.action;
  if (filters?.resource) where.resource = filters.resource;
  const page = filters?.page || 1;
  const limit = filters?.limit || 50;
  return db.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit });
}
