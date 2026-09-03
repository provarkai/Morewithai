import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import {
  joinCollaborationSession,
  leaveCollaborationSession,
  getCollaborationSession,
  getCollaborationConfig,
  getActiveSessions,
  updateAwareness,
} from '@/lib/collaboration/collaboration.service';

export async function GET(req: NextRequest) {
  try {
    const siteId = req.nextUrl.searchParams.get('siteId');
    const articleId = req.nextUrl.searchParams.get('articleId');
    const action = req.nextUrl.searchParams.get('action') || 'session';

    if (action === 'active') {
      // List all active sessions (requires auth)
      await requirePermission('articles.view');
      const sessions = getActiveSessions(siteId || '');
      return NextResponse.json({ sessions });
    }

    if (!articleId) {
      return NextResponse.json({ error: 'articleId required' }, { status: 400 });
    }

    await requirePermission('articles.view');

    if (action === 'config') {
      // Get collaboration config for the frontend
      const config = getCollaborationConfig(articleId);
      return NextResponse.json(config);
    }

    // Get session state
    const session = getCollaborationSession(articleId);
    return NextResponse.json(session || { status: 'none' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission('articles.edit');
    const body = await req.json();
    const { action, articleId, userId, userName, cursorPosition, selectionRange } = body;

    if (!articleId || !userId) {
      return NextResponse.json({ error: 'articleId and userId required' }, { status: 400 });
    }

    switch (action) {
      case 'join': {
        if (!userName) {
          return NextResponse.json({ error: 'userName required' }, { status: 400 });
        }
        const session = await joinCollaborationSession(articleId, userId, userName);
        return NextResponse.json(session);
      }
      case 'leave': {
        const session = await leaveCollaborationSession(articleId, userId);
        return NextResponse.json(session || { status: 'none' });
      }
      case 'awareness': {
        updateAwareness(articleId, userId, { cursorPosition, selectionRange });
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
