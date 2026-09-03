import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guards';
import { listFeatureFlags, createFeatureFlag, toggleFeatureFlag, setSiteFeatureFlag, isFeatureEnabled } from '@/lib/operations/feature-flags.service';

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const sp = req.nextUrl.searchParams;
    const action = sp.get('action');
    if (action === 'check') {
      const key = sp.get('key');
      if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 });
      const enabled = await isFeatureEnabled(key, sp.get('siteId') || undefined);
      return NextResponse.json({ key, enabled });
    }
    return NextResponse.json(await listFeatureFlags());
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: msg.includes('Unauthorized') ? 401 : 500 });
  }
}
export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    if (body.action === 'toggle') {
      await toggleFeatureFlag(body.id, body.enabled);
      return NextResponse.json({ success: true });
    }
    if (body.action === 'set-site') {
      await setSiteFeatureFlag(body.siteId, body.featureFlagId, body.enabled);
      return NextResponse.json({ success: true });
    }
    const flag = await createFeatureFlag(body);
    return NextResponse.json(flag, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: msg.includes('Unauthorized') ? 401 : 500 });
  }
}
