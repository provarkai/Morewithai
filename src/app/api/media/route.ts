import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guards';
import { uploadMedia, listMedia, getMediaStats, getFolders } from '@/lib/media/service';

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = req.nextUrl;
    const siteId = searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    const action = searchParams.get('action');

    if (action === 'stats') {
      const stats = await getMediaStats(siteId);
      return NextResponse.json(stats);
    }

    if (action === 'folders') {
      const folders = await getFolders(siteId);
      return NextResponse.json(folders);
    }

    const folder = searchParams.get('folder') || undefined;
    const mimeType = searchParams.get('mimeType') || undefined;
    const search = searchParams.get('search') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const result = await listMedia(siteId, { folder, mimeType, search, page, limit });
    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch media';
    const status = msg.includes('401') ? 401 : msg.includes('403') ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const siteId = (formData.get('siteId') as string) || undefined;
    const folder = (formData.get('folder') as string) || undefined;
    const alt = (formData.get('alt') as string) || undefined;

    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 });

    const media = await uploadMedia(siteId, file, folder, alt);
    return NextResponse.json(media, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to upload media';
    const status = msg.includes('401') ? 401 : msg.includes('403') ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
