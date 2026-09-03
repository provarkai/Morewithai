'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, CreditCard, Zap, Globe, ArrowRight } from 'lucide-react';

const PLANS = [
  {
    name: 'Starter',
    slug: 'starter',
    price: 0,
    currency: 'NGN',
    interval: 'monthly',
    description: 'Perfect for personal blogs and side projects',
    features: [
      '1 site',
      '100 articles/mo',
      'Basic analytics',
      'Email support',
      'RSS feed ingestion',
    ],
    limits: { sites: 1, articles: 100 },
    icon: <Globe className="h-5 w-5" />,
    popular: false,
  },
  {
    name: 'Growth',
    slug: 'growth',
    price: 9900,
    currency: 'NGN',
    interval: 'monthly',
    description: 'For growing publications that want to monetize',
    features: [
      '5 sites',
      '500 articles/mo',
      'Advanced analytics',
      'Email campaigns',
      'CTA engine',
      'AI content tools',
      'Priority support',
    ],
    limits: { sites: 5, articles: 500 },
    icon: <Zap className="h-5 w-5" />,
    popular: true,
  },
  {
    name: 'Enterprise',
    slug: 'enterprise',
    price: 29900,
    currency: 'NGN',
    interval: 'monthly',
    description: 'For agencies and large-scale publications',
    features: [
      'Unlimited sites',
      'Unlimited articles',
      'Full analytics suite',
      'Multi-team access',
      'Custom branding',
      'API access',
      'Dedicated support',
      'White-label option',
    ],
    limits: { sites: -1, articles: -1 },
    icon: <CreditCard className="h-5 w-5" />,
    popular: false,
  },
];

interface PricingPlansProps {
  currentPlanSlug?: string;
  onSelectPlan?: (slug: string) => void;
}

export function PricingPlans({ currentPlanSlug, onSelectPlan }: PricingPlansProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSelect = async (slug: string) => {
    if (slug === 'starter') {
      // Free plan - no checkout needed
      onSelectPlan?.(slug);
      return;
    }

    setLoading(slug);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: slug }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // Error handled by loading state reset
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {PLANS.map((plan) => {
        const isCurrent = currentPlanSlug === plan.slug;
        const isLoading = loading === plan.slug;

        return (
          <Card
            key={plan.slug}
            className={`relative flex flex-col ${
              plan.popular
                ? 'border-primary shadow-lg ring-2 ring-primary/20'
                : ''
            } ${isCurrent ? 'bg-muted/50' : ''}`}
          >
            {plan.popular && (
              <Badge
                className="absolute -top-3 left-1/2 -translate-x-1/2"
                variant="default"
              >
                Most Popular
              </Badge>
            )}

            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                {plan.icon}
              </div>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
              <div className="mt-4">
                {plan.price === 0 ? (
                  <span className="text-4xl font-bold">Free</span>
                ) : (
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold">
                      ₦{plan.price.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground">/mo</span>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="flex-1">
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter>
              <Button
                className="w-full"
                variant={plan.popular ? 'default' : 'outline'}
                disabled={isCurrent || isLoading}
                onClick={() => handleSelect(plan.slug)}
              >
                {isLoading ? (
                  'Processing...'
                ) : isCurrent ? (
                  'Current Plan'
                ) : plan.price === 0 ? (
                  'Get Started Free'
                ) : (
                  <span className="flex items-center gap-2">
                    Upgrade <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
