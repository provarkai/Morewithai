import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { restoreVersion, getVersion } from '@/lib/articles/versioning';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; vid: string }> }
) {
  try {
    await requirePermission('article.edit');
    const { id, vid } = await params;
    const version = await restoreVersion(id, vid);
    return NextResponse.json({ success: true, version });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to restore version';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; vid: string }> }
) {
  try {
    await requirePermission('article.read');
    const { id, vid } = await params;
    const version = await getVersion(id, vid);
    if (!version) return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    return NextResponse.json(version);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch version';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
