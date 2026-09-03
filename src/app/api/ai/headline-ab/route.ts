import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import {
  createHeadlineABTest,
  getHeadlineABTest,
  completeHeadlineABTest,
  generateHeadlineVariants,
} from '@/lib/ai/headline-ab.service';

export async function GET(req: NextRequest) {
  try {
    await requirePermission('ai.analyze');
    const siteId = req.nextUrl.searchParams.get('siteId');
    const articleId = req.nextUrl.searchParams.get('articleId');

    if (!siteId || !articleId) {
      return NextResponse.json({ error: 'siteId and articleId required' }, { status: 400 });
    }

    const test = await getHeadlineABTest(articleId, siteId);
    return NextResponse.json(test || { status: 'none' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission('articles.edit');
    const body = await req.json();
    const { action, siteId, articleId, variants, experimentId } = body;

    if (!siteId || !articleId) {
      return NextResponse.json({ error: 'siteId and articleId required' }, { status: 400 });
    }

    switch (action) {
      case 'create': {
        const test = await createHeadlineABTest(articleId, siteId, variants);
        return NextResponse.json(test);
      }
      case 'generate': {
        const generatedVariants = await generateHeadlineVariants(articleId, siteId);
        return NextResponse.json({ variants: generatedVariants });
      }
      case 'complete': {
        if (!experimentId) {
          return NextResponse.json({ error: 'experimentId required' }, { status: 400 });
        }
        const result = await completeHeadlineABTest(experimentId);
        return NextResponse.json(result);
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
