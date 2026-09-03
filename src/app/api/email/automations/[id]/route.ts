import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import {
  getAutomation,
  updateAutomation,
  deleteAutomation,
} from '@/lib/email/automation.service';
import { AUTOMATION_TRIGGER } from '@/lib/email/types';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission('email.read');
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    const automation = await getAutomation(id, siteId);
    return NextResponse.json(automation);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('permission')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const msg = error instanceof Error ? error.message : 'Failed';
    const status = msg === 'Automation not found' ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission('email.write');
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    const body = await req.json();
    const { name, triggerType, steps, status } = body;

    if (triggerType && !Object.values(AUTOMATION_TRIGGER).includes(triggerType)) {
      return NextResponse.json({ error: `Invalid trigger type: ${triggerType}` }, { status: 400 });
    }

    const automation = await updateAutomation(id, siteId, {
      name,
      triggerType,
      steps,
      status,
    });
    return NextResponse.json(automation);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('permission')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const msg = error instanceof Error ? error.message : 'Failed';
    const status = msg === 'Automation not found' ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission('email.write');
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    await deleteAutomation(id, siteId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('permission')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const msg = error instanceof Error ? error.message : 'Failed';
    const status = msg === 'Automation not found' ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
