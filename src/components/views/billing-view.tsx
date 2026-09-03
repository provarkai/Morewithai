'use client';

import { useState, useEffect } from 'react';
import { PricingPlans } from '@/components/billing/pricing-plans';
import { SubscriptionManager } from '@/components/billing/subscription-manager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Settings, Receipt } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  interval: string;
  features: string | null;
}

export function BillingView() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<string>('starter');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/plans').then((r) => (r.ok ? r.json() : [])),
      fetch('/api/stripe/subscription').then((r) => (r.ok ? r.json() : null)),
    ]).then(([plansData, subData]) => {
      if (plansData) setPlans(plansData);
      if (subData?.plan?.slug) setCurrentPlan(subData.plan.slug);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing & Subscription</h1>
        <p className="text-muted-foreground">
          Manage your subscription plan, billing details, and payment methods.
        </p>
      </div>

      {/* Current Subscription */}
      <SubscriptionManager />

      {/* Plans Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Available Plans</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Choose the plan that fits your publication's needs. Upgrade or downgrade anytime.
        </p>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-8">
                  <div className="flex items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <PricingPlans currentPlanSlug={currentPlan} />
        )}
      </div>

      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Frequently Asked Questions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-medium">Can I switch plans at any time?</h3>
            <p className="text-sm text-muted-foreground">
              Yes! You can upgrade or downgrade your plan at any time. Upgrades take effect immediately
              with prorated billing, while downgrades take effect at the end of your current billing cycle.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-medium">What payment methods are accepted?</h3>
            <p className="text-sm text-muted-foreground">
              We accept all major credit and debit cards through our secure payment processor, Stripe.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-medium">Is there a free trial?</h3>
            <p className="text-sm text-muted-foreground">
              Yes! All paid plans come with a 14-day free trial. You can cancel anytime during the
              trial period without being charged.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-medium">How do I cancel my subscription?</h3>
            <p className="text-sm text-muted-foreground">
              You can cancel your subscription from the billing page above. Your subscription will
              remain active until the end of your current billing period.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
