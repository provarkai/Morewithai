import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { createRule, listRules } from '@/lib/growth/automation.service';

export async function GET(req: NextRequest) {
  try {
    await requirePermission('growth.read');
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId is required' }, { status: 400 });

    const rules = await listRules(siteId, {
      isActive: searchParams.get('isActive') === 'true' ? true : searchParams.get('isActive') === 'false' ? false : undefined,
    });

    return NextResponse.json({ data: rules });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to list rules';
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission('growth.write');
    const body = await req.json();
    const { siteId, name, triggerCondition, action, isActive } = body;
    if (!siteId || !name || !triggerCondition || !action) {
      return NextResponse.json({ error: 'siteId, name, triggerCondition, and action are required' }, { status: 400 });
    }

    const rule = await createRule({ siteId, name, triggerCondition, action, isActive });
    return NextResponse.json(rule, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to create rule';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
