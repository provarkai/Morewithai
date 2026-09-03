import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { generateVisualContent, getVisualTemplates, generateAltText } from '@/lib/ai/visual-content.service';

export async function GET(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get('type') as any;
    const templates = getVisualTemplates(type || undefined);
    return NextResponse.json(templates);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission('articles.edit');
    const body = await req.json();
    const { action, siteId, type, title, description, style, dimensions, brandColors, text, articleId, imageDescription, articleTitle } = body;

    if (action === 'alt-text') {
      if (!imageDescription || !articleTitle || !siteId) {
        return NextResponse.json({ error: 'imageDescription, articleTitle, siteId required' }, { status: 400 });
      }
      const alt = await generateAltText(imageDescription, articleTitle, siteId);
      return NextResponse.json({ altText: alt });
    }

    if (!siteId || !title) {
      return NextResponse.json({ error: 'siteId and title required' }, { status: 400 });
    }

    const result = await generateVisualContent({
      type: type || 'FEATURED_IMAGE',
      title,
      description,
      style,
      dimensions,
      brandColors,
      text,
      articleId,
    }, siteId);

    return NextResponse.json(result);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}
