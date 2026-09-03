'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  CreditCard,
  Calendar,
  AlertTriangle,
  ExternalLink,
  X,
  RotateCcw,
} from 'lucide-react';

interface SubscriptionData {
  active: boolean;
  plan: {
    name: string;
    slug: string;
    price: number;
    currency: string;
    interval: string;
  } | null;
  subscription: {
    id: string;
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string | null;
    canceledAt: string | null;
    provider: string;
  } | null;
  isTrial: boolean;
  trialEndsAt: string | null;
  status: string;
}

export function SubscriptionManager() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const res = await fetch('/api/stripe/subscription');
      if (res.ok) {
        setSubscription(await res.json());
      }
    } catch {
      // Subscription fetch failed silently
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!subscription?.subscription) return;
    setActionLoading(true);
    try {
      await fetch('/api/stripe/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel',
          subscriptionId: subscription.subscription.id,
        }),
      });
      await fetchSubscription();
    } finally {
      setActionLoading(false);
      setShowCancelDialog(false);
    }
  };

  const handleResume = async () => {
    if (!subscription?.subscription) return;
    setActionLoading(true);
    try {
      await fetch('/api/stripe/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resume',
          subscriptionId: subscription.subscription.id,
        }),
      });
      await fetchSubscription();
    } finally {
      setActionLoading(false);
    }
  };

  const handlePortal = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/stripe/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'portal' }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    TRIALING: 'bg-blue-100 text-blue-800',
    PAST_DUE: 'bg-yellow-100 text-yellow-800',
    CANCELED: 'bg-red-100 text-red-800',
    INCOMPLETE: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Current Plan
              </CardTitle>
              <CardDescription>
                Manage your subscription and billing
              </CardDescription>
            </div>
            {subscription?.subscription?.status && (
              <Badge
                className={statusColors[subscription.subscription.status] || ''}
                variant="secondary"
              >
                {subscription.subscription.status}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!subscription?.active ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <CreditCard className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-lg font-medium">No Active Plan</p>
              <p className="text-sm text-muted-foreground">
                Choose a plan to unlock all features and start growing your publication.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
                <div>
                  <p className="text-2xl font-bold">{subscription.plan?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {subscription.plan?.price === 0
                      ? 'Free forever'
                      : `₦${subscription.plan?.price.toLocaleString()}/mo`}
                  </p>
                </div>
                {subscription.isTrial && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    Free Trial
                  </Badge>
                )}
              </div>

              {subscription.trialEndsAt && (
                <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Your trial ends on{' '}
                    {new Date(subscription.trialEndsAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}

              {subscription.subscription?.canceledAt && (
                <div className="flex items-center gap-2 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-700">
                  <AlertTriangle className="h-4 w-4" />
                  <span>
                    Your subscription is scheduled to cancel on{' '}
                    {subscription.subscription.currentPeriodEnd
                      ? new Date(subscription.subscription.currentPeriodEnd).toLocaleDateString(
                          'en-US',
                          { month: 'long', day: 'numeric', year: 'numeric' }
                        )
                      : 'the current period end'}
                    .
                  </span>
                </div>
              )}

              <Separator />

              <div className="flex flex-wrap gap-3">
                {subscription.subscription?.canceledAt ? (
                  <Button
                    variant="outline"
                    onClick={handleResume}
                    disabled={actionLoading}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Resume Subscription
                  </Button>
                ) : subscription.subscription?.provider === 'STRIPE' ? (
                  <>
                    <Button variant="outline" onClick={handlePortal} disabled={actionLoading}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Manage Billing
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setShowCancelDialog(true)}
                      disabled={actionLoading}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancel Subscription
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="destructive"
                    onClick={() => setShowCancelDialog(true)}
                    disabled={actionLoading}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancel Subscription
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Your subscription will remain active until the end of the current billing period.
              After that, you will lose access to premium features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Keep Plan</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? 'Processing...' : 'Cancel Subscription'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
