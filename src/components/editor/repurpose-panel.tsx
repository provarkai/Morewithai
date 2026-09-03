"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { repurposeArticle, batchRepurposeArticle } from "@/lib/api";
import {
  Copy, Check, Twitter, Linkedin, Mail, Video, Instagram, Rocket,
  Loader2, Sparkles, Download,
} from "lucide-react";

interface RepurposePanelProps {
  articleId: string;
  siteId: string;
}

const FORMAT_CONFIG = [
  { value: "TWITTER_THREAD", label: "Twitter/X", icon: Twitter, color: "text-sky-500" },
  { value: "LINKEDIN_POST", label: "LinkedIn", icon: Linkedin, color: "text-blue-600" },
  { value: "EMAIL_NEWSLETTER", label: "Email", icon: Mail, color: "text-orange-500" },
  { value: "YOUTUBE_SCRIPT", label: "YouTube", icon: Video, color: "text-red-500" },
  { value: "INSTAGRAM_CAPTION", label: "Instagram", icon: Instagram, color: "text-pink-500" },
  { value: "PRODUCT_HUNT", label: "Product Hunt", icon: Rocket, color: "text-orange-600" },
] as const;

export function RepurposePanel({ articleId, siteId }: RepurposePanelProps) {
  const { toast } = useToast();
  const [activeFormat, setActiveFormat] = useState<string>("TWITTER_THREAD");
  const [results, setResults] = useState<Record<string, string>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const repurposeMutation = useMutation({
    mutationFn: (format: string) => repurposeArticle({ articleId, siteId, format }),
    onSuccess: (data, format) => {
      setResults((prev) => ({ ...prev, [format]: data.content }));
      toast({ title: "Content repurposed", description: `Generated ${format.replace(/_/g, " ").toLowerCase()} content` });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const batchMutation = useMutation({
    mutationFn: () => batchRepurposeArticle({ articleId, siteId, formats: FORMAT_CONFIG.map((f) => f.value) }),
    onSuccess: (data) => {
      const newResults: Record<string, string> = {};
      for (const r of data.results || []) {
        newResults[r.format] = r.content;
      }
      setResults(newResults);
      toast({ title: "Batch repurpose complete", description: `Generated ${Object.keys(newResults).length} formats` });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 2000);
    toast({ title: "Copied to clipboard" });
  };

  const downloadContent = (content: string, format: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `repurposed-${format.toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentResult = results[activeFormat];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="size-4 text-violet-500" />
              Content Repurposing
            </CardTitle>
            <CardDescription>Transform your article into multiple formats</CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => batchMutation.mutate()}
            disabled={batchMutation.isPending}
          >
            {batchMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin mr-1" />
            ) : (
              <Sparkles className="size-3.5 mr-1" />
            )}
            Generate All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeFormat} onValueChange={setActiveFormat}>
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
            {FORMAT_CONFIG.map((fmt) => (
              <TabsTrigger key={fmt.value} value={fmt.value} className="text-xs gap-1">
                <fmt.icon className={`size-3 ${fmt.color}`} />
                <span className="hidden sm:inline">{fmt.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {FORMAT_CONFIG.map((fmt) => (
            <TabsContent key={fmt.value} value={fmt.value}>
              <div className="space-y-3">
                {results[fmt.value] ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Generated</Badge>
                      <span className="text-xs text-muted-foreground">
                        {results[fmt.value].split(/\s+/).length} words
                      </span>
                    </div>
                    <ScrollArea className="h-[300px] rounded-md border p-4">
                      <pre className="text-sm whitespace-pre-wrap font-sans">{results[fmt.value]}</pre>
                    </ScrollArea>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(results[fmt.value], fmt.value)}
                      >
                        {copiedField === fmt.value ? (
                          <Check className="size-3.5 mr-1" />
                        ) : (
                          <Copy className="size-3.5 mr-1" />
                        )}
                        Copy
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadContent(results[fmt.value], fmt.value)}
                      >
                        <Download className="size-3.5 mr-1" />
                        Download
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => repurposeMutation.mutate(fmt.value)}
                        disabled={repurposeMutation.isPending}
                      >
                        Regenerate
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <fmt.icon className={`size-8 ${fmt.color} mb-3 opacity-50`} />
                    <p className="text-sm text-muted-foreground mb-3">
                      No {fmt.label} content generated yet
                    </p>
                    <Button
                      size="sm"
                      onClick={() => repurposeMutation.mutate(fmt.value)}
                      disabled={repurposeMutation.isPending}
                    >
                      {repurposeMutation.isPending ? (
                        <Loader2 className="size-3.5 animate-spin mr-1" />
                      ) : (
                        <Sparkles className="size-3.5 mr-1" />
                      )}
                      Generate {fmt.label}
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
