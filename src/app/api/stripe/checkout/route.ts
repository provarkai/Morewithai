import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import { createCheckoutSession } from '@/lib/stripe/service';

// POST — Create a Stripe checkout session
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const { planId } = body;

    if (!planId || typeof planId !== 'string') {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 });
    }

    // Get user's organization
    const membership = await db.organizationMember.findFirst({
      where: { userId: session.userId },
      include: { organization: true },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'You must belong to an organization' },
        { status: 400 }
      );
    }

    // Only owners can manage subscriptions
    if (membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only organization owners can manage subscriptions' },
        { status: 403 }
      );
    }

    const user = await db.user.findUnique({ where: { id: session.userId } });

    const origin = req.headers.get('origin') || 'http://localhost:3000';

    const checkoutSession = await createCheckoutSession({
      organizationId: membership.organizationId,
      planId,
      successUrl: `${origin}/settings/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/settings/billing?canceled=true`,
      customerEmail: user?.email || undefined,
    });

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) {
      const err = error as { status: number; message: string };
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
