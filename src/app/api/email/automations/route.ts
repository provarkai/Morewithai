import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { listAutomations, createAutomation, getAutomationStats } from '@/lib/email/automation.service';
import { AUTOMATION_TRIGGER } from '@/lib/email/types';

export async function GET(req: NextRequest) {
  try {
    await requirePermission('email.read');
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    const action = searchParams.get('action');

    if (action === 'stats') {
      const stats = await getAutomationStats(siteId);
      return NextResponse.json(stats);
    }

    const triggerType = searchParams.get('triggerType') || undefined;
    const status = searchParams.get('status') || undefined;

    const automations = await listAutomations(siteId, { triggerType, status });
    return NextResponse.json(automations);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('permission')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission('email.write');
    const body = await req.json();
    const { siteId, name, triggerType, steps } = body;

    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 });
    if (!steps?.length || !Array.isArray(steps)) {
      return NextResponse.json({ error: 'steps array is required' }, { status: 400 });
    }

    if (triggerType && !Object.values(AUTOMATION_TRIGGER).includes(triggerType)) {
      return NextResponse.json({ error: `Invalid trigger type: ${triggerType}` }, { status: 400 });
    }

    const automation = await createAutomation({ siteId, name, triggerType, steps });
    return NextResponse.json(automation, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('permission')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
