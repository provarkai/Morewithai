import { db } from '@/lib/db';

// ─── Types ──────────────────────────────────────────────────

export interface AuditEntry {
  id: string;
  siteId: string | null;
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  changes?: FieldChange[];
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface FieldChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface AuditTrail {
  resourceId: string;
  resourceType: string;
  entries: AuditEntry[];
  totalChanges: number;
  firstChange: string;
  lastChange: string;
  uniqueActors: string[];
}

// ─── Core Functions ─────────────────────────────────────────

/**
 * Records an audit log entry.
 */
export async function recordAudit(params: {
  siteId: string;
  actorId?: string;
  actorEmail?: string;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: FieldChange[];
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  await db.auditLog.create({
    data: {
      siteId: params.siteId,
      actorId: params.actorId || null,
      actorEmail: params.actorEmail || null,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId || null,
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null,
      metadata: params.changes ? JSON.stringify({ changes: params.changes }) : null,
    },
  });
}

/**
 * Records an article update with field-level diff.
 */
export async function recordArticleAudit(
  articleId: string,
  siteId: string,
  actorId: string,
  actorEmail: string,
  previousData: Record<string, unknown>,
  newData: Record<string, unknown>,
): Promise<void> {
  const changes: FieldChange[] = [];

  for (const [key, newValue] of Object.entries(newData)) {
    const oldValue = previousData[key];
    if (oldValue !== newValue && JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({ field: key, oldValue, newValue });
    }
  }

  if (changes.length === 0) return;

  await recordAudit({
    siteId,
    actorId,
    actorEmail,
    action: 'UPDATE',
    resource: 'Article',
    resourceId: articleId,
    changes,
  });
}

/**
 * Gets the full audit trail for a specific resource.
 */
export async function getAuditTrail(
  siteId: string,
  resource: string,
  resourceId: string,
  limit: number = 50,
): Promise<AuditTrail> {
  const entries = await db.auditLog.findMany({
    where: { siteId, resource, resourceId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  const parsed: AuditEntry[] = entries.map((e) => {
    let changes: FieldChange[] | undefined;
    try {
      const meta = JSON.parse(e.metadata || '{}');
      changes = meta.changes;
    } catch { /* ignore */ }

    return {
      id: e.id,
      siteId: e.siteId,
      actorId: e.actorId,
      actorEmail: e.actorEmail,
      action: e.action,
      resource: e.resource,
      resourceId: e.resourceId,
      changes,
      ipAddress: e.ipAddress,
      userAgent: e.userAgent,
      createdAt: e.createdAt.toISOString(),
    };
  });

  const uniqueActors = [...new Set(parsed.map((e) => e.actorEmail || e.actorId || 'Unknown').filter(Boolean))];

  return {
    resourceId,
    resourceType: resource,
    entries: parsed,
    totalChanges: parsed.length,
    firstChange: parsed.length > 0 ? parsed[parsed.length - 1].createdAt : '',
    lastChange: parsed.length > 0 ? parsed[0].createdAt : '',
    uniqueActors,
  };
}

/**
 * Gets recent audit activity for a site (all resources).
 */
export async function getRecentActivity(
  siteId: string,
  limit: number = 30,
): Promise<AuditEntry[]> {
  const entries = await db.auditLog.findMany({
    where: { siteId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return entries.map((e) => ({
    id: e.id,
    siteId: e.siteId,
    actorId: e.actorId,
    actorEmail: e.actorEmail,
    action: e.action,
    resource: e.resource,
    resourceId: e.resourceId,
    ipAddress: e.ipAddress,
    userAgent: e.userAgent,
    createdAt: e.createdAt.toISOString(),
  }));
}

/**
 * Compares two snapshots of an article and returns the diff.
 */
export function computeDiff(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): FieldChange[] {
  const changes: FieldChange[] = [];
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    const oldVal = before[key];
    const newVal = after[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({ field: key, oldValue: oldVal ?? null, newValue: newVal ?? null });
    }
  }

  return changes;
}

/**
 * Gets audit statistics for a site.
 */
export async function getAuditStats(siteId: string, days: number = 30): Promise<{
  totalActions: number;
  actionsByType: Record<string, number>;
  activeUsers: { email: string; count: number }[];
  recentChanges: number;
}> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const entries = await db.auditLog.findMany({
    where: { siteId, createdAt: { gte: since } },
    select: { action: true, actorEmail: true, createdAt: true },
  });

  const actionsByType: Record<string, number> = {};
  const actorCounts: Record<string, number> = {};

  for (const e of entries) {
    actionsByType[e.action] = (actionsByType[e.action] || 0) + 1;
    if (e.actorEmail) {
      actorCounts[e.actorEmail] = (actorCounts[e.actorEmail] || 0) + 1;
    }
  }

  const activeUsers = Object.entries(actorCounts)
    .map(([email, count]) => ({ email, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalActions: entries.length,
    actionsByType,
    activeUsers,
    recentChanges: entries.length,
  };
}
