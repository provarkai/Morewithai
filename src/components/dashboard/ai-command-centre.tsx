"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sparkles, FileText, ListChecks, Target, BarChart3, Link2, Tags, RefreshCw,
} from "lucide-react";

interface AiCommandCentreProps {
  siteId: string;
  onEditArticle?: (articleId: string) => void;
}

const AI_ACTIONS = [
  { key: 'generate', label: 'Generate Article', icon: Sparkles, description: 'Create new AI content', color: 'text-violet-600' },
  { key: 'outline', label: 'Generate Outline', icon: ListChecks, description: 'Build article structure', color: 'text-blue-600' },
  { key: 'improve', label: 'Improve Content', icon: FileText, description: 'Enhance existing article', color: 'text-emerald-600' },
  { key: 'seo', label: 'Optimize SEO', icon: Target, description: 'Analyze & improve SEO', color: 'text-orange-600' },
  { key: 'quality', label: 'Score Quality', icon: BarChart3, description: 'Run quality analysis', color: 'text-sky-600' },
  { key: 'links', label: 'Find Links', icon: Link2, description: 'Discover internal links', color: 'text-pink-600' },
  { key: 'taxonomy', label: 'Generate Tags', icon: Tags, description: 'Suggest categories & tags', color: 'text-amber-600' },
  { key: 'refresh', label: 'Refresh Content', icon: RefreshCw, description: 'Update stale articles', color: 'text-red-600' },
] as const;

export function AiCommandCentre({ siteId, onEditArticle }: AiCommandCentreProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">AI Command Centre</CardTitle>
        <CardDescription>Quick AI actions — select an article first, then pick an action</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {AI_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.key}
                variant="outline"
                className="h-auto flex-col gap-1.5 py-3 text-center"
                onClick={() => {
                  // These actions are performed in the editor context.
                  // This panel serves as a navigation hint.
                }}
              >
                <Icon className={`size-5 ${action.color}`} />
                <span className="text-xs font-medium leading-tight">{action.label}</span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
