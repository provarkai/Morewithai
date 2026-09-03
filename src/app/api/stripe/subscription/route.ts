import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import {
  cancelSubscription,
  resumeSubscription,
  getSubscriptionStatus,
  createCustomerPortalSession,
} from '@/lib/stripe/service';

// GET — Get current subscription status
export async function GET() {
  try {
    const session = await requireAuth();

    const membership = await db.organizationMember.findFirst({
      where: { userId: session.userId },
    });

    if (!membership) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    const status = await getSubscriptionStatus(membership.organizationId);
    return NextResponse.json(status);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) {
      const err = error as { status: number; message: string };
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: 'Failed to fetch subscription status' },
      { status: 500 }
    );
  }
}

// POST — Cancel subscription
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const { action, subscriptionId } = body;

    const membership = await db.organizationMember.findFirst({
      where: { userId: session.userId },
    });

    if (!membership) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    if (membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only organization owners can manage subscriptions' },
        { status: 403 }
      );
    }

    if (action === 'cancel') {
      if (!subscriptionId) {
        return NextResponse.json(
          { error: 'subscriptionId is required' },
          { status: 400 }
        );
      }
      await cancelSubscription(subscriptionId);
      return NextResponse.json({ success: true, message: 'Subscription will be canceled at period end' });
    }

    if (action === 'resume') {
      if (!subscriptionId) {
        return NextResponse.json(
          { error: 'subscriptionId is required' },
          { status: 400 }
        );
      }
      await resumeSubscription(subscriptionId);
      return NextResponse.json({ success: true, message: 'Subscription resumed' });
    }

    if (action === 'portal') {
      const origin = req.headers.get('origin') || 'http://localhost:3000';
      const portalSession = await createCustomerPortalSession(
        membership.organizationId,
        `${origin}/settings/billing`
      );
      return NextResponse.json({ url: portalSession.url });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) {
      const err = error as { status: number; message: string };
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: 'Failed to manage subscription' },
      { status: 500 }
    );
  }
}
