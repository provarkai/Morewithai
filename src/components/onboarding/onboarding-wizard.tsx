"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Globe,
  Rss,
  Bot,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Sparkles,
  Newspaper,
  BarChart3,
} from "lucide-react";
import { createSite, createFeed } from "@/lib/api";

interface OnboardingWizardProps {
  onComplete: () => void;
}

type Step = "welcome" | "site" | "feed" | "done";

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("welcome");
  const [siteName, setSiteName] = useState("");
  const [siteSlug, setSiteSlug] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [feedCategory, setFeedCategory] = useState("AI");
  const [createdSiteId, setCreatedSiteId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const createSiteMutation = useMutation({
    mutationFn: () => createSite({ name: siteName, slug: siteSlug || siteName.toLowerCase().replace(/[^a-z0-9]+/g, "-") }),
    onSuccess: (site) => {
      setCreatedSiteId(site.id);
      queryClient.invalidateQueries({ queryKey: ["sites"] });
      setStep("feed");
    },
    onError: (err: any) => setError(err.message || "Failed to create site"),
  });

  const createFeedMutation = useMutation({
    mutationFn: async () => {
      if (!createdSiteId || !feedUrl) return Promise.resolve();
      return createFeed(createdSiteId, { url: feedUrl, category: feedCategory, name: feedUrl.split("/").slice(-2).join("/") || "Feed" });
    },
    onSuccess: () => {
      setStep("done");
    },
    onError: (err: any) => setError(err.message || "Failed to add feed"),
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40);
  };

  return (
    <div className="flex min-h-svh items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-lg">
        {step === "welcome" && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                <Sparkles className="size-7" />
              </div>
              <CardTitle className="text-2xl">Welcome to MoreWithAI</CardTitle>
              <CardDescription className="text-base">
                Your AI-powered content publishing platform. Let&apos;s get you set up in 3 easy steps.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                {[
                  { icon: Globe, label: "Create your site", desc: "Set up your blog identity" },
                  { icon: Rss, label: "Add content sources", desc: "Connect RSS feeds or URLs" },
                  { icon: Bot, label: "Start publishing", desc: "AI writes, you approve" },
                ].map(({ icon: Icon, label, desc }, i) => (
                  <div key={label} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        <Badge variant="outline" className="mr-2 text-[10px]">{i + 1}</Badge>
                        {label}
                      </p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button className="w-full gap-2" onClick={() => setStep("site")}>
                Get Started
                <ArrowRight className="size-4" />
              </Button>
            </CardContent>
          </>
        )}

        {step === "site" && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="size-5" />
                Create Your Site
              </CardTitle>
              <CardDescription>Give your blog a name. You can always change this later.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="site-name">Site Name</Label>
                <Input
                  id="site-name"
                  placeholder="My AI Blog"
                  value={siteName}
                  onChange={(e) => {
                    setSiteName(e.target.value);
                    setSiteSlug(generateSlug(e.target.value));
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="site-slug">URL Slug</Label>
                <div className="flex items-center gap-0">
                  <span className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-l-md border border-r-0">morewithai.online/</span>
                  <Input
                    id="site-slug"
                    value={siteSlug}
                    onChange={(e) => setSiteSlug(generateSlug(e.target.value))}
                    className="rounded-l-none"
                  />
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("welcome")}>
                  <ArrowLeft className="size-4 mr-1" /> Back
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={() => createSiteMutation.mutate()}
                  disabled={!siteName.trim() || createSiteMutation.isPending}
                >
                  {createSiteMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Globe className="size-4" />}
                  Create Site
                </Button>
              </div>
            </CardContent>
          </>
        )}

        {step === "feed" && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Rss className="size-5" />
                Add Content Source
              </CardTitle>
              <CardDescription>Add an RSS feed to start importing articles. You can skip this and add feeds later.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="feed-url">RSS Feed URL</Label>
                <Input
                  id="feed-url"
                  placeholder="https://example.com/feed.xml"
                  value={feedUrl}
                  onChange={(e) => setFeedUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="feed-category">Default Category</Label>
                <Input
                  id="feed-category"
                  placeholder="AI"
                  value={feedCategory}
                  onChange={(e) => setFeedCategory(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Separator />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("site")}>
                  <ArrowLeft className="size-4 mr-1" /> Back
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep("done")}
                >
                  Skip for now
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={() => createFeedMutation.mutate()}
                  disabled={!feedUrl.trim() || createFeedMutation.isPending}
                >
                  {createFeedMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Rss className="size-4" />}
                  Add Feed
                </Button>
              </div>
            </CardContent>
          </>
        )}

        {step === "done" && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-7" />
              </div>
              <CardTitle className="text-2xl">You&apos;re All Set!</CardTitle>
              <CardDescription className="text-base">
                Your site is ready. Here&apos;s what you can do next:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                {[
                  { icon: Newspaper, label: "View your articles", desc: "See imported content and start editing" },
                  { icon: Bot, label: "Generate with AI", desc: "Let AI rewrite and optimize your content" },
                  { icon: BarChart3, label: "Check the dashboard", desc: "Monitor traffic, SEO scores, and revenue" },
                ].map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button className="w-full gap-2" onClick={onComplete}>
                Go to Dashboard
                <ArrowRight className="size-4" />
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
