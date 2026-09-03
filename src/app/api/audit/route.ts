import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guards';
import { getAuditLogs } from '@/lib/operations/audit.service';

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const sp = req.nextUrl.searchParams;
    const logs = await getAuditLogs({ siteId: sp.get('siteId') || undefined, action: sp.get('action') || undefined, resource: sp.get('resource') || undefined, page: Number(sp.get('page')) || 1, limit: Number(sp.get('limit')) || 50 });
    return NextResponse.json(logs);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: msg.includes('Unauthorized') ? 401 : 500 });
  }
}
