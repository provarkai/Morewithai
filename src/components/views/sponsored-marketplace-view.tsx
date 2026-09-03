"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Handshake, DollarSign, Users, Star, ExternalLink } from "lucide-react";

interface SponsoredMarketplaceViewProps { siteId: string; }

export default function SponsoredMarketplaceView({ siteId }: SponsoredMarketplaceViewProps) {
  const { data: listings, isLoading } = useQuery({
    queryKey: ["marketplace"],
    queryFn: async () => { const r = await fetch("/api/marketplace/sponsorships?action=marketplace", { credentials: "include" }); return r.json(); },
  });

  const { data: stats } = useQuery({
    queryKey: ["sponsorship-stats", siteId],
    queryFn: async () => { const r = await fetch(`/api/marketplace/sponsorships?action=stats&siteId=${siteId}`, { credentials: "include" }); return r.json(); },
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Handshake className="size-6" /> Sponsored Content Marketplace</h1>
        <p className="text-muted-foreground text-sm mt-1">Connect brands with publishers for paid guest posts</p>
      </div>

      {stats && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total Deals", value: stats.totalSponsorships },
            { label: "Active", value: stats.activeSponsorships },
            { label: "Completed", value: stats.completedSponsorships },
            { label: "Avg Value", value: `$${stats.avgSponsorshipValue?.toFixed(0) || 0}` },
          ].map(({ label, value }) => (
            <Card key={label} className="p-3 text-center">
              <div className="text-xl font-bold">{value}</div>
              <div className="text-[10px] text-muted-foreground">{label}</div>
            </Card>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="size-6 animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Open Sponsorship Opportunities</h2>
          {(listings || []).length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">
              <Handshake className="size-8 mx-auto mb-2 opacity-30" /><p>No marketplace listings yet. Sponsorships will appear here.</p>
            </CardContent></Card>
          ) : (listings || []).map((listing: any) => (
            <Card key={listing.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={listing.type === "SPONSORSHIP_REQUEST" ? "default" : "secondary"} className="text-[10px]">
                        {listing.type === "SPONSORSHIP_REQUEST" ? "Brand Request" : "Publisher"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">{listing.category}</Badge>
                    </div>
                    <h3 className="text-sm font-semibold">{listing.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{listing.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-bold text-emerald-600">${listing.budget || listing.price || 0}</div>
                    <Button size="sm" variant="outline" className="mt-1 text-[10px]">
                      Apply <ExternalLink className="size-2.5 ml-1" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
                  {listing.traffic && <span><Users className="size-2.5 inline mr-0.5" />{listing.traffic}</span>}
                  {listing.rating > 0 && <span><Star className="size-2.5 inline mr-0.5" />{listing.rating}/5</span>}
                  <span>{new Date(listing.createdAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
