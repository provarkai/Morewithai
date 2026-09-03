import { db } from '@/lib/db';
import { AUTOMATION_TRIGGER, EVENT_TYPE, type AutomationStep } from './types';
import { getEmailProvider } from './provider';
import { trackEvent } from './events.service';

export async function createAutomation(data: {
  siteId: string;
  name: string;
  triggerType: string;
  steps: AutomationStep[];
}) {
  if (!data.name?.trim()) throw new Error('Automation name is required');
  if (!data.steps?.length) throw new Error('At least one step is required');

  const triggerType = data.triggerType && Object.values(AUTOMATION_TRIGGER).includes(data.triggerType as never)
    ? data.triggerType
    : AUTOMATION_TRIGGER.SUBSCRIBED;

  return db.emailAutomation.create({
    data: {
      siteId: data.siteId,
      name: data.name.trim(),
      triggerType,
      steps: JSON.stringify(data.steps),
      status: 'ACTIVE',
    },
  });
}

export async function listAutomations(
  siteId: string,
  filters?: {
    triggerType?: string;
    status?: string;
  },
) {
  const where: Record<string, unknown> = { siteId };

  if (filters?.triggerType) where.triggerType = filters.triggerType;
  if (filters?.status) where.status = filters.status;

  return db.emailAutomation.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
}

export async function getAutomation(id: string, siteId: string) {
  const automation = await db.emailAutomation.findFirst({ where: { id, siteId } });
  if (!automation) throw new Error('Automation not found');
  return automation;
}

export async function updateAutomation(
  id: string,
  siteId: string,
  data: Partial<{
    name: string;
    triggerType: string;
    steps: AutomationStep[];
    status: string;
  }>,
) {
  const existing = await db.emailAutomation.findFirst({ where: { id, siteId } });
  if (!existing) throw new Error('Automation not found');

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.triggerType !== undefined) updateData.triggerType = data.triggerType;
  if (data.steps !== undefined) updateData.steps = JSON.stringify(data.steps);
  if (data.status !== undefined) updateData.status = data.status;

  return db.emailAutomation.update({
    where: { id },
    data: updateData,
  });
}

export async function deleteAutomation(id: string, siteId: string) {
  const existing = await db.emailAutomation.findFirst({ where: { id, siteId } });
  if (!existing) throw new Error('Automation not found');

  return db.emailAutomation.delete({ where: { id } });
}

/**
 * Executes all steps of matching automations for a given trigger.
 * Phase 2: processes steps immediately (no actual delay queue).
 */
export async function triggerAutomation(
  siteId: string,
  triggerType: string,
  subscriberId: string,
  context?: unknown,
) {
  const automations = await db.emailAutomation.findMany({
    where: {
      siteId,
      triggerType,
      status: 'ACTIVE',
    },
  });

  if (automations.length === 0) return { triggered: 0 };

  // Fetch subscriber info for personalization
  const subscriber = await db.subscriber.findUnique({
    where: { id: subscriberId },
    select: { id: true, email: true, firstName: true },
  });

  if (!subscriber) throw new Error('Subscriber not found');

  // Fetch site info
  const site = await db.site.findUnique({
    where: { id: siteId },
    select: { id: true, name: true },
  });

  const provider = await getEmailProvider(siteId);
  let stepsExecuted = 0;

  for (const automation of automations) {
    try {
      const steps: AutomationStep[] = JSON.parse(automation.steps);
      await executeSteps(steps, {
        provider,
        subscriber,
        siteId,
        siteName: site?.name,
        context,
      });
      stepsExecuted += steps.length;
    } catch (err) {
      console.error(`[email] Automation ${automation.id} failed:`, err);
    }
  }

  return { triggered: automations.length, stepsExecuted };
}

interface StepContext {
  provider: Awaited<ReturnType<typeof getEmailProvider>>;
  subscriber: { id: string; email: string; firstName: string | null };
  siteId: string;
  siteName?: string | null;
  context?: unknown;
}

async function executeSteps(steps: AutomationStep[], ctx: StepContext) {
  for (const step of steps) {
    if (step.type === 'WAIT') {
      // Phase 2: no actual delay, just log and continue
      // Phase 2: no actual delay, just continue
      continue;
    }

    if (step.type === 'EMAIL' && step.subject && step.body) {
      const result = await ctx.provider.send(ctx.subscriber.email, step.subject, step.body, {
        previewText: step.previewText,
      });

      if (result.success) {
        await trackEvent({
          siteId: ctx.siteId,
          subscriberId: ctx.subscriber.id,
          type: EVENT_TYPE.SENT,
          metadata: {
            source: 'automation',
            messageId: result.messageId,
            subject: step.subject,
          },
        });
      } else {
        console.error(`[email] Automation email failed: ${result.error}`);
      }
    }

    if (step.type === 'CONDITION') {
      // Phase 2: skip condition evaluation, just process both branches
      if (step.thenSteps?.length) {
        await executeSteps(step.thenSteps, ctx);
      }
      if (step.elseSteps?.length) {
        await executeSteps(step.elseSteps, ctx);
      }
    }
  }
}

export async function getAutomationStats(siteId: string) {
  const [total, byTrigger, byStatus] = await Promise.all([
    db.emailAutomation.count({ where: { siteId } }),

    db.emailAutomation.groupBy({
      by: ['triggerType'],
      where: { siteId },
      _count: { id: true },
    }),

    db.emailAutomation.groupBy({
      by: ['status'],
      where: { siteId },
      _count: { id: true },
    }),
  ]);

  const byTriggerMap: Record<string, number> = {};
  for (const item of byTrigger) {
    byTriggerMap[item.triggerType] = item._count.id;
  }

  const byStatusMap: Record<string, number> = {};
  for (const item of byStatus) {
    byStatusMap[item.status] = item._count.id;
  }

  return { total, byTrigger: byTriggerMap, byStatus: byStatusMap };
}
