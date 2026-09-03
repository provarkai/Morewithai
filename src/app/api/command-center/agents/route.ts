import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import {
  createAgent,
  listAgents,
  getAgent,
  startAgentRun,
  completeAgentRun,
  failAgentRun,
} from '@/lib/orchestrator/workflow-agent.service';

export async function GET(req: NextRequest) {
  try {
    await requirePermission('automation.read');
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId') || undefined;

    const action = searchParams.get('action') || 'list';

    if (action === 'detail') {
      const id = searchParams.get('id');
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
      const agent = await getAgent(id);
      if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json(agent);
    }

    const agents = await listAgents(organizationId);
    return NextResponse.json(agents);
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

    if (action === 'run') {
      const run = await startAgentRun(body.agentId, body.organizationId, body.input, body.siteId);
      return NextResponse.json(run, { status: 201 });
    }
    if (action === 'complete-run') {
      const run = await completeAgentRun(body.runId, body.output, body.tokens, body.cost);
      return NextResponse.json(run);
    }
    if (action === 'fail-run') {
      const run = await failAgentRun(body.runId, body.error);
      return NextResponse.json(run);
    }

    const agent = await createAgent(body);
    return NextResponse.json(agent, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
