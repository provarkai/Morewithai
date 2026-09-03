import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { createTemplate, listTemplates } from '@/lib/social/service';

export async function GET(req: NextRequest) {
  try {
    await requirePermission('growth.read');
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId is required' }, { status: 400 });

    const templates = await listTemplates(siteId, {
      platform: searchParams.get('platform') || undefined,
    });

    return NextResponse.json({ data: templates });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to list templates';
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission('growth.write');
    const body = await req.json();
    const { siteId, platform, name, template } = body;
    if (!siteId || !platform || !name || !template) {
      return NextResponse.json({ error: 'siteId, platform, name, and template are required' }, { status: 400 });
    }

    const created = await createTemplate({ siteId, platform, name, template });
    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to create template';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
