"use client";

import { useState } from "react";
import {
  Send,
  Clock,
  CalendarClock,
  Globe,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { canTransition } from "@/lib/articles/workflow";
import type { Article } from "@/lib/api";

interface ArticlePublishPanelProps {
  article: Article;
  siteId: string;
  onPublish: () => void;
  onSchedule: (date: string) => void;
  onUnschedule: () => void;
  onStatusChange: (status: string) => void;
  isPublishing?: boolean;
}

interface CheckItem {
  label: string;
  passed: boolean;
  warning?: boolean;
}

export function ArticlePublishPanel({
  article,
  siteId,
  onPublish,
  onSchedule,
  onUnschedule,
  onStatusChange,
  isPublishing,
}: ArticlePublishPanelProps) {
  const { toast } = useToast();
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");

  const title = article.rewrittenTitle || article.title;
  const content = article.rewrittenContent || article.originalContent;
  const hasSlug = !!article.slug;
  const hasContent = !!content && content.length > 100;
  const hasSeoTitle = !!article.seoTitle;
  const hasSeoDesc = !!article.seoDescription;
  const seoOk = article.seoScore == null || article.seoScore >= 50;
  const qualityOk = article.qualityScore == null || article.qualityScore >= 50;
  const isPublished = ['PUBLISHED', 'published'].includes(article.status);
  const isScheduled = ['SCHEDULED', 'scheduled'].includes(article.status);
  const isApproved = ['APPROVED', 'approved'].includes(article.status);

  const checks: CheckItem[] = [
    { label: 'Article title', passed: !!title && title.length > 5 },
    { label: 'Content (>100 chars)', passed: hasContent },
    { label: 'URL slug', passed: hasSlug },
    { label: 'SEO title', passed: hasSeoTitle, warning: !hasSeoTitle },
    { label: 'SEO description', passed: hasSeoDesc, warning: !hasSeoDesc },
    { label: 'SEO score (50+)', passed: seoOk, warning: !seoOk && article.seoScore != null },
    { label: 'Quality score (50+)', passed: qualityOk, warning: !qualityOk && article.qualityScore != null },
  ];

  const allPassed = checks.every((c) => c.passed);
  const canPublish = isApproved || isScheduled || canTransition(article.status, 'PUBLISHED').allowed || canTransition(article.status, 'published').allowed;
  const canScheduleNow = canTransition(article.status, 'SCHEDULED').allowed || canTransition(article.status, 'scheduled').allowed;

  const handleSchedule = () => {
    if (!scheduleDate) return;
    onSchedule(new Date(scheduleDate).toISOString());
    setShowSchedule(false);
    setScheduleDate("");
    toast({ title: "Article scheduled" });
  };

  return (
    <div className="space-y-4 p-3">
      <div className="flex items-center gap-2">
        <Send className="size-4 text-violet-500" />
        <h3 className="text-sm font-semibold">Publishing</h3>
      </div>

      {/* Pre-publish Checklist */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pre-Publish Checklist</h4>
        <div className="space-y-1.5">
          {checks.map((check, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              {check.passed ? (
                <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
              ) : check.warning ? (
                <AlertTriangle className="size-3.5 text-amber-500 shrink-0" />
              ) : (
                <XCircle className="size-3.5 text-muted-foreground/40 shrink-0" />
              )}
              <span className={cn(check.passed ? "text-foreground" : check.warning ? "text-amber-600" : "text-muted-foreground")}>
                {check.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Publish / Schedule Actions */}
      <div className="space-y-2">
        {isPublished ? (
          <div className="space-y-2">
            <Badge className="bg-violet-600 text-white">
              <Globe className="size-3 mr-1" /> Published
            </Badge>
            {article.wordpressUrl && (
              <Button variant="outline" size="sm" className="w-full gap-1.5" asChild>
                <a href={article.wordpressUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-3.5" /> View on WordPress
                </a>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5 text-orange-600"
              onClick={() => onStatusChange('UPDATING')}
            >
              <Clock className="size-3.5" /> Create Update
            </Button>
          </div>
        ) : isScheduled ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                <CalendarClock className="size-3 mr-1" /> Scheduled
              </Badge>
            </div>
            {article.scheduledAt && (
              <p className="text-xs text-muted-foreground">
                Scheduled for {new Date(article.scheduledAt).toLocaleString()}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
                onClick={onPublish}
                disabled={isPublishing}
              >
                {isPublishing ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                Publish Now
              </Button>
              <Button variant="outline" size="sm" onClick={onUnschedule}>
                Unschedule
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Button
              size="sm"
              className={cn(
                "w-full gap-1.5",
                allPassed ? "bg-violet-600 hover:bg-violet-700 text-white" : "bg-muted text-muted-foreground"
              )}
              onClick={onPublish}
              disabled={!canPublish || isPublishing}
            >
              {isPublishing ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              Publish Now
            </Button>
            {canScheduleNow && (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5 text-orange-600"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 1);
                  d.setHours(9, 0, 0, 0);
                  setScheduleDate(d.toISOString().slice(0, 16));
                  setShowSchedule(true);
                }}
              >
                <CalendarClock className="size-3.5" /> Schedule
              </Button>
            )}
            {!allPassed && (
              <p className="text-[11px] text-amber-600 flex items-center gap-1">
                <AlertTriangle className="size-3" />
                Complete all checks for optimal publishing
              </p>
            )}
          </div>
        )}
      </div>

      {/* Article Meta Info */}
      <Separator />
      <div className="space-y-1.5 text-xs text-muted-foreground">
        <div className="flex justify-between"><span>Status</span><span className="font-medium text-foreground">{article.status}</span></div>
        {article.sourceUrl && (
          <div className="flex justify-between items-center gap-2">
            <span className="truncate">Source</span>
            <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-primary hover:underline flex items-center gap-0.5">
              Link <ExternalLink className="size-2.5" />
            </a>
          </div>
        )}
        {article.feed && (
          <div className="flex justify-between"><span>Feed</span><span className="font-medium text-foreground">{article.feed.name}</span></div>
        )}
      </div>

      {/* Schedule Dialog */}
      <Dialog open={showSchedule} onOpenChange={setShowSchedule}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CalendarClock className="size-5" /> Schedule Article</DialogTitle>
            <DialogDescription>Choose when this article should be published</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="grid gap-2">
              <Label htmlFor="editor-schedule-date">Publish Date & Time</Label>
              <Input
                id="editor-schedule-date"
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Articles scheduled for optimal engagement perform better</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowSchedule(false); setScheduleDate(""); }}>Cancel</Button>
            <Button onClick={handleSchedule} disabled={!scheduleDate} className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white">
              <CalendarClock className="size-4" /> Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
