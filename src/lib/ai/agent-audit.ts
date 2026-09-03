import { db } from '@/lib/db';

export interface AgentActionLog {
  agent: string;
  task: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  articleId?: string;
  siteId: string;
  model?: string;
  cost?: number;
  result: 'SUCCESS' | 'FAILURE';
  durationMs?: number;
  error?: string;
}

function mapResultToStatus(result: 'SUCCESS' | 'FAILURE'): string {
  return result === 'SUCCESS' ? 'COMPLETED' : 'FAILED';
}

export async function logAgentAction(data: AgentActionLog) {
  return db.automationLog.create({
    data: {
      siteId: data.siteId,
      action: `AGENT:${data.agent}:${data.task}`,
      status: mapResultToStatus(data.result),
      message: `${data.agent} ${data.task} ${data.result}`,
      details: JSON.stringify({
        agent: data.agent,
        task: data.task,
        articleId: data.articleId,
        model: data.model,
        cost: data.cost,
        result: data.result,
        durationMs: data.durationMs,
        error: data.error,
        inputKeys: Object.keys(data.input || {}),
      }),
    },
  });
}

export async function getAgentLogs(
  siteId: string,
  filters?: { agent?: string; result?: string; limit?: number }
) {
  const where: Record<string, unknown> = {
    siteId,
    action: { startsWith: 'AGENT:' },
  };
  if (filters?.agent) {
    where.action = { startsWith: 'AGENT:', contains: filters.agent };
  }
  if (filters?.result) {
    where.status = mapResultToStatus(filters.result as 'SUCCESS' | 'FAILURE');
  }

  return db.automationLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: filters?.limit || 50,
  });
}

export async function getAgentStats(siteId: string) {
  const logs = await db.automationLog.findMany({
    where: { siteId, action: { startsWith: 'AGENT:' } },
    select: { status: true, details: true, createdAt: true },
  });

  const success = logs.filter((l) => l.status === 'COMPLETED').length;
  const failure = logs.filter((l) => l.status === 'FAILED').length;
  const totalCost = logs.reduce((sum, l) => {
    try {
      const details = JSON.parse(l.details || '{}');
      return sum + (details.cost || 0);
    } catch {
      return sum;
    }
  }, 0);

  return {
    total: logs.length,
    success,
    failure,
    successRate: logs.length > 0 ? Math.round((success / logs.length) * 100) : 0,
    totalCost,
  };
}
