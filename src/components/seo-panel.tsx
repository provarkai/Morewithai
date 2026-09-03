"use client";

import { useState } from "react";
import { Search, Tag, FileText, Sparkles, Save, Loader2, Copy, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import { Separator } from "./ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { updateArticle } from "@/lib/api";
import type { Article } from "@/lib/api";

interface SeoPanelProps {
  article: Article;
  siteId: string;
}

export function SeoPanel({ article, siteId }: SeoPanelProps) {
  const { toast } = useToast();
  const [localTitle, setLocalTitle] = useState("");
  const [localDesc, setLocalDesc] = useState("");
  const [localKeywords, setLocalKeywords] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const seoTitle = localTitle || article.seoTitle || "";
  const seoDesc = localDesc || article.seoDescription || "";
  const seoKw = localKeywords || article.seoKeywords || "";

  const saveMutation = useMutation({
    mutationFn: (data: { id: string; siteId: string; seoTitle?: string; seoDescription?: string; seoKeywords?: string; adsenseEnabled?: boolean }) =>
      updateArticle(data),
    onSuccess: () => {
      setLocalTitle(""); setLocalDesc(""); setLocalKeywords("");
      toast({ title: "SEO data saved" });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleSave = () => {
    saveMutation.mutate({
      id: article.id,
      siteId,
      seoTitle: localTitle || article.seoTitle || undefined,
      seoDescription: localDesc || article.seoDescription || undefined,
      seoKeywords: localKeywords || article.seoKeywords || undefined,
    });
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const titleLen = seoTitle.length;
  const descLen = seoDesc.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="size-4 text-emerald-500" />
            SEO Metadata
          </CardTitle>
          {article.seoTitle && (
            <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <Sparkles className="size-3 mr-1" /> Generated
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Meta Title */}
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-1.5 text-xs">
              <FileText className="size-3.5" /> Meta Title
            </Label>
            <span className={`text-xs ${titleLen >= 50 && titleLen <= 60 ? "text-emerald-500" : "text-amber-500"}`}>
              {titleLen}/60
            </span>
          </div>
          <Input
            placeholder="SEO-optimized title (50-60 chars)"
            value={seoTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            className="text-sm"
          />
        </div>

        {/* Meta Description */}
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-1.5 text-xs">
              <FileText className="size-3.5" /> Meta Description
            </Label>
            <span className={`text-xs ${descLen >= 140 && descLen <= 160 ? "text-emerald-500" : "text-amber-500"}`}>
              {descLen}/160
            </span>
          </div>
          <textarea
            placeholder="Compelling description with keywords (140-160 chars)"
            value={seoDesc}
            onChange={(e) => setLocalDesc(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          />
        </div>

        {/* Keywords */}
        <div className="grid gap-2">
          <Label className="flex items-center gap-1.5 text-xs">
            <Tag className="size-3.5" /> Focus Keywords
          </Label>
          <Input
            placeholder="keyword1, keyword2, keyword3"
            value={seoKw}
            onChange={(e) => setLocalKeywords(e.target.value)}
            className="text-sm"
          />
          {seoKw && (
            <div className="flex flex-wrap gap-1">
              {seoKw.split(",").map((kw, i) => (
                <Badge key={i} variant="secondary" className="text-xs">{kw.trim()}</Badge>
              ))}
            </div>
          )}
        </div>

        {/* Schema Markup */}
        {article.seoSchema && (
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5 text-xs">Schema Markup (JSON-LD)</Label>
              <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs" onClick={() => copyToClipboard(article.seoSchema!, "schema")}>
                {copied === "schema" ? <Check className="size-3" /> : <Copy className="size-3" />}
                {copied === "schema" ? "Copied" : "Copy"}
              </Button>
            </div>
            <pre className="rounded-md bg-muted p-3 text-xs overflow-auto max-h-32 text-muted-foreground">
              {article.seoSchema}
            </pre>
          </div>
        )}

        <Separator />

        {/* AdSense Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm">Auto-Insert AdSense Ads</Label>
            <p className="text-xs text-muted-foreground">Insert ad blocks when publishing</p>
          </div>
          <Switch
            checked={article.adsenseEnabled}
            onCheckedChange={(checked) => {
              updateArticle({ id: article.id, siteId, adsenseEnabled: checked });
            }}
          />
        </div>

        <Button onClick={handleSave} disabled={saveMutation.isPending} size="sm" className="w-full gap-1.5">
          {saveMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          Save SEO Data
        </Button>
      </CardContent>
    </Card>
  );
}
