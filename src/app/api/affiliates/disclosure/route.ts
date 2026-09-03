import { NextRequest, NextResponse } from 'next/server';
import { getDisclosureText, getDefaultDisclosure } from '@/lib/affiliate/disclosure';

// Public endpoint — no auth required
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');

    if (siteId) {
      const text = await getDisclosureText(siteId);
      return NextResponse.json({ disclosure: text });
    }

    return NextResponse.json({ disclosure: getDefaultDisclosure() });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
