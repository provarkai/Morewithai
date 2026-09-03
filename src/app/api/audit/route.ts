import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { getAuditTrail, getRecentActivity, getAuditStats } from '@/lib/audit/audit-trail.service';

export async function GET(req: NextRequest) {
  try {
    await requirePermission('articles.view');
    const siteId = req.nextUrl.searchParams.get('siteId');
    const resource = req.nextUrl.searchParams.get('resource');
    const resourceId = req.nextUrl.searchParams.get('resourceId');
    const action = req.nextUrl.searchParams.get('action') || 'trail';
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '30');

    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    if (action === 'activity') {
      const activity = await getRecentActivity(siteId, limit);
      return NextResponse.json({ activity });
    }

    if (action === 'stats') {
      const days = parseInt(req.nextUrl.searchParams.get('days') || '30');
      const stats = await getAuditStats(siteId, days);
      return NextResponse.json(stats);
    }

    if (resource && resourceId) {
      const trail = await getAuditTrail(siteId, resource, resourceId, limit);
      return NextResponse.json(trail);
    }

    const activity = await getRecentActivity(siteId, limit);
    return NextResponse.json({ activity });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}
