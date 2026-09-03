"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Webhook, Loader2, Plus, Trash2, Play, Check, X, Clock, ExternalLink, Eye } from "lucide-react";

interface WebhooksViewProps { siteId: string; }

export default function WebhooksView({ siteId }: WebhooksViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newEvents, setNewEvents] = useState<Set<string>>(new Set());
  const [showEvents, setShowEvents] = useState<Set<string>>(new Set());

  const { data: webhooksData, isLoading } = useQuery({
    queryKey: ["webhooks", siteId],
    queryFn: async () => {
      const res = await fetch(`/api/webhooks?siteId=${siteId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: eventsData } = useQuery({
    queryKey: ["webhook-events"],
    queryFn: async () => {
      const res = await fetch("/api/webhooks?action=events", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: deliveriesData } = useQuery({
    queryKey: ["webhook-deliveries", siteId],
    queryFn: async () => {
      const res = await fetch(`/api/webhooks?siteId=${siteId}&action=deliveries`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/webhooks", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ action: "create", siteId, url: newUrl, eventTypes: Array.from(newEvents) }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { toast({ title: "Webhook created" }); setShowCreate(false); setNewUrl(""); setNewEvents(new Set()); queryClient.invalidateQueries({ queryKey: ["webhooks"] }); },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (webhookId: string) => {
      const res = await fetch("/api/webhooks", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ action: "delete", siteId, webhookId }) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { toast({ title: "Webhook deleted" }); queryClient.invalidateQueries({ queryKey: ["webhooks"] }); },
  });

  const testMutation = useMutation({
    mutationFn: async (webhookId: string) => {
      const res = await fetch("/api/webhooks", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ action: "test", siteId, webhookId }) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (d) => toast({ title: d.success ? "Test succeeded" : "Test failed", variant: d.success ? "default" : "destructive" }),
  });

  const webhooks = webhooksData?.webhooks || [];
  const eventTypes = eventsData || [];
  const deliveries = deliveriesData?.deliveries || [];

  // Group event types by category
  const categories: Record<string, typeof eventTypes> = {};
  for (const e of eventTypes) {
    if (!categories[e.category]) categories[e.category] = [];
    categories[e.category].push(e);
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Webhook className="size-6" /> Webhook Builder</h1>
          <p className="text-muted-foreground text-sm mt-1">Configure webhooks to receive event notifications</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}><Plus className="size-3.5 mr-1" /> New Webhook</Button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Create Webhook</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://your-app.com/webhook" />
            <div className="space-y-2">
              <p className="text-xs font-medium">Event Types</p>
              {Object.entries(categories).map(([cat, events]) => (
                <div key={cat}>
                  <p className="text-[10px] text-muted-foreground mb-1">{cat}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {events.map((e: any) => (
                      <label key={e.type} className={`flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] cursor-pointer transition-colors ${newEvents.has(e.type) ? "bg-primary/10 border-primary" : "hover:bg-muted"}`}>
                        <Checkbox checked={newEvents.has(e.type)} onCheckedChange={() => {
                          const next = new Set(newEvents);
                          if (next.has(e.type)) next.delete(e.type); else next.add(e.type);
                          setNewEvents(next);
                        }} />
                        {e.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => createMutation.mutate()} disabled={!newUrl || newEvents.size === 0 || createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null} Create
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Webhooks List */}
      <div className="space-y-3">
        {isLoading ? <div className="flex justify-center py-8"><Loader2 className="size-6 animate-spin" /></div> :
          webhooks.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground"><Webhook className="size-8 mx-auto mb-2 opacity-30" /><p>No webhooks configured</p></CardContent></Card>
          ) : webhooks.map((wh: any) => (
            <Card key={wh.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={wh.isActive ? "default" : "secondary"} className="text-[10px]">{wh.isActive ? "Active" : "Paused"}</Badge>
                      <span className="text-sm font-mono truncate">{wh.url}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {(wh.eventTypes || []).map((et: string) => <Badge key={et} variant="outline" className="text-[9px]">{et}</Badge>)}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
                      <span className="text-emerald-600">{wh.successCount} ✓</span>
                      <span className="text-red-600">{wh.failCount} ✗</span>
                      {wh.lastTriggered && <span>Last: {new Date(wh.lastTriggered).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-7" onClick={() => testMutation.mutate(wh.id)} disabled={testMutation.isPending}>
                      <Play className="size-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-red-500" onClick={() => deleteMutation.mutate(wh.id)}>
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        }
      </div>

      {/* Delivery Log */}
      {deliveries.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Recent Deliveries</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1">
              {deliveries.slice(0, 10).map((d: any) => (
                <div key={d.id} className="flex items-center gap-3 p-2 rounded text-xs">
                  {d.success ? <Check className="size-3.5 text-emerald-500" /> : <X className="size-3.5 text-red-500" />}
                  <Badge variant="outline" className="text-[9px]">{d.eventType}</Badge>
                  <span className="text-muted-foreground truncate flex-1">{d.response?.slice(0, 60) || "No response"}</span>
                  <span className="text-muted-foreground">{d.statusCode}</span>
                  <span className="text-muted-foreground">{d.duration}ms</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
