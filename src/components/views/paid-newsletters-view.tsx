"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Mail, Plus, Loader2, Users, DollarSign, TrendingUp, Lock, Unlock } from "lucide-react";

interface PaidNewslettersViewProps { siteId: string; }

export default function PaidNewslettersView({ siteId }: PaidNewslettersViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newTier, setNewTier] = useState({ name: "", price: 0, interval: "MONTHLY" as const });

  const { data: tiers, isLoading } = useQuery({
    queryKey: ["newsletter-tiers", siteId],
    queryFn: async () => { const r = await fetch(`/api/monetization/newsletters?siteId=${siteId}`, { credentials: "include" }); return r.json(); },
  });

  const { data: analytics } = useQuery({
    queryKey: ["newsletter-analytics", siteId],
    queryFn: async () => { const r = await fetch(`/api/monetization/newsletters?siteId=${siteId}&action=analytics`, { credentials: "include" }); return r.json(); },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/monetization/newsletters", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ siteId, ...newTier, features: ["Premium content", "Exclusive insights", "Early access"] }) });
      if (!r.ok) throw new Error("Failed"); return r.json();
    },
    onSuccess: () => { toast({ title: "Tier created" }); setShowCreate(false); queryClient.invalidateQueries({ queryKey: ["newsletter-tiers"] }); },
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Mail className="size-6" /> Paid Newsletters</h1>
          <p className="text-muted-foreground text-sm mt-1">Stripe-gated premium content tiers</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}><Plus className="size-3.5 mr-1" /> New Tier</Button>
      </div>

      {/* Analytics */}
      {analytics && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total Subs", value: analytics.totalSubscribers, icon: Users, color: "text-blue-500" },
            { label: "Paid Subs", value: analytics.paidSubscribers, icon: Lock, color: "text-emerald-500" },
            { label: "Monthly Rev", value: `$${analytics.monthlyRevenue}`, icon: DollarSign, color: "text-violet-500" },
            { label: "Free Subs", value: analytics.freeSubscribers, icon: Unlock, color: "text-amber-500" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="p-3 text-center">
              <Icon className={`size-5 mx-auto mb-1 ${color}`} />
              <div className="text-xl font-bold">{value}</div>
              <div className="text-[10px] text-muted-foreground">{label}</div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Form */}
      {showCreate && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Create Newsletter Tier</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input value={newTier.name} onChange={(e) => setNewTier({ ...newTier, name: e.target.value })} placeholder="Tier name (e.g., Premium Weekly)" />
            <div className="flex gap-2">
              <Input type="number" value={newTier.price} onChange={(e) => setNewTier({ ...newTier, price: Number(e.target.value) })} placeholder="Price" className="w-32" />
              <select className="border rounded-md px-3 text-sm" value={newTier.interval} onChange={(e) => setNewTier({ ...newTier, interval: e.target.value as any })}>
                <option value="MONTHLY">Monthly</option><option value="YEARLY">Yearly</option><option value="LIFETIME">Lifetime</option>
              </select>
            </div>
            <Button size="sm" onClick={() => createMutation.mutate()} disabled={!newTier.name || createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null} Create Tier
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? <div className="col-span-3 flex justify-center py-8"><Loader2 className="size-6 animate-spin" /></div> :
          (tiers || []).map((tier: any) => (
            <Card key={tier.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{tier.name}</CardTitle>
                  <Badge variant={tier.isActive ? "default" : "secondary"}>{tier.interval}</Badge>
                </div>
                <CardDescription>{tier.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-3">${tier.price}<span className="text-sm text-muted-foreground font-normal">/{tier.interval.toLowerCase()}</span></div>
                <div className="space-y-1.5">
                  {(tier.features || []).map((f: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs"><span className="text-emerald-500">✓</span> {f}</div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span><Users className="size-3 inline mr-1" />{tier.subscriberCount} subscribers</span>
                  <span className="font-medium">${tier.price * tier.subscriberCount}/mo</span>
                </div>
              </CardContent>
            </Card>
          ))
        }
      </div>
    </div>
  );
}
