"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { FileText, Loader2, Sparkles, ChevronDown, ChevronUp, HelpCircle, Target, BarChart3 } from "lucide-react";

interface ContentBriefPanelProps {
  articleId?: string;
  siteId: string;
}

export function ContentBriefPanel({ articleId, siteId }: ContentBriefPanelProps) {
  const { toast } = useToast();
  const [topic, setTopic] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["outline"]));
  const [brief, setBrief] = useState<any>(null);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const body: any = { siteId };
      if (articleId) {
        body.articleId = articleId;
      } else {
        body.topic = topic;
      }
      const res = await fetch("/api/ai/content-brief", {
        method: articleId ? "GET" : "POST",
        headers: articleId ? {} : { "Content-Type": "application/json" },
        credentials: "include",
        ...(articleId ? {} : { body: JSON.stringify(body) }),
      });
      if (!res.ok) throw new Error("Failed to generate brief");
      return res.json();
    },
    onSuccess: (data) => {
      setBrief(data);
      toast({ title: "Content brief generated" });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const Section = ({ id, title, icon: Icon, children }: { id: string; title: string; icon: any; children: React.ReactNode }) => {
    const isExpanded = expandedSections.has(id);
    return (
      <div className="border rounded-lg overflow-hidden">
        <button onClick={() => toggleSection(id)} className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium hover:bg-muted/50 transition-colors">
          <span className="flex items-center gap-2"><Icon className="size-3.5 text-primary" /> {title}</span>
          {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </button>
        {isExpanded && <div className="px-3 pb-3 border-t">{children}</div>}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="size-4 text-amber-500" />
              Content Brief
            </CardTitle>
            <CardDescription>AI-generated writing brief with outline and strategy</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!brief && !articleId && (
          <div className="flex gap-2">
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter topic (e.g., 'React Server Components')"
              onKeyDown={(e) => e.key === "Enter" && topic.trim() && generateMutation.mutate()}
            />
            <Button size="sm" onClick={() => generateMutation.mutate()} disabled={!topic.trim() || generateMutation.isPending}>
              {generateMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
            </Button>
          </div>
        )}

        {!brief && articleId && (
          <Button size="sm" className="w-full" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
            {generateMutation.isPending ? <Loader2 className="size-3.5 animate-spin mr-1" /> : <Sparkles className="size-3.5 mr-1" />}
            Generate Brief for This Article
          </Button>
        )}

        {generateMutation.isPending && (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="size-4 animate-spin mr-2" /> Generating comprehensive brief...
          </div>
        )}

        {brief && (
          <ScrollArea className="max-h-[500px]">
            <div className="space-y-3">
              {/* Header */}
              <div className="rounded-lg bg-primary/5 p-3">
                <h3 className="font-semibold text-sm">{brief.suggestedTitle || brief.topic}</h3>
                <p className="text-xs text-muted-foreground mt-1">{brief.metaDescription}</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <Badge variant="secondary" className="text-[10px]">🎯 {brief.targetKeyword}</Badge>
                  <Badge variant="outline" className="text-[10px]">📝 {brief.targetWordCount} words</Badge>
                  <Badge variant="outline" className="text-[10px]">🔍 {brief.searchIntent}</Badge>
                  <Badge variant={brief.estimatedDifficulty === "EASY" ? "default" : brief.estimatedDifficulty === "HARD" ? "destructive" : "secondary"} className="text-[10px]">
                    {brief.estimatedDifficulty}
                  </Badge>
                </div>
              </div>

              {/* Secondary Keywords */}
              {brief.secondaryKeywords?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {brief.secondaryKeywords.map((kw: string, i: number) => (
                    <Badge key={i} variant="outline" className="text-[10px]">{kw}</Badge>
                  ))}
                </div>
              )}

              {/* Outline */}
              <Section id="outline" title="Article Outline" icon={Target}>
                <div className="space-y-2 pt-2">
                  {brief.outline?.map((section: any, i: number) => (
                    <div key={i} className={`text-xs ${section.level === 3 ? "ml-4" : ""}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">H{section.level}: {section.heading}</span>
                        <Badge variant="outline" className="text-[9px]">{section.estimatedWords}w</Badge>
                      </div>
                      {section.keyPoints?.length > 0 && (
                        <ul className="mt-1 space-y-0.5 text-muted-foreground ml-3">
                          {section.keyPoints.map((p: string, j: number) => (
                            <li key={j} className="flex items-start gap-1"><span className="mt-0.5">•</span> {p}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </Section>

              {/* Competitor Analysis */}
              {brief.competitorAnalysis?.length > 0 && (
                <Section id="competitors" title="Competitor Analysis" icon={BarChart3}>
                  <div className="space-y-2 pt-2">
                    {brief.competitorAnalysis.map((c: any, i: number) => (
                      <div key={i} className="rounded border p-2 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{c.domain}</span>
                          <Badge variant="outline" className="text-[9px]">{c.wordCount}w</Badge>
                        </div>
                        <p className="text-muted-foreground truncate">{c.title}</p>
                        {c.gaps?.length > 0 && (
                          <p className="text-emerald-600 text-[11px]">💡 Gap: {c.gaps[0]}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* FAQs */}
              {brief.faqs?.length > 0 && (
                <Section id="faqs" title="FAQ Opportunities" icon={HelpCircle}>
                  <div className="space-y-2 pt-2">
                    {brief.faqs.map((faq: any, i: number) => (
                      <div key={i} className="rounded border p-2 text-xs">
                        <p className="font-medium">Q: {faq.question}</p>
                        <p className="text-muted-foreground mt-0.5">A: {faq.answer}</p>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Additional Info */}
              <div className="text-xs text-muted-foreground space-y-1">
                {brief.audienceProfile && <p><span className="font-medium text-foreground">Audience:</span> {brief.audienceProfile}</p>}
                {brief.tone && <p><span className="font-medium text-foreground">Tone:</span> {brief.tone}</p>}
                {brief.callToAction && <p><span className="font-medium text-foreground">CTA:</span> {brief.callToAction}</p>}
                {brief.estimatedTraffic && <p><span className="font-medium text-foreground">Traffic:</span> {brief.estimatedTraffic}</p>}
              </div>

              <Button size="sm" variant="outline" className="w-full" onClick={() => { setBrief(null); setTopic(""); }}>
                Generate New Brief
              </Button>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
