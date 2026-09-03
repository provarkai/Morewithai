import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { createClientPortal, getClientPortals, updateClientBranding, getWhiteLabelConfig, updateWhiteLabelConfig, getAgencyDashboard } from '@/lib/saas/white-label.service';

export async function GET(req: NextRequest) {
  try {
    await requirePermission('articles.view');
    const orgId = req.nextUrl.searchParams.get('orgId');
    const siteId = req.nextUrl.searchParams.get('siteId');
    const action = req.nextUrl.searchParams.get('action');
    if (action === 'agency' && orgId) return NextResponse.json(await getAgencyDashboard(orgId));
    if (siteId && action === 'config') return NextResponse.json(await getWhiteLabelConfig(siteId));
    if (orgId) return NextResponse.json(await getClientPortals(orgId));
    return NextResponse.json({ error: 'orgId or siteId required' });
  } catch (error: unknown) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission('articles.edit');
    const body = await req.json();
    const { action, organizationId, siteId, ...data } = body;
    if (!action) return NextResponse.json({ error: 'action required' }, { status: 400 });
    switch (action) {
      case 'create-portal': return NextResponse.json(await createClientPortal({ organizationId, ...data }));
      case 'update-branding': return NextResponse.json(await updateClientBranding(data.portalId, data.branding));
      case 'update-config': return NextResponse.json(await updateWhiteLabelConfig(siteId, data));
      default: return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: unknown) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 }); }
}
