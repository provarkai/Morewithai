import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guards';
import { listWebhooks, createWebhook, deleteWebhook } from '@/lib/operations/webhook.service';

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const siteId = req.nextUrl.searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    return NextResponse.json(await listWebhooks(siteId));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: msg.includes('Unauthorized') ? 401 : 500 });
  }
}
export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    if (!body.siteId || !body.url) return NextResponse.json({ error: 'siteId and url required' }, { status: 400 });
    const webhook = await createWebhook({ siteId: body.siteId, url: body.url, events: body.events || ['*'], secret: body.secret });
    return NextResponse.json(webhook, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: msg.includes('Unauthorized') ? 401 : 500 });
  }
}
export async function DELETE(req: NextRequest) {
  try {
    await requireAuth();
    const sp = req.nextUrl.searchParams;
    const id = sp.get('id');
    const siteId = sp.get('siteId');
    if (!id || !siteId) return NextResponse.json({ error: 'id and siteId required' }, { status: 400 });
    await deleteWebhook(id, siteId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: msg.includes('Unauthorized') ? 401 : 500 });
  }
}
