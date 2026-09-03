import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import { createOrganization } from '@/lib/saas/organization.service';

// GET — List organizations for the current user
export async function GET() {
  try {
    const user = await requireAuth();

    const memberships = await db.organizationMember.findMany({
      where: { userId: user.userId },
      include: {
        organization: {
          include: {
            _count: { select: { members: true, sites: true } },
          },
        },
      },
    });

    const organizations = memberships.map((m) => m.organization);

    return NextResponse.json(organizations);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) {
      const err = error as { status: number; message: string };
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 });
  }
}

// POST — Create a new organization
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const organization = await createOrganization({
      name: name.trim(),
      ownerId: user.userId,
    });

    return NextResponse.json(organization, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) {
      const err = error as { status: number; message: string };
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 });
  }
}
