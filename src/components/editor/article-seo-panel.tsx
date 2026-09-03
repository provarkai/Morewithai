"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Search, Tag, FileText, Sparkles, Save, Loader2, Copy, Check,
  CheckCircle2, XCircle, AlertTriangle, RefreshCw, ChevronDown, ChevronUp,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Article } from "@/lib/api";

interface SeoCheck {
  name: string;
  passed: boolean;
  score: number;
  maxScore: number;
  message: string;
}

interface ArticleSeoPanelProps {
  article: Article;
  siteId: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  adsenseEnabled: boolean;
  seoSchema: string | null;
  onSeoTitleChange: (val: string) => void;
  onSeoDescriptionChange: (val: string) => void;
  onSeoKeywordsChange: (val: string) => void;
  onAdsenseChange: (val: boolean) => void;
  onSave: (data: Record<string, unknown>) => void;
  onApplyFix?: (fix: string) => void;
  isSaving?: boolean;
}

function computeSeoChecks(article: Article, seoTitle: string, seoDesc: string, seoKw: string): SeoCheck[] {
  const title = seoTitle || article.rewrittenTitle || article.title || "";
  const content = article.rewrittenContent || article.originalContent || "";
  const slug = article.slug || "";
  const kw = seoKw.split(",")[0]?.trim().toLowerCase() || "";
  const contentLower = content.toLowerCase();
  const textContent = content.replace(/<[^>]*>/g, "");
  const words = textContent.split(/\s+/).filter(Boolean).length;
  const headings = (content.match(/<h[2-6][^>]*>/gi) || []).length;
  const images = (content.match(/<img[\s>]/gi) || []).length;
  const extLinks = (content.match(/<a[^>]+href=["'](https?:\/\/)[^"']+["']/gi) || []).length;
  const kwInTitle = kw ? title.toLowerCase().includes(kw) : false;
  const kwCount = kw ? (contentLower.match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")) || []).length : 0;

  return [
    {
      name: "Title length (30-60)",
      passed: title.length >= 30 && title.length <= 60,
      score: title.length >= 30 && title.length <= 60 ? 10 : title.length >= 20 && title.length <= 70 ? 6 : 2,
      maxScore: 10,
      message: `${title.length} characters (ideal 30-60)`,
    },
    {
      name: "Meta description (120-160)",
      passed: seoDesc.length >= 120 && seoDesc.length <= 160,
      score: seoDesc.length >= 100 ? 10 : 3,
      maxScore: 10,
      message: seoDesc.length > 0 ? `${seoDesc.length} characters (ideal 120-160)` : "Missing meta description",
    },
    {
      name: "Keyword in title",
      passed: kwInTitle,
      score: kwInTitle ? 10 : 3,
      maxScore: 10,
      message: kwInTitle ? "Primary keyword found in title" : "Add primary keyword to the title",
    },
    {
      name: "Keyword usage (2-5x)",
      passed: kwCount >= 2 && kwCount <= 5,
      score: kwCount >= 2 ? 10 : 4,
      maxScore: 10,
      message: `Keyword appears ${kwCount} time${kwCount !== 1 ? "s" : ""} (ideal 2-5)`,
    },
    {
      name: "Content length (800+ words)",
      passed: words >= 800,
      score: words >= 800 ? 10 : words >= 300 ? 6 : 2,
      maxScore: 10,
      message: `${words} words (ideal 800+)`,
    },
    {
      name: "Heading structure (3+)",
      passed: headings >= 3,
      score: Math.min(10, headings * 2),
      maxScore: 10,
      message: `${headings} subheading${headings !== 1 ? "s" : ""} found (ideal 4+)`,
    },
    {
      name: "URL slug present",
      passed: slug.length > 0,
      score: slug.length > 0 ? 10 : 0,
      maxScore: 10,
      message: slug ? `/blog/${slug}` : "No URL slug set",
    },
    {
      name: "Images present",
      passed: images >= 1,
      score: images >= 1 ? 10 : 5,
      maxScore: 10,
      message: `${images} image${images !== 1 ? "s" : ""} found`,
    },
    {
      name: "Schema markup",
      passed: !!article.seoSchema,
      score: article.seoSchema ? 10 : 3,
      maxScore: 10,
      message: article.seoSchema ? "JSON-LD schema present" : "Add schema markup for rich results",
    },
    {
      name: "External links",
      passed: extLinks >= 1,
      score: extLinks >= 1 ? 10 : 5,
      maxScore: 10,
      message: `${extLinks} external link${extLinks !== 1 ? "s" : ""} found`,
    },
  ];
}

function ScoreRing({ score, size = 72 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? "text-emerald-500" : score >= 50 ? "text-amber-500" : "text-destructive";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="-rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" className="text-muted/30" strokeWidth={4} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke="currentColor" className={color}
          strokeWidth={4} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <span className={cn("absolute text-base font-bold", color)}>{score}</span>
    </div>
  );
}

export function ArticleSeoPanel({
  article, siteId, seoTitle, seoDescription, seoKeywords,
  adsenseEnabled, seoSchema, onSeoTitleChange, onSeoDescriptionChange,
  onSeoKeywordsChange, onAdsenseChange, onSave, onApplyFix, isSaving,
}: ArticleSeoPanelProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [showChecks, setShowChecks] = useState(true);
  const [showSchema, setShowSchema] = useState(false);

  const checks = useMemo(
    () => computeSeoChecks(article, seoTitle, seoDescription, seoKeywords),
    [article, seoTitle, seoDescription, seoKeywords]
  );
  const totalScore = Math.min(100, Math.round(checks.reduce((s, c) => s + c.score, 0) / checks.length * 10));
  const passedCount = checks.filter((c) => c.passed).length;

  const handleSave = () => {
    onSave({ seoTitle, seoDescription, seoKeywords, adsenseEnabled });
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const titleLen = seoTitle.length;
  const descLen = seoDescription.length;
  const previewTitle = seoTitle || article.rewrittenTitle || article.title || "Article Title";
  const previewDesc = seoDescription || "Meta description will appear here...";
  const previewUrl = article.slug ? `/blog/${article.slug}` : "/blog/article-slug";

  return (
    <div className="space-y-4 p-3">
      {/* Header + Score */}
      <div className="flex items-center gap-3">
        <Search className="size-4 text-emerald-500" />
        <h3 className="text-sm font-semibold">SEO</h3>
        <div className="ml-auto">
          <ScoreRing score={totalScore} size={48} />
        </div>
      </div>

      {/* Google Preview */}
      <div className="rounded-lg border p-3 bg-white dark:bg-zinc-900 space-y-1">
        <p className="text-blue-700 dark:text-blue-400 text-sm truncate cursor-pointer hover:underline">
          {previewTitle}
        </p>
        <p className="text-green-700 dark:text-green-400 text-xs truncate">{previewUrl}</p>
        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{previewDesc}</p>
      </div>

      {/* Score Summary Bar */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{passedCount}/{checks.length} checks passed</span>
        <span className={cn("font-medium", totalScore >= 70 ? "text-emerald-500" : totalScore >= 50 ? "text-amber-500" : "text-destructive")}>
          {totalScore}/100
        </span>
      </div>
      <Progress value={totalScore} className="h-1.5" />

      {/* Checklist Toggle */}
      <button
        className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground hover:text-foreground"
        onClick={() => setShowChecks(!showChecks)}
      >
        <span>SEO Checklist</span>
        {showChecks ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
      </button>

      {showChecks && (
        <div className="space-y-1.5">
          {checks.map((check) => (
            <div key={check.name} className="flex items-start gap-2 text-xs">
              {check.passed ? (
                <CheckCircle2 className="size-3.5 text-emerald-500 mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle className="size-3.5 text-amber-500 mt-0.5 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={check.passed ? "text-foreground" : "text-amber-700 dark:text-amber-400"}>{check.name}</p>
                <p className="text-[10px] text-muted-foreground">{check.message}</p>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono shrink-0">{check.score}/{check.maxScore}</span>
            </div>
          ))}
        </div>
      )}

      <Separator />

      {/* Meta Title */}
      <div className="grid gap-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs flex items-center gap-1"><FileText className="size-3" /> Meta Title</Label>
          <span className={cn("text-[10px]", titleLen >= 50 && titleLen <= 60 ? "text-emerald-500" : "text-amber-500")}>
            {titleLen}/60
          </span>
        </div>
        <Input
          value={seoTitle}
          onChange={(e) => onSeoTitleChange(e.target.value)}
          placeholder="SEO-optimized title (50-60 chars)"
          className="h-8 text-xs"
        />
      </div>

      {/* Meta Description */}
      <div className="grid gap-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs flex items-center gap-1"><FileText className="size-3" /> Meta Description</Label>
          <span className={cn("text-[10px]", descLen >= 140 && descLen <= 160 ? "text-emerald-500" : "text-amber-500")}>
            {descLen}/160
          </span>
        </div>
        <Textarea
          value={seoDescription}
          onChange={(e) => onSeoDescriptionChange(e.target.value)}
          placeholder="Compelling description with keywords (140-160 chars)"
          className="text-xs min-h-[60px] resize-none"
        />
      </div>

      {/* Keywords */}
      <div className="grid gap-1.5">
        <Label className="text-xs flex items-center gap-1"><Tag className="size-3" /> Focus Keywords</Label>
        <Input
          value={seoKeywords}
          onChange={(e) => onSeoKeywordsChange(e.target.value)}
          placeholder="keyword1, keyword2, keyword3"
          className="h-8 text-xs"
        />
        {seoKeywords && (
          <div className="flex flex-wrap gap-1">
            {seoKeywords.split(",").map((kw, i) => (
              <Badge key={i} variant="secondary" className="text-[10px]">{kw.trim()}</Badge>
            ))}
          </div>
        )}
      </div>

      {/* Schema Markup */}
      {seoSchema && (
        <div className="grid gap-1.5">
          <button
            className="flex items-center justify-between w-full text-xs font-medium"
            onClick={() => setShowSchema(!showSchema)}
          >
            <span>Schema (JSON-LD)</span>
            {showSchema ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>
          {showSchema && (
            <>
              <pre className="rounded-md bg-muted p-2 text-[10px] overflow-auto max-h-32 text-muted-foreground font-mono">{seoSchema}</pre>
              <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 w-full" onClick={() => copyToClipboard(seoSchema, "schema")}>
                {copied === "schema" ? <Check className="size-2.5" /> : <Copy className="size-2.5" />}
                {copied === "schema" ? "Copied" : "Copy JSON-LD"}
              </Button>
            </>
          )}
        </div>
      )}

      <Separator />

      {/* AdSense */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-xs">Auto-Insert AdSense</Label>
          <p className="text-[10px] text-muted-foreground">Insert ad blocks when publishing</p>
        </div>
        <Switch checked={adsenseEnabled} onCheckedChange={onAdsenseChange} />
      </div>

      <Button onClick={handleSave} disabled={isSaving} size="sm" className="w-full gap-1.5">
        {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
        Save SEO Data
      </Button>
    </div>
  );
}
