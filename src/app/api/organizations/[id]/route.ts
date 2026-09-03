import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import { getOrganization, updateOrganization } from '@/lib/saas/organization.service';

// GET — Fetch a single organization with members and counts
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;

    const organization = await getOrganization(id);

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json(organization);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) {
      const err = error as { status: number; message: string };
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Failed to fetch organization' }, { status: 500 });
  }
}

// PUT — Update organization name or status
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const { name, status } = body;

    const org = await db.organization.findUnique({ where: { id } });
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Only owner or admin can update
    if (org.ownerId !== user.userId && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only the owner can update this organization' }, { status: 403 });
    }

    const updateData: { name?: string; status?: string } = {};
    if (name !== undefined && typeof name === 'string' && name.trim().length > 0) {
      updateData.name = name.trim();
    }
    if (status !== undefined && typeof status === 'string') {
      updateData.status = status;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const updated = await updateOrganization(id, updateData);
    return NextResponse.json(updated);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) {
      const err = error as { status: number; message: string };
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 });
  }
}

// DELETE — Delete organization (owner only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const org = await db.organization.findUnique({ where: { id } });
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    if (org.ownerId !== user.userId && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only the owner can delete this organization' }, { status: 403 });
    }

    await db.organization.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) {
      const err = error as { status: number; message: string };
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Failed to delete organization' }, { status: 500 });
  }
}
