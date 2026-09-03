import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import { updateMemberRole, removeMember } from '@/lib/saas/organization.service';

// PUT — Update a member's role
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const user = await requireAuth();
    const { id, userId: targetUserId } = await params;
    const body = await req.json();
    const { role } = body;

    if (!role || typeof role !== 'string' || role.trim().length === 0) {
      return NextResponse.json({ error: 'role is required' }, { status: 400 });
    }

    // Only owner or admin can update member roles
    const org = await db.organization.findUnique({ where: { id } });
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    if (org.ownerId !== user.userId && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only the owner can update member roles' }, { status: 403 });
    }

    // Cannot change the owner's role
    if (targetUserId === org.ownerId) {
      return NextResponse.json({ error: 'Cannot change the owner\'s role' }, { status: 400 });
    }

    const updated = await updateMemberRole(id, targetUserId, role.trim().toUpperCase());
    return NextResponse.json(updated);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) {
      const err = error as { status: number; message: string };
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Failed to update member role' }, { status: 500 });
  }
}

// DELETE — Remove a member from the organization
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const user = await requireAuth();
    const { id, userId: targetUserId } = await params;

    // Only owner or admin can remove members
    const org = await db.organization.findUnique({ where: { id } });
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    if (org.ownerId !== user.userId && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only the owner can remove members' }, { status: 403 });
    }

    // Cannot remove the owner
    if (targetUserId === org.ownerId) {
      return NextResponse.json({ error: 'Cannot remove the owner' }, { status: 400 });
    }

    await removeMember(id, targetUserId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) {
      const err = error as { status: number; message: string };
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }
}
