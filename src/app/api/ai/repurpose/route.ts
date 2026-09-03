import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { repurposeContent, batchRepurpose, getAvailableFormats, type RepurposeFormat } from '@/lib/ai/repurpose.service';

export async function GET(req: NextRequest) {
  try {
    await requirePermission('ai.analyze');
    const formats = getAvailableFormats();
    return NextResponse.json(formats);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission('ai.analyze');
    const body = await req.json();
    const { articleId, siteId, format, formats } = body;

    if (!articleId || !siteId) {
      return NextResponse.json({ error: 'articleId and siteId required' }, { status: 400 });
    }

    // Batch repurpose
    if (Array.isArray(formats) && formats.length > 0) {
      const results = await batchRepurpose(articleId, formats as RepurposeFormat[], siteId);
      return NextResponse.json({ results });
    }

    // Single repurpose
    if (!format) {
      return NextResponse.json({ error: 'format or formats array required' }, { status: 400 });
    }

    const result = await repurposeContent(articleId, format as RepurposeFormat, siteId);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Repurposing failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
