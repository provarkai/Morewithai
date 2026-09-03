import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import {
  createWorkflow,
  listWorkflows,
  getWorkflow,
  updateWorkflow,
  createWorkflowVersion,
  startWorkflowRun,
  getWorkflowRuns,
  completeWorkflowRun,
} from '@/lib/orchestrator/workflow-agent.service';

export async function GET(req: NextRequest) {
  try {
    await requirePermission('automation.read');
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId');
    if (!organizationId) return NextResponse.json({ error: 'organizationId required' }, { status: 400 });

    const action = searchParams.get('action') || 'list';
    const siteId = searchParams.get('siteId') || undefined;

    if (action === 'detail') {
      const id = searchParams.get('id');
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
      const workflow = await getWorkflow(id);
      if (!workflow) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json(workflow);
    }
    if (action === 'runs') {
      const id = searchParams.get('id');
      if (!id) return NextResponse.json({ error: 'workflow id required' }, { status: 400 });
      const runs = await getWorkflowRuns(id);
      return NextResponse.json(runs);
    }

    const workflows = await listWorkflows(organizationId, siteId);
    return NextResponse.json(workflows);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission('automation.write');
    const body = await req.json();
    const { action } = body;

    if (action === 'version') {
      const version = await createWorkflowVersion(body.workflowId, body.steps);
      return NextResponse.json(version, { status: 201 });
    }
    if (action === 'run') {
      const run = await startWorkflowRun(body.workflowId, body.siteId, body.triggerPayload);
      return NextResponse.json(run, { status: 201 });
    }
    if (action === 'complete-run') {
      const run = await completeWorkflowRun(body.runId, body.status, body.errorMessage);
      return NextResponse.json(run);
    }

    const workflow = await createWorkflow(body);
    return NextResponse.json(workflow, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requirePermission('automation.write');
    const body = await req.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const workflow = await updateWorkflow(id, data);
    return NextResponse.json(workflow);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
