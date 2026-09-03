"use client";

import { useState, useMemo } from "react";
import { BarChart3, Loader2, RefreshCw, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Article } from "@/lib/api";

interface ArticleQualityPanelProps {
  article: Article;
  siteId: string;
  qualityData: any;
  onRefresh: () => void;
  isLoading?: boolean;
}

const COMPONENT_CONFIG = [
  { key: "readabilityScore", label: "Readability", max: 15, desc: "Sentence structure, clarity, ease of reading" },
  { key: "depthScore", label: "Content Depth", max: 15, desc: "Thoroughness of topic coverage" },
  { key: "structureScore", label: "Structure", max: 12, desc: "Logical flow, headings, paragraphs" },
  { key: "originalityScore", label: "Originality", max: 12, desc: "Unique perspective, not generic" },
  { key: "factualScore", label: "Accuracy", max: 12, desc: "Factual correctness, citations" },
  { key: "authorityScore", label: "Authority", max: 12, desc: "Expert tone, credibility signals" },
  { key: "searchIntentScore", label: "Search Intent", max: 12, desc: "Matches what searchers want" },
  { key: "internalLinkScore", label: "Internal Links", max: 7, desc: "Links to other relevant articles" },
  { key: "monetizationReadinessScore", label: "Monetization", max: 5, desc: "Ready for ad placement" },
];

function ScoreRing({ score, size = 72 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? "text-emerald-500" : score >= 50 ? "text-amber-500" : "text-destructive";
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="-rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" className="text-muted/30" strokeWidth={4} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" className={color} strokeWidth={4} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      </svg>
      <span className={cn("absolute text-base font-bold", color)}>{score}</span>
    </div>
  );
}

export function ArticleQualityPanel({ article, siteId, qualityData, onRefresh, isLoading }: ArticleQualityPanelProps) {
  const { toast } = useToast();
  const [showBreakdown, setShowBreakdown] = useState(true);

  // Merge AI quality data with article's stored scores
  const components = useMemo(() => {
    const merged: Record<string, number> = {};
    if (qualityData?.components) {
      Object.entries(qualityData.components).forEach(([k, v]) => {
        merged[k] = typeof v === "object" ? (v as any).score ?? 0 : (v as number);
      });
    }
    // Also check top-level keys from the AI response
    if (qualityData && typeof qualityData === "object") {
      COMPONENT_CONFIG.forEach(({ key }) => {
        if (qualityData[key] != null && merged[key] == null) {
          merged[key] = qualityData[key] as number;
        }
      });
    }
    return merged;
  }, [qualityData]);

  const overallScore = qualityData?.overallScore ?? article.qualityScore ?? article.contentScore?.overallScore ?? null;
  const recommendations = qualityData?.recommendations;
  const recsList = Array.isArray(recommendations) ? recommendations : typeof recommendations === "string" ? recommendations.split("\n").filter(Boolean) : [];
  const totalMax = COMPONENT_CONFIG.reduce((s, c) => s + c.max, 0);
  const earnedTotal = COMPONENT_CONFIG.reduce((s, c) => s + (components[c.key] ?? 0), 0);
  const calculatedScore = overallScore ?? Math.round((earnedTotal / totalMax) * 100);

  return (
    <div className="space-y-4 p-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="size-4 text-amber-500" />
          <h3 className="text-sm font-semibold">Quality</h3>
        </div>
        <Button variant="ghost" size="icon" className="ml-auto size-7" onClick={onRefresh} disabled={isLoading}>
          {isLoading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
        </Button>
      </div>

      {calculatedScore != null ? (
        <>
          {/* Score Ring */}
          <div className="flex flex-col items-center py-2">
            <ScoreRing score={calculatedScore} />
            <Badge variant={calculatedScore >= 70 ? "default" : "secondary"} className="mt-2 text-[10px]">
              {calculatedScore >= 80 ? "Excellent" : calculatedScore >= 60 ? "Good" : calculatedScore >= 40 ? "Fair" : "Needs Work"}
            </Badge>
          </div>

          {/* Component Breakdown Toggle */}
          <button
            className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground hover:text-foreground"
            onClick={() => setShowBreakdown(!showBreakdown)}
          >
            <span>Component Breakdown</span>
            {showBreakdown ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>

          {showBreakdown && (
            <div className="space-y-2.5">
              {COMPONENT_CONFIG.map(({ key, label, max, desc }) => {
                const score = components[key] ?? 0;
                const pct = Math.min(100, (score / max) * 100);
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{label}</span>
                      <span className="text-[11px] font-mono">
                        <span className={score / max >= 0.7 ? "text-emerald-500" : score / max >= 0.4 ? "text-amber-500" : "text-destructive"}>
                          {score}
                        </span>
                        <span className="text-muted-foreground">/{max}</span>
                      </span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                    <p className="text-[10px] text-muted-foreground">{desc}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Recommendations */}
          {recsList.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-medium text-muted-foreground">Recommendations</h4>
              <ul className="space-y-1">
                {recsList.slice(0, 6).map((r, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <AlertTriangle className="size-3 mt-0.5 text-amber-500 shrink-0" />
                    {typeof r === "string" ? r : JSON.stringify(r)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
          <BarChart3 className="size-8 opacity-30" />
          <p className="text-xs text-center">Run a quality analysis from the AI panel to see scores here.</p>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={onRefresh} disabled={isLoading}>
            {isLoading ? <Loader2 className="size-3.5 animate-spin" /> : <BarChart3 className="size-3.5" />}
            Run Quality Analysis
          </Button>
        </div>
      )}
    </div>
  );
}
