import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth/guards';
import { db } from '@/lib/db';

// GET — List all active plans
export async function GET() {
  try {
    await requireAuth();

    const plans = await db.plan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });

    return NextResponse.json(plans);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) {
      const err = error as { status: number; message: string };
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 });
  }
}

// POST — Create a new plan (admin only)
export async function POST(req: NextRequest) {
  try {
    await requireRole('ADMIN');

    const body = await req.json();
    const { name, slug, price, currency, interval, limits, features } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    if (!slug || typeof slug !== 'string' || slug.trim().length === 0) {
      return NextResponse.json({ error: 'slug is required' }, { status: 400 });
    }

    // Check for duplicate slug
    const existing = await db.plan.findUnique({ where: { slug: slug.trim() } });
    if (existing) {
      return NextResponse.json({ error: 'Plan with this slug already exists' }, { status: 409 });
    }

    const plan = await db.plan.create({
      data: {
        name: name.trim(),
        slug: slug.trim(),
        price: typeof price === 'number' ? price : 0,
        currency: typeof currency === 'string' ? currency : 'NGN',
        interval: typeof interval === 'string' ? interval : 'MONTHLY',
        limits: limits ? JSON.stringify(limits) : '{}',
        features: features ? JSON.stringify(features) : null,
      },
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) {
      const err = error as { status: number; message: string };
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 });
  }
}
