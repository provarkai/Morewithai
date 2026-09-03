import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guards';
import { routeTask, getModelCatalog, getRoutingDecision } from '@/lib/ai/router';
import type { TaskType } from '@/lib/ai/router';

const VALID_TASK_TYPES = new Set<string>([
  'classification',
  'tagging',
  'summarization',
  'research',
  'outline',
  'generation',
  'seo',
  'quality',
  'analysis',
  'strategic',
  'reasoning',
  'creative',
]);

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = req.nextUrl;
    const action = searchParams.get('action');

    if (action === 'catalog') {
      return NextResponse.json(getModelCatalog());
    }

    if (action === 'route') {
      const taskType = searchParams.get('taskType');
      if (!taskType || !VALID_TASK_TYPES.has(taskType)) {
        return NextResponse.json({ error: 'Valid taskType required. Options: ' + [...VALID_TASK_TYPES].join(', ') }, { status: 400 });
      }
      const decision = routeTask(taskType as TaskType);
      return NextResponse.json(decision);
    }

    if (action === 'cost') {
      const taskType = searchParams.get('taskType');
      if (!taskType || !VALID_TASK_TYPES.has(taskType)) {
        return NextResponse.json({ error: 'Valid taskType required. Options: ' + [...VALID_TASK_TYPES].join(', ') }, { status: 400 });
      }
      const inputTokens = Number(searchParams.get('inputTokens')) || undefined;
      const outputTokens = Number(searchParams.get('outputTokens')) || undefined;
      const result = getRoutingDecision(taskType as TaskType, inputTokens, outputTokens);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Specify action: catalog, route, or cost' }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    const status = msg.includes('Unauthorized') ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
