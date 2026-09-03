"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { FlaskConical, Loader2, Sparkles, Trophy, BarChart3, Plus, X, RotateCcw } from "lucide-react";

interface HeadlineABPanelProps {
  articleId: string;
  siteId: string;
}

export function HeadlineABPanel({ articleId, siteId }: HeadlineABPanelProps) {
  const { toast } = useToast();
  const [customVariants, setCustomVariants] = useState<string[]>(["", "", "", ""]);
  const [showCustom, setShowCustom] = useState(false);

  const { data: test, isLoading } = useQuery({
    queryKey: ["headline-ab", siteId, articleId],
    queryFn: async () => {
      const res = await fetch(`/api/ai/headline-ab?siteId=${siteId}&articleId=${articleId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load A/B test");
      return res.json();
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/ai/headline-ab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "generate", siteId, articleId }),
      });
      if (!res.ok) throw new Error("Failed to generate headlines");
      return res.json();
    },
    onSuccess: (data) => {
      setCustomVariants([...(data.variants || []), "", "", "", ""].slice(0, 4));
      setShowCustom(true);
      toast({ title: "Headlines generated", description: "Review and start the A/B test" });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const createMutation = useMutation({
    mutationFn: async (variants: string[]) => {
      const res = await fetch("/api/ai/headline-ab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "create", siteId, articleId, variants: variants.filter(Boolean) }),
      });
      if (!res.ok) throw new Error("Failed to create test");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "A/B test started", description: "Headlines will be tested for 48 hours" });
      setShowCustom(false);
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const isRunning = test?.status === "RUNNING";
  const hasTest = test?.status && test.status !== "none";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <FlaskConical className="size-4 text-violet-500" />
              Headline A/B Test
            </CardTitle>
            <CardDescription>Test multiple headlines and pick the winner by CTR</CardDescription>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending || isRunning}>
              {generateMutation.isPending ? <Loader2 className="size-3.5 animate-spin mr-1" /> : <Sparkles className="size-3.5 mr-1" />}
              Generate
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="size-4 animate-spin mr-2" /> Loading...
          </div>
        ) : showCustom ? (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Headline Variants</h4>
            {customVariants.map((v, i) => (
              <div key={i} className="flex items-center gap-2">
                <Badge variant={i === 0 ? "default" : "secondary"} className="text-[10px] shrink-0">
                  {i === 0 ? "Control" : `V${i + 1}`}
                </Badge>
                <Input
                  value={v}
                  onChange={(e) => {
                    const updated = [...customVariants];
                    updated[i] = e.target.value;
                    setCustomVariants(updated);
                  }}
                  placeholder={`Variant ${i + 1} headline...`}
                  className="text-sm"
                />
                {customVariants.filter(Boolean).length > 2 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0 h-8 w-8 p-0"
                    onClick={() => setCustomVariants(customVariants.filter((_, j) => j !== i))}
                  >
                    <X className="size-3.5" />
                  </Button>
                )}
              </div>
            ))}
            {customVariants.length < 6 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCustomVariants([...customVariants, ""])}
                className="w-full"
              >
                <Plus className="size-3.5 mr-1" /> Add Variant
              </Button>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                onClick={() => createMutation.mutate(customVariants)}
                disabled={createMutation.isPending || customVariants.filter(Boolean).length < 2}
              >
                {createMutation.isPending ? <Loader2 className="size-3.5 animate-spin mr-1" /> : <FlaskConical className="size-3.5 mr-1" />}
                Start Test
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowCustom(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : hasTest ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant={isRunning ? "default" : "secondary"}>
                {isRunning ? "Running" : test.status}
              </Badge>
              {isRunning && test.startedAt && (
                <span className="text-xs text-muted-foreground">
                  Started {new Date(test.startedAt).toLocaleDateString()}
                </span>
              )}
            </div>
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2">
                {test.variants?.map((variant: any, i: number) => (
                  <div key={variant.id} className={`rounded-lg border p-3 ${variant.isWinner ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20" : ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={i === 0 ? "default" : "outline"} className="text-[10px]">
                            {i === 0 ? "Control" : `V${i + 1}`}
                          </Badge>
                          {variant.isWinner && <Trophy className="size-3.5 text-emerald-500" />}
                          {variant.isCurrent && <Badge className="text-[10px] bg-violet-500">Current</Badge>}
                        </div>
                        <p className="text-sm font-medium">{variant.text}</p>
                      </div>
                    </div>
                    {isRunning && variant.impressions > 0 && (
                      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <BarChart3 className="size-3" /> {variant.impressions} views
                        </span>
                        <span>{variant.clicks} clicks</span>
                        <span className="font-medium text-foreground">{variant.ctr.toFixed(1)}% CTR</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm space-y-3">
            <FlaskConical className="size-8 mx-auto opacity-30" />
            <p>No active headline test for this article.</p>
            <p className="text-xs">Generate AI headline variants and test them against your current title to find the winner by click-through rate.</p>
            <Button size="sm" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
              {generateMutation.isPending ? <Loader2 className="size-3.5 animate-spin mr-1" /> : <Sparkles className="size-3.5 mr-1" />}
              Generate Headlines
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
