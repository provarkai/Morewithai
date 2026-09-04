import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

// Public, unauthenticated: minimal fields only, no admin/internal data.
// The anonymous blog homepage needs this to know which site to render —
// it must not depend on the admin /api/sites route (which requires auth).
export async function GET() {
  try {
    const sites = await db.site.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true, description: true, domain: true, theme: true },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(sites);
  } catch (error) {
    console.error('Error fetching public sites:', error);
    return NextResponse.json({ error: 'Failed to load sites' }, { status: 500 });
  }
}
