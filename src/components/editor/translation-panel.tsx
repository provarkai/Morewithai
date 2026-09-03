"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Globe, Loader2, Languages, Check, Copy } from "lucide-react";

interface TranslationPanelProps {
  articleId: string;
  siteId: string;
}

const LANGUAGES = [
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "pt", name: "Portuguese", flag: "🇧🇷" },
  { code: "it", name: "Italian", flag: "🇮🇹" },
  { code: "ja", name: "Japanese", flag: "🇯🇵" },
  { code: "ko", name: "Korean", flag: "🇰🇷" },
  { code: "zh", name: "Chinese", flag: "🇨🇳" },
  { code: "ar", name: "Arabic", flag: "🇸🇦" },
  { code: "hi", name: "Hindi", flag: "🇮🇳" },
  { code: "nl", name: "Dutch", flag: "🇳🇱" },
  { code: "sv", name: "Swedish", flag: "🇸🇪" },
];

export function TranslationPanel({ articleId, siteId }: TranslationPanelProps) {
  const { toast } = useToast();
  const [selectedLangs, setSelectedLangs] = useState<Set<string>>(new Set());
  const [translations, setTranslations] = useState<Record<string, any>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const translateMutation = useMutation({
    mutationFn: async (langCode: string) => {
      const res = await fetch("/api/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ articleId, siteId, targetLanguage: langCode }),
      });
      if (!res.ok) throw new Error(`Translation to ${langCode} failed`);
      return res.json();
    },
    onSuccess: (data, langCode) => {
      setTranslations((prev) => ({ ...prev, [langCode]: data }));
      toast({ title: `Translated to ${LANGUAGES.find((l) => l.code === langCode)?.name}` });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const batchMutation = useMutation({
    mutationFn: async () => {
      const langs = Array.from(selectedLangs);
      const res = await fetch("/api/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "batch", articleId, siteId, targetLanguages: langs }),
      });
      if (!res.ok) throw new Error("Batch translation failed");
      return res.json();
    },
    onSuccess: (data) => {
      const newTranslations: Record<string, any> = {};
      for (const t of data.translations || []) {
        newTranslations[t.targetLanguage] = t;
      }
      setTranslations((prev) => ({ ...prev, ...newTranslations }));
      toast({ title: `Translated ${Object.keys(newTranslations).length} languages` });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const toggleLang = (code: string) => {
    setSelectedLangs((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="size-4 text-blue-500" />
              Translate
            </CardTitle>
            <CardDescription>Auto-translate with localized SEO</CardDescription>
          </div>
          {selectedLangs.size > 0 && (
            <Button size="sm" onClick={() => batchMutation.mutate()} disabled={batchMutation.isPending}>
              {batchMutation.isPending ? <Loader2 className="size-3.5 animate-spin mr-1" /> : <Languages className="size-3.5 mr-1" />}
              Translate {selectedLangs.size}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Language Grid */}
        <div className="grid grid-cols-3 gap-1.5">
          {LANGUAGES.map((lang) => {
            const isTranslated = !!translations[lang.code];
            const isSelected = selectedLangs.has(lang.code);
            return (
              <button
                key={lang.code}
                onClick={() => isTranslated ? null : toggleLang(lang.code)}
                className={`flex items-center gap-1.5 rounded-md border p-1.5 text-xs transition-colors ${
                  isTranslated ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200" :
                  isSelected ? "bg-primary/10 border-primary" :
                  "hover:bg-muted"
                }`}
              >
                <span>{lang.flag}</span>
                <span className="truncate">{lang.name}</span>
                {isTranslated && <Check className="size-3 text-emerald-500 ml-auto" />}
              </button>
            );
          })}
        </div>

        {/* Translations */}
        {Object.keys(translations).length > 0 && (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-3">
              {Object.entries(translations).map(([code, t]: [string, any]) => {
                const lang = LANGUAGES.find((l) => l.code === code);
                return (
                  <div key={code} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>{lang?.flag}</span>
                        <span className="text-sm font-medium">{lang?.name}</span>
                        <Badge variant="outline" className="text-[10px]">{t.hreflangTag ? "SEO ready" : "Draft"}</Badge>
                      </div>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => copyToClipboard(t.translatedContent, code)}>
                        {copied === code ? <Check className="size-3" /> : <Copy className="size-3" />}
                      </Button>
                    </div>
                    <p className="text-sm font-medium">{t.translatedTitle}</p>
                    <p className="text-xs text-muted-foreground line-clamp-3">{t.translatedExcerpt}</p>
                    {t.translatedSeoKeywords?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {t.translatedSeoKeywords.slice(0, 5).map((kw: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-[9px]">{kw}</Badge>
                        ))}
                      </div>
                    )}
                    {t.culturalNotes?.length > 0 && (
                      <div className="text-[11px] text-muted-foreground italic">
                        {t.culturalNotes.map((n: string, i: number) => <p key={i}>💡 {n}</p>)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
