import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import { addMember } from '@/lib/saas/organization.service';

// GET — List members of an organization with user info
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;

    const members = await db.organizationMember.findMany({
      where: { organizationId: id },
      include: {
        user: {
          select: { id: true, email: true, name: true, isActive: true },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return NextResponse.json(members);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) {
      const err = error as { status: number; message: string };
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
  }
}

// POST — Add a member to the organization
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const { userId, role } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Verify the caller is owner or admin of the org
    const org = await db.organization.findUnique({ where: { id } });
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    if (org.ownerId !== user.userId && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only the owner can add members' }, { status: 403 });
    }

    // Verify target user exists
    const targetUser = await db.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const memberRole = (typeof role === 'string' && role.trim().length > 0)
      ? role.trim().toUpperCase()
      : 'EDITOR';

    const member = await addMember(id, userId, memberRole);
    return NextResponse.json(member, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) {
      const err = error as { status: number; message: string };
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    // Handle unique constraint violation (member already exists)
    if (error instanceof Error && error.message.includes('Unique')) {
      return NextResponse.json({ error: 'User is already a member' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to add member' }, { status: 500 });
  }
}
