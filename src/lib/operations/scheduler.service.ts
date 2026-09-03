import { db } from '@/lib/db';

export async function createScheduledTask(data: { siteId?: string; name: string; taskType: string; action: Record<string, unknown>; cronExpr?: string; isActive?: boolean }) {
  return db.scheduledTask.create({
    data: { ...data, action: JSON.stringify(data.action), isActive: data.isActive ?? true },
  });
}
export async function listScheduledTasks(siteId?: string) {
  const where: Record<string, unknown> = {};
  if (siteId) where.siteId = siteId;
  return db.scheduledTask.findMany({ where, orderBy: { createdAt: 'desc' } });
}
export async function updateScheduledTask(id: string, data: { isActive?: boolean; action?: Record<string, unknown>; cronExpr?: string }) {
  const update: Record<string, unknown> = {};
  if (data.isActive !== undefined) update.isActive = data.isActive;
  if (data.action) update.action = JSON.stringify(data.action);
  if (data.cronExpr) update.cronExpr = data.cronExpr;
  return db.scheduledTask.update({ where: { id }, data: update });
}
export async function deleteScheduledTask(id: string) {
  return db.scheduledTask.delete({ where: { id } });
}
export async function markTaskRun(id: string, status: 'SUCCESS' | 'FAILED') {
  const now = new Date();
  return db.scheduledTask.update({
    where: { id },
    data: { lastRunAt: now, lastStatus: status, runCount: { increment: 1 }, failCount: status === 'FAILED' ? { increment: 1 } : undefined },
  });
}
