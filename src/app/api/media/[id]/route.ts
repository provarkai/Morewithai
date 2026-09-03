import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guards';
import { getMedia, updateMedia, deleteMedia } from '@/lib/media/service';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    const { searchParams } = req.nextUrl;
    const siteId = searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    const media = await getMedia(id, siteId);
    return NextResponse.json(media);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch media';
    const status = msg.includes('401') ? 401 : msg.includes('403') ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    const { searchParams } = req.nextUrl;
    const siteId = searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    const body = await req.json();
    const { alt, folder } = body;

    const media = await updateMedia(id, siteId, { alt, folder });
    return NextResponse.json(media);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to update media';
    const status = msg.includes('401') ? 401 : msg.includes('403') ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    const { searchParams } = req.nextUrl;
    const siteId = searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    const result = await deleteMedia(id, siteId);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to delete media';
    const status = msg.includes('401') ? 401 : msg.includes('403') ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
