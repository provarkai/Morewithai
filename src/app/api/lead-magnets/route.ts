import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { createLeadMagnet, listLeadMagnets, getLeadMagnetStats } from '@/lib/lead-magnet/service';

export async function GET(req: NextRequest) {
  try {
    await requirePermission('subscriber.read');
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    const action = searchParams.get('action');

    if (action === 'stats') {
      const stats = await getLeadMagnetStats(siteId);
      return NextResponse.json(stats);
    }

    const status = searchParams.get('status') || undefined;
    const magnets = await listLeadMagnets(siteId, { status });
    return NextResponse.json(magnets);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission('subscriber.write');
    const body = await req.json();
    const { siteId, name, title, description, fileType, fileUrl, ctaText, ctaDescription, thankYouMessage, thankYouUrl, emailSequenceId } = body;

    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
    if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 });
    if (!ctaText) return NextResponse.json({ error: 'ctaText required' }, { status: 400 });

    const magnet = await createLeadMagnet({
      siteId,
      name,
      title,
      description: description || undefined,
      fileType: fileType || undefined,
      fileUrl: fileUrl || undefined,
      ctaText,
      ctaDescription: ctaDescription || undefined,
      thankYouMessage: thankYouMessage || undefined,
      thankYouUrl: thankYouUrl || undefined,
      emailSequenceId: emailSequenceId || undefined,
    });

    return NextResponse.json(magnet, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
