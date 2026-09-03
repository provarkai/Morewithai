import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { generateOutline } from '@/lib/ai/editorial.service';

export async function POST(req: NextRequest) {
  try {
    await requirePermission('ai.generate');
    const { articleId, siteId, primaryKeyword, mode } = await req.json();
    if (!articleId || !siteId) return NextResponse.json({ error: 'articleId and siteId required' }, { status: 400 });
    const result = await generateOutline(articleId, siteId, { primaryKeyword, mode });
    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Outline generation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}