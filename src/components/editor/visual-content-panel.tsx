"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ImageIcon, Loader2, Sparkles, Copy, Check, Download, Wand2 } from "lucide-react";

interface VisualContentPanelProps {
  articleId?: string;
  siteId: string;
  articleTitle?: string;
}

const VISUAL_TYPES = [
  { value: "FEATURED_IMAGE", label: "Featured", icon: "🖼️", desc: "Blog hero image" },
  { value: "SOCIAL_CARD", label: "Social", icon: "📱", desc: "Twitter/LinkedIn card" },
  { value: "INFOGRAPHIC", label: "Infographic", icon: "📊", desc: "Data visualization" },
  { value: "THUMBNAIL", label: "Thumbnail", icon: "🎬", desc: "YouTube thumbnail" },
  { value: "OPEN_GRAPH", label: "OG Image", icon: "🔗", desc: "Social sharing" },
];

const STYLE_OPTIONS = [
  "professional", "minimal", "bold", "creative", "tech",
  "photography", "illustration", "abstract", "corporate", "vibrant",
];

export function VisualContentPanel({ articleId, siteId, articleTitle }: VisualContentPanelProps) {
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState("FEATURED_IMAGE");
  const [selectedStyle, setSelectedStyle] = useState("professional");
  const [customPrompt, setCustomPrompt] = useState("");
  const [generatedImages, setGeneratedImages] = useState<any[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/ai/visual-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          siteId,
          type: selectedType,
          title: articleTitle || "Article",
          description: customPrompt || undefined,
          style: selectedStyle,
          articleId,
        }),
      });
      if (!res.ok) throw new Error("Generation failed");
      return res.json();
    },
    onSuccess: (data) => {
      setGeneratedImages((prev) => [data, ...prev]);
      toast({ title: "Image prompt generated", description: "Use this prompt with DALL-E, Midjourney, or Stable Diffusion" });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const copyPrompt = async (prompt: string, key: string) => {
    await navigator.clipboard.writeText(prompt);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: "Prompt copied" });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="size-4 text-emerald-500" />
              Visual Content
            </CardTitle>
            <CardDescription>Generate AI image prompts for social cards & thumbnails</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Type Selection */}
        <div className="grid grid-cols-5 gap-1">
          {VISUAL_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setSelectedType(t.value)}
              className={`flex flex-col items-center gap-0.5 rounded-md border p-1.5 text-[10px] transition-colors ${
                selectedType === t.value ? "bg-primary/10 border-primary" : "hover:bg-muted"
              }`}
            >
              <span className="text-base">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Style Selection */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Style</label>
          <div className="flex flex-wrap gap-1">
            {STYLE_OPTIONS.map((s) => (
              <Badge
                key={s}
                variant={selectedStyle === s ? "default" : "outline"}
                className="text-[10px] cursor-pointer"
                onClick={() => setSelectedStyle(s)}
              >
                {s}
              </Badge>
            ))}
          </div>
        </div>

        {/* Custom Description */}
        <Input
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="Optional: describe the visual you want (e.g., 'AI robot reading a book')"
          className="text-xs"
        />

        {/* Generate Button */}
        <Button size="sm" className="w-full" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
          {generateMutation.isPending ? <Loader2 className="size-3.5 animate-spin mr-1" /> : <Wand2 className="size-3.5 mr-1" />}
          Generate Image Prompt
        </Button>

        {/* Generated Prompts */}
        {generatedImages.length > 0 && (
          <div className="space-y-2">
            {generatedImages.map((img, i) => (
              <div key={img.id || i} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">{VISUAL_TYPES.find((t) => t.value === img.type)?.label}</Badge>
                    <Badge variant="outline" className="text-[10px]">{img.width}x{img.height}</Badge>
                  </div>
                  <Button size="sm" variant="ghost" className="h-6" onClick={() => copyPrompt(img.revisedPrompt, img.id)}>
                    {copied === img.id ? <Check className="size-3" /> : <Copy className="size-3" />}
                  </Button>
                </div>

                {/* Prompt Preview */}
                <div className="rounded bg-muted/50 p-2 text-xs text-muted-foreground font-mono leading-relaxed">
                  {img.revisedPrompt}
                </div>

                {/* Alt Text */}
                {img.altText && (
                  <div className="text-[11px]">
                    <span className="font-medium text-foreground">Alt text: </span>
                    <span className="text-muted-foreground">{img.altText}</span>
                    <Button size="sm" variant="ghost" className="h-4 ml-1 p-0" onClick={() => copyPrompt(img.altText, `${img.id}-alt`)}>
                      {copied === `${img.id}-alt` ? <Check className="size-2.5" /> : <Copy className="size-2.5" />}
                    </Button>
                  </div>
                )}

                {/* Meta */}
                <div className="flex gap-2 text-[10px] text-muted-foreground">
                  <span>Model: {img.metadata?.model || "DALL-E 3"}</span>
                  <span>Style: {img.metadata?.style || "professional"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
