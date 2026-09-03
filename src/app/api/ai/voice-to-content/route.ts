import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { transcribeAudio, voiceToArticle, voiceToOutline } from '@/lib/ai/voice-to-content.service';

export async function POST(req: NextRequest) {
  try {
    await requirePermission('articles.edit');
    const body = await req.json();
    const { action, audioData, audioUrl, transcriptionText, notes, siteId, targetWordCount, tone, niche, articleType } = body;

    if (!siteId) {
      return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    }

    switch (action) {
      case 'transcribe': {
        if (!audioData && !audioUrl) {
          return NextResponse.json({ error: 'audioData or audioUrl required' }, { status: 400 });
        }
        const result = await transcribeAudio({ audioData, audioUrl, language: body.language || 'en' });
        return NextResponse.json(result);
      }
      case 'generate': {
        if (!transcriptionText) {
          return NextResponse.json({ error: 'transcriptionText required' }, { status: 400 });
        }
        const result = await voiceToArticle(transcriptionText, siteId, { targetWordCount, tone, niche, articleType });
        return NextResponse.json(result);
      }
      case 'outline': {
        if (!notes) {
          return NextResponse.json({ error: 'notes required' }, { status: 400 });
        }
        const result = await voiceToOutline(notes, siteId);
        return NextResponse.json(result);
      }
      default:
        return NextResponse.json({ error: 'Unknown action. Use: transcribe, generate, outline' }, { status: 400 });
    }
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}
