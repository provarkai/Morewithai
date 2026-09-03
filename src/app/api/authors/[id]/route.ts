import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/auth/guards';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission('user.write');
    const { id } = await params;
    const body = await req.json();
    const existing = await db.author.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Author not found' }, { status: 404 });

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.bio !== undefined) updateData.bio = body.bio;
    if (body.avatarUrl !== undefined) updateData.avatarUrl = body.avatarUrl;
    if (body.website !== undefined) updateData.website = body.website;
    if (body.socialLinks !== undefined) updateData.socialLinks = typeof body.socialLinks === 'string' ? body.socialLinks : JSON.stringify(body.socialLinks);
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.userId !== undefined) updateData.userId = body.userId;
    if (body.name) {
      updateData.slug = body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    const author = await db.author.update({ where: { id }, data: updateData });
    return NextResponse.json(author);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to update author';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission('user.write');
    const { id } = await params;
    const existing = await db.author.findUnique({
      where: { id },
      include: { _count: { select: { articles: true } } },
    });
    if (!existing) return NextResponse.json({ error: 'Author not found' }, { status: 404 });

    // Soft-delete: set isActive=false instead of hard delete to preserve article references
    await db.author.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ success: true, message: 'Author archived' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to archive author';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
