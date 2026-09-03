import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';

// GET all sites accessible to the authenticated user
export async function GET() {
  try {
    const user = await requirePermission('site.read');

    // Admin sees all sites; others see only their assigned sites
    const sites = user.role === 'ADMIN'
      ? await db.site.findMany({
          orderBy: { createdAt: 'desc' },
          include: { _count: { select: { feeds: true, articles: true } } },
        })
      : await db.site.findMany({
          where: { userAccess: { some: { userId: user.userId } } },
          orderBy: { createdAt: 'desc' },
          include: { _count: { select: { feeds: true, articles: true } } },
        });

    return NextResponse.json(sites);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) {
      const err = error as { status: number; message: string };
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Failed to fetch sites' }, { status: 500 });
  }
}

// POST create site
export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission('site.write');
    const body = await req.json();
    const { name, slug, description, domain, theme } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'name and slug are required' }, { status: 400 });
    }

    const existing = await db.site.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: 'Site with this slug already exists' }, { status: 409 });
    }

    const site = await db.site.create({
      data: {
        name,
        slug,
        description: description || null,
        domain: domain || null,
        theme: theme || 'default',
        userAccess: { create: { userId: user.userId, role: 'ADMIN' } },
      },
    });

    return NextResponse.json(site, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) {
      const err = error as { status: number; message: string };
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Failed to create site' }, { status: 500 });
  }
}

// PUT update site
export async function PUT(req: NextRequest) {
  try {
    await requirePermission('site.write');
    const body = await req.json();
    const { id, name, slug, description, domain, isActive, theme } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (description !== undefined) updateData.description = description;
    if (domain !== undefined) updateData.domain = domain;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (theme !== undefined) updateData.theme = theme;

    const site = await db.site.update({ where: { id }, data: updateData });
    return NextResponse.json(site);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) {
      const err = error as { status: number; message: string };
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Failed to update site' }, { status: 500 });
  }
}

// DELETE delete site (admin only)
export async function DELETE(req: NextRequest) {
  try {
    await requirePermission('site.write');
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await db.site.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) {
      const err = error as { status: number; message: string };
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Failed to delete site' }, { status: 500 });
  }
}
