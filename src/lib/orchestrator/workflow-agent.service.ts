import { db } from '@/lib/db';

// ─── Workflows ───────────────────────────────────────────────

export interface CreateWorkflowInput {
  organizationId: string;
  siteId?: string;
  name: string;
  description?: string;
  autonomyLevel?: string;
}

export async function createWorkflow(input: CreateWorkflowInput) {
  return db.workflow.create({
    data: {
      organizationId: input.organizationId,
      siteId: input.siteId ?? null,
      name: input.name,
      description: input.description ?? null,
      autonomyLevel: input.autonomyLevel ?? 'MANUAL',
    },
  });
}

export async function listWorkflows(organizationId: string, siteId?: string) {
  return db.workflow.findMany({
    where: {
      organizationId,
      ...(siteId ? { siteId } : {}),
    },
    include: {
      _count: { select: { versions: true, runs: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getWorkflow(id: string) {
  return db.workflow.findUnique({
    where: { id },
    include: {
      versions: {
        include: { steps: { orderBy: { stepOrder: 'asc' } } },
        orderBy: { version: 'desc' },
        take: 5,
      },
      runs: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  });
}

export async function updateWorkflow(
  id: string,
  data: { name?: string; description?: string; status?: string; autonomyLevel?: string },
) {
  return db.workflow.update({ where: { id }, data });
}

// ─── Workflow Versions ───────────────────────────────────────

export interface WorkflowStepInput {
  stepOrder: number;
  stepType: string;
  configuration?: Record<string, unknown>;
  approvalRequired?: boolean;
  timeoutSeconds?: number;
}

export async function createWorkflowVersion(
  workflowId: string,
  steps: WorkflowStepInput[],
) {
  const workflow = await db.workflow.findUnique({ where: { id: workflowId } });
  if (!workflow) throw new Error('Workflow not found');

  const nextVersion = workflow.currentVersion + 1;

  const version = await db.workflowVersion.create({
    data: {
      workflowId,
      version: nextVersion,
      steps: {
        create: steps.map((s) => ({
          stepOrder: s.stepOrder,
          stepType: s.stepType,
          configuration: s.configuration ? JSON.stringify(s.configuration) : null,
          approvalRequired: s.approvalRequired ?? false,
          timeoutSeconds: s.timeoutSeconds ?? null,
        })),
      },
    },
    include: { steps: { orderBy: { stepOrder: 'asc' } } },
  });

  await db.workflow.update({
    where: { id: workflowId },
    data: { currentVersion: nextVersion },
  });

  return version;
}

// ─── Workflow Runs ───────────────────────────────────────────

export async function startWorkflowRun(
  workflowId: string,
  siteId?: string,
  triggerPayload?: Record<string, unknown>,
) {
  return db.workflowRun.create({
    data: {
      workflowId,
      siteId: siteId ?? null,
      triggerPayload: triggerPayload ? JSON.stringify(triggerPayload) : null,
      status: 'RUNNING',
      startedAt: new Date(),
    },
  });
}

export async function completeWorkflowRun(
  runId: string,
  status: 'COMPLETED' | 'FAILED',
  errorMessage?: string,
) {
  return db.workflowRun.update({
    where: { id: runId },
    data: {
      status,
      completedAt: new Date(),
      errorMessage: errorMessage ?? null,
    },
  });
}

export async function getWorkflowRuns(workflowId: string, limit = 20) {
  return db.workflowRun.findMany({
    where: { workflowId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

// ─── Agents ──────────────────────────────────────────────────

export interface CreateAgentInput {
  organizationId?: string;
  name: string;
  type: string;
  provider?: string;
  model?: string;
  systemConfiguration?: Record<string, unknown>;
  permissions?: string[];
  maxCost?: number;
}

export async function createAgent(input: CreateAgentInput) {
  return db.agent.create({
    data: {
      organizationId: input.organizationId ?? null,
      name: input.name,
      type: input.type,
      provider: input.provider ?? null,
      model: input.model ?? null,
      systemConfiguration: input.systemConfiguration
        ? JSON.stringify(input.systemConfiguration)
        : null,
      permissions: input.permissions ? JSON.stringify(input.permissions) : null,
      maxCost: input.maxCost ?? null,
    },
  });
}

export async function listAgents(organizationId?: string) {
  return db.agent.findMany({
    where: {
      ...(organizationId ? { organizationId } : {}),
      status: 'ACTIVE',
    },
    include: {
      tools: true,
      _count: { select: { runs: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getAgent(id: string) {
  return db.agent.findUnique({
    where: { id },
    include: {
      tools: true,
      runs: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { toolCalls: true, outputs: true },
      },
    },
  });
}

// ─── Agent Runs ──────────────────────────────────────────────

export async function startAgentRun(
  agentId: string,
  organizationId: string,
  input?: Record<string, unknown>,
  siteId?: string,
) {
  return db.agentRun.create({
    data: {
      agentId,
      organizationId,
      siteId: siteId ?? null,
      input: input ? JSON.stringify(input) : null,
      status: 'RUNNING',
      startedAt: new Date(),
    },
  });
}

export async function completeAgentRun(
  runId: string,
  output: Record<string, unknown>,
  tokens: { input: number; output: number },
  cost: number,
) {
  return db.agentRun.update({
    where: { id: runId },
    data: {
      output: JSON.stringify(output),
      inputTokens: tokens.input,
      outputTokens: tokens.output,
      estimatedCost: cost,
      status: 'COMPLETED',
      completedAt: new Date(),
    },
  });
}

export async function failAgentRun(runId: string, error: string) {
  return db.agentRun.update({
    where: { id: runId },
    data: {
      status: 'FAILED',
      completedAt: new Date(),
      output: JSON.stringify({ error }),
    },
  });
}

// ─── Next Best Action ────────────────────────────────────────

export interface CreateNextBestActionInput {
  organizationId: string;
  siteId?: string;
  actionType: string;
  title: string;
  reason: string;
  impactScore: number;
  effortScore: number;
  confidenceScore: number;
  estimatedRevenue?: number;
  sourceType?: string;
  sourceId?: string;
}

export async function createNextBestAction(input: CreateNextBestActionInput) {
  return db.nextBestAction.create({
    data: {
      organizationId: input.organizationId,
      siteId: input.siteId ?? null,
      actionType: input.actionType,
      title: input.title,
      reason: input.reason,
      impactScore: input.impactScore,
      effortScore: input.effortScore,
      confidenceScore: input.confidenceScore,
      estimatedRevenue: input.estimatedRevenue ?? null,
      sourceType: input.sourceType ?? null,
      sourceId: input.sourceId ?? null,
    },
  });
}

export async function getNextBestActions(organizationId: string, siteId?: string, limit = 10) {
  return db.nextBestAction.findMany({
    where: {
      organizationId,
      status: 'PENDING',
      ...(siteId ? { siteId } : {}),
    },
    orderBy: [{ impactScore: 'desc' }, { confidenceScore: 'desc' }],
    take: limit,
  });
}

export async function completeNextBestAction(id: string) {
  return db.nextBestAction.update({
    where: { id },
    data: { status: 'COMPLETED', completedAt: new Date() },
  });
}
