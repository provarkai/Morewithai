import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { scanForAlerts, generateAlertSummary } from '@/lib/alerts/performance-alerts.service';

export async function GET(req: NextRequest) {
  try {
    await requirePermission('ai.analyze');
    const siteId = req.nextUrl.searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    const alerts = await scanForAlerts(siteId);
    const summary = await generateAlertSummary(alerts, siteId);
    return NextResponse.json({ alerts, summary });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}
