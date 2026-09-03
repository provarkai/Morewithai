"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Palette, Plus, Loader2, Users, Globe, Shield, Settings, Edit } from "lucide-react";

interface WhiteLabelViewProps { siteId: string; organizationId?: string; }

export default function WhiteLabelView({ siteId, organizationId }: WhiteLabelViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newClient, setNewClient] = useState({ clientName: "", clientEmail: "" });

  const { data: portals, isLoading } = useQuery({
    queryKey: ["client-portals", organizationId],
    queryFn: async () => {
      if (!organizationId) return { portals: [] };
      const r = await fetch(`/api/saas/white-label?orgId=${organizationId}`, { credentials: "include" });
      return r.json();
    },
    enabled: !!organizationId,
  });

  const { data: config } = useQuery({
    queryKey: ["white-label-config", siteId],
    queryFn: async () => { const r = await fetch(`/api/saas/white-label?siteId=${siteId}&action=config`, { credentials: "include" }); return r.json(); },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("Organization required");
      const r = await fetch("/api/saas/white-label", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ action: "create-portal", organizationId, siteId, ...newClient, branding: { primaryColor: "#6366f1", secondaryColor: "#8b5cf6" } }) });
      if (!r.ok) throw new Error("Failed"); return r.json();
    },
    onSuccess: () => { toast({ title: "Client portal created" }); setShowCreate(false); queryClient.invalidateQueries({ queryKey: ["client-portals"] }); },
  });

  const portalList = portals?.filter?.((p: any) => !p.id) || Array.isArray(portals) ? portals : portals?.portals || [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Palette className="size-6" /> White-Label Portal</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage client portals with custom branding</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}><Plus className="size-3.5 mr-1" /> New Client</Button>
      </div>

      {/* Branding Config */}
      {config && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Settings className="size-4" /> White-Label Settings</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Primary Color</label>
                <div className="flex items-center gap-2 mt-1">
                  <div className="size-6 rounded" style={{ backgroundColor: config.branding?.primaryColor || "#6366f1" }} />
                  <span className="text-sm">{config.branding?.primaryColor || "#6366f1"}</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Custom Domain</label>
                <p className="text-sm mt-1">{config.customDomain || "Not configured"}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Login Title</label>
                <p className="text-sm mt-1">{config.branding?.loginPageTitle || "Dashboard"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Form */}
      {showCreate && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Invite Client</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input value={newClient.clientName} onChange={(e) => setNewClient({ ...newClient, clientName: e.target.value })} placeholder="Client name" />
            <Input value={newClient.clientEmail} onChange={(e) => setNewClient({ ...newClient, clientEmail: e.target.value })} placeholder="Client email" type="email" />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => createMutation.mutate()} disabled={!newClient.clientName || createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null} Create Portal
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Client Portals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? <div className="col-span-3 flex justify-center py-8"><Loader2 className="size-6 animate-spin" /></div> :
          portalList.length === 0 ? (
            <Card className="col-span-3"><CardContent className="p-8 text-center text-muted-foreground">
              <Users className="size-8 mx-auto mb-2 opacity-30" /><p>No client portals yet. Invite your first client!</p>
            </CardContent></Card>
          ) : portalList.map((portal: any) => (
            <Card key={portal.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{portal.clientName}</CardTitle>
                  <Badge variant={portal.status === "ACTIVE" ? "default" : portal.status === "INVITED" ? "secondary" : "destructive"} className="text-[10px]">
                    {portal.status}
                  </Badge>
                </div>
                <CardDescription className="text-xs">{portal.clientEmail}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-3">
                  <div className="size-4 rounded" style={{ backgroundColor: portal.branding?.primaryColor || "#6366f1" }} />
                  <span className="text-xs text-muted-foreground">{portal.branding?.customDomain || "No custom domain"}</span>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {(portal.permissions || []).slice(0, 3).map((p: string) => (
                    <Badge key={p} variant="outline" className="text-[9px]"><Shield className="size-2 mr-0.5" />{p}</Badge>
                  ))}
                </div>
                {portal.lastLoginAt && (
                  <p className="text-[10px] text-muted-foreground mt-2">Last login: {new Date(portal.lastLoginAt).toLocaleDateString()}</p>
                )}
              </CardContent>
            </Card>
          ))
        }
      </div>
    </div>
  );
}
