"use client";

import { useState } from "react";
import {
  Sparkles,
  Search,
  List,
  PenLine,
  BarChart3,
  Link2,
  Tags,
  Loader2,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ArticleAiPanelProps {
  articleId: string;
  siteId: string;
  title: string;
  content: string;
  onResearchComplete?: (data: any) => void;
  onOutlineComplete?: (data: any) => void;
  onGenerateComplete?: (data: any) => void;
  onSeoComplete?: (data: any) => void;
  onQualityComplete?: (data: any) => void;
  onLinksComplete?: (data: any) => void;
  onTaxonomyComplete?: (data: any) => void;
}

type AiSection = 'research' | 'outline' | 'generate' | 'seo' | 'quality' | 'links' | 'taxonomy';

interface SectionState {
  loading: boolean;
  result: any;
  error: string | null;
}

const SECTION_CONFIG: Record<AiSection, { label: string; icon: React.ElementType; description: string; color: string }> = {
  research: { label: 'Research', icon: Search, description: 'Analyze sources & find original angles', color: 'text-blue-500' },
  outline: { label: 'Outline', icon: List, description: 'Generate structured article outline', color: 'text-indigo-500' },
  generate: { label: 'Generate', icon: PenLine, description: 'Generate or improve article content', color: 'text-violet-500' },
  seo: { label: 'SEO Analysis', icon: Search, description: 'Analyze SEO & generate metadata', color: 'text-emerald-500' },
  quality: { label: 'Quality Score', icon: BarChart3, description: 'Score content quality (9 components)', color: 'text-amber-500' },
  links: { label: 'Internal Links', icon: Link2, description: 'Suggest internal links', color: 'text-cyan-500' },
  taxonomy: { label: 'Categories & Tags', icon: Tags, description: 'Suggest categories & tags', color: 'text-pink-500' },
};

export function ArticleAiPanel({
  articleId,
  siteId,
  title,
  content,
  onResearchComplete,
  onOutlineComplete,
  onGenerateComplete,
  onSeoComplete,
  onQualityComplete,
  onLinksComplete,
  onTaxonomyComplete,
}: ArticleAiPanelProps) {
  const { toast } = useToast();
  const [sections, setSections] = useState<Record<AiSection, SectionState>>({
    research: { loading: false, result: null, error: null },
    outline: { loading: false, result: null, error: null },
    generate: { loading: false, result: null, error: null },
    seo: { loading: false, result: null, error: null },
    quality: { loading: false, result: null, error: null },
    links: { loading: false, result: null, error: null },
    taxonomy: { loading: false, result: null, error: null },
  });

  // Generation options
  const [genMode, setGenMode] = useState("informative");
  const [genTone, setGenTone] = useState("professional");
  const [genLength, setGenLength] = useState("medium");
  const [customPrompt, setCustomPrompt] = useState("");

  const updateSection = (key: AiSection, update: Partial<SectionState>) => {
    setSections((prev) => ({ ...prev, [key]: { ...prev[key], ...update } }));
  };

  const runAi = async (section: AiSection, endpoint: string, body: Record<string, unknown>) => {
    updateSection(section, { loading: true, error: null });
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...body, siteId, articleId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `AI ${section} failed`);
      updateSection(section, { loading: false, result: data });
      toast({ title: `${SECTION_CONFIG[section].label} complete` });

      // Call completion callbacks
      const callbacks: Record<AiSection, ((data: any) => void) | undefined> = {
        research: onResearchComplete,
        outline: onOutlineComplete,
        generate: onGenerateComplete,
        seo: onSeoComplete,
        quality: onQualityComplete,
        links: onLinksComplete,
        taxonomy: onTaxonomyComplete,
      };
      callbacks[section]?.(data);
    } catch (err: any) {
      updateSection(section, { loading: false, error: err.message });
      toast({ title: 'AI Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleRun = (section: AiSection) => {
    const base = { title, content };
    switch (section) {
      case 'research':
        runAi(section, '/api/ai/research', { ...base, sourceUrl: '' });
        break;
      case 'outline':
        runAi(section, '/api/ai/outline', { ...base, sections: sections.research.result });
        break;
      case 'generate':
        runAi(section, '/api/ai/generate', {
          ...base,
          mode: genMode,
          tone: genTone,
          length: genLength,
          customPrompt: customPrompt || undefined,
          outline: sections.outline.result?.outline,
        });
        break;
      case 'seo':
        runAi(section, '/api/ai/seo', { ...base, slug: '' });
        break;
      case 'quality':
        runAi(section, '/api/ai/quality', { ...base });
        break;
      case 'links':
        runAi(section, '/api/ai/internal-links', { ...base });
        break;
      case 'taxonomy':
        runAi(section, '/api/ai/taxonomy', { ...base });
        break;
    }
  };

  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="size-4 text-violet-500" />
        <h3 className="text-sm font-semibold">AI Command Center</h3>
      </div>

      <Accordion type="multiple" defaultValue={[]} className="w-full">
        {(Object.keys(SECTION_CONFIG) as AiSection[]).map((key) => {
          const cfg = SECTION_CONFIG[key];
          const state = sections[key];
          const Icon = cfg.icon;
          return (
            <AccordionItem key={key} value={key} className="border rounded-lg px-1">
              <AccordionTrigger className="py-2.5 hover:no-underline">
                <div className="flex items-center gap-2 text-left">
                  <Icon className={cn("size-4", cfg.color)} />
                  <div>
                    <span className="text-sm font-medium">{cfg.label}</span>
                    <p className="text-[11px] text-muted-foreground leading-tight">{cfg.description}</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pb-1">
                  {/* Generation-specific options */}
                  {key === 'generate' && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-[11px]">Mode</Label>
                          <Select value={genMode} onValueChange={setGenMode}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="informative">Informative</SelectItem>
                              <SelectItem value="opinion">Opinion</SelectItem>
                              <SelectItem value="howto">How-To</SelectItem>
                              <SelectItem value="listicle">Listicle</SelectItem>
                              <SelectItem value="comparison">Comparison</SelectItem>
                              <SelectItem value="review">Review</SelectItem>
                              <SelectItem value="news">News</SelectItem>
                              <SelectItem value="storytelling">Story</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[11px]">Tone</Label>
                          <Select value={genTone} onValueChange={setGenTone}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="professional">Professional</SelectItem>
                              <SelectItem value="casual">Casual</SelectItem>
                              <SelectItem value="formal">Formal</SelectItem>
                              <SelectItem value="conversational">Conversational</SelectItem>
                              <SelectItem value="persuasive">Persuasive</SelectItem>
                              <SelectItem value="academic">Academic</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[11px]">Length</Label>
                          <Select value={genLength} onValueChange={setGenLength}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="short">Short</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="long">Long</SelectItem>
                              <SelectItem value="comprehensive">Deep Dive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-[11px]">Custom Instructions (optional)</Label>
                        <Textarea
                          value={customPrompt}
                          onChange={(e) => setCustomPrompt(e.target.value)}
                          placeholder="Additional instructions for the AI..."
                          className="text-xs min-h-[60px]"
                        />
                      </div>
                    </div>
                  )}

                  {/* Run button */}
                  <Button
                    size="sm"
                    className={cn("w-full gap-1.5", key === 'generate' && "bg-violet-600 hover:bg-violet-700 text-white")}
                    onClick={() => handleRun(key)}
                    disabled={state.loading || (!title && !content)}
                  >
                    {state.loading ? <Loader2 className="size-3.5 animate-spin" /> : <Icon className="size-3.5" />}
                    {state.loading ? `Running ${cfg.label}...` : `Run ${cfg.label}`}
                  </Button>

                  {/* Error */}
                  {state.error && (
                    <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-2.5 text-xs text-destructive">
                      <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
                      {state.error}
                    </div>
                  )}

                  {/* Result summary */}
                  {state.result && !state.loading && (
                    <div className="rounded-md bg-muted p-3 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                        <CheckCircle2 className="size-3.5" /> {cfg.label} Complete
                      </div>
                      {renderResult(key, state.result)}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}

function renderResult(section: AiSection, data: any) {
  switch (section) {
    case 'research':
      return (
        <div className="text-xs space-y-1.5">
          {data.originalAngle && <p><span className="font-medium">Angle:</span> {data.originalAngle}</p>}
          {data.keyPoints && (
            <div>
              <span className="font-medium">Key Points:</span>
              <ul className="list-disc list-inside mt-0.5 space-y-0.5 text-muted-foreground">
                {(Array.isArray(data.keyPoints) ? data.keyPoints : []).slice(0, 5).map((p: string, i: number) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    case 'outline':
      return (
        <div className="text-xs space-y-1.5">
          {data.outline && Array.isArray(data.outline) && (
            <ul className="space-y-0.5">
              {data.outline.slice(0, 8).map((s: any, i: number) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-muted-foreground font-mono">{i + 1}.</span>
                  <span>{typeof s === 'string' ? s : s.heading || s.title || JSON.stringify(s)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    case 'generate':
      return (
        <div className="text-xs space-y-1">
          {data.title && <p><span className="font-medium">Title:</span> {data.title}</p>}
          {data.wordCount && <p><span className="font-medium">Words:</span> {data.wordCount}</p>}
          {data.content && (
            <p className="text-muted-foreground">Content generated — check the editor.</p>
          )}
        </div>
      );
    case 'seo':
      return (
        <div className="text-xs space-y-1.5">
          {data.overallScore != null && (
            <div className="flex items-center gap-2">
              <span className="font-medium">Score:</span>
              <Badge variant={data.overallScore >= 70 ? 'default' : 'secondary'}>{data.overallScore}/100</Badge>
            </div>
          )}
          {data.seoTitle && <p><span className="font-medium">SEO Title:</span> {data.seoTitle}</p>}
          {data.metaDescription && <p className="text-muted-foreground line-clamp-2"><span className="font-medium">Meta Desc:</span> {data.metaDescription}</p>}
          {data.recommendations && data.recommendations.length > 0 && (
            <div>
              <span className="font-medium">Tips:</span>
              <ul className="list-disc list-inside mt-0.5 text-muted-foreground space-y-0.5">
                {data.recommendations.slice(0, 3).map((r: string, i: number) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}
        </div>
      );
    case 'quality':
      return (
        <div className="text-xs space-y-1.5">
          {data.overallScore != null && (
            <div className="flex items-center gap-2">
              <span className="font-medium">Score:</span>
              <Badge variant={data.overallScore >= 70 ? 'default' : 'secondary'}>{data.overallScore}/100</Badge>
            </div>
          )}
          {data.components && typeof data.components === 'object' && (
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              {Object.entries(data.components).map(([k, v]: [string, any]) => (
                <div key={k} className="flex justify-between">
                  <span className="capitalize text-muted-foreground">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <span className="font-mono">{v?.score ?? v ?? 0}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    case 'links':
      return (
        <div className="text-xs space-y-1">
          {data.recommendations && Array.isArray(data.recommendations) ? (
            <p className="text-muted-foreground">{data.recommendations.length} internal link suggestion(s)</p>
          ) : (
            <p className="text-muted-foreground">Link analysis complete</p>
          )}
        </div>
      );
    case 'taxonomy':
      return (
        <div className="text-xs space-y-1.5">
          {data.suggestedCategories && Array.isArray(data.suggestedCategories) && (
            <div className="flex flex-wrap gap-1">
              {data.suggestedCategories.map((c: any, i: number) => (
                <Badge key={i} variant="secondary" className="text-[10px]">{typeof c === 'string' ? c : c.name || c}</Badge>
              ))}
            </div>
          )}
          {data.suggestedTags && Array.isArray(data.suggestedTags) && (
            <div className="flex flex-wrap gap-1">
              {data.suggestedTags.slice(0, 10).map((t: any, i: number) => (
                <Badge key={i} variant="outline" className="text-[10px]">{typeof t === 'string' ? t : t.name || t}</Badge>
              ))}
            </div>
          )}
        </div>
      );
    default:
      return <p className="text-xs text-muted-foreground">Result available</p>;
  }
}
