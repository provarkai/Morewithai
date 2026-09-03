"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Download,
  PenLine,
  Send,
  Play,
  RotateCcw,
  Loader2,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  ArrowRight,
  CalendarClock,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/app/page-header";
import { getAutomationLogs, runAutomation, getScheduledArticles, scheduleArticle, publishArticle } from "@/lib/api";
import { cn } from "@/lib/utils";

const steps = [
  {
    key: "fetch" as const, label: "Fetch Articles", description: "Pull latest articles from all active RSS feeds",
    icon: Download, color: "text-sky-500", bgColor: "bg-sky-500/10 border-sky-500/20", activeBg: "bg-sky-500 text-white",
  },
  {
    key: "rewrite" as const, label: "AI Rewrite + SEO", description: "Rewrite with AI and generate SEO metadata",
    icon: PenLine, color: "text-amber-500", bgColor: "bg-amber-500/10 border-amber-500/20", activeBg: "bg-amber-500 text-white",
  },
  {
    key: "publish" as const, label: "Publish", description: "Publish approved/scheduled articles to WordPress",
    icon: Send, color: "text-emerald-500", bgColor: "bg-emerald-500/10 border-emerald-500/20", activeBg: "bg-emerald-500 text-white",
  },
];

const logStatusIcon: Record<string, React.ElementType> = { success: CheckCircle, partial: AlertCircle, failed: XCircle };
const logStatusColor: Record<string, string> = { success: "text-emerald-500", partial: "text-amber-500", failed: "text-red-500" };
const logActionColor: Record<string, string> = {
  fetch: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  rewrite: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  publish: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  schedule: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
};

interface AutomationViewProps {
  siteId: string;
}

export function AutomationView({ siteId }: AutomationViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [runningStep, setRunningStep] = useState<string | null>(null);
  const [batchSize, setBatchSize] = useState("3");
  const [intervalMin, setIntervalMin] = useState("120");

  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ["automation-logs", siteId],
    queryFn: () => getAutomationLogs(siteId),
    refetchInterval: runningStep ? 3000 : false,
  });

  const { data: scheduled = [] } = useQuery({
    queryKey: ["scheduled-articles", siteId],
    queryFn: () => getScheduledArticles(siteId),
  });

  const runMutation = useMutation({
    mutationFn: (step: "all" | "fetch" | "rewrite" | "publish") => runAutomation(siteId, { step }),
    onMutate: (step) => setRunningStep(step),
    onSuccess: (data) => {
      setRunningStep(null);
      queryClient.invalidateQueries({ queryKey: ["automation-logs", siteId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", siteId] });
      queryClient.invalidateQueries({ queryKey: ["articles", siteId] });
      queryClient.invalidateQueries({ queryKey: ["feeds", siteId] });
      queryClient.invalidateQueries({ queryKey: ["scheduled-articles", siteId] });
      toast({ title: data.message });
    },
    onError: (err) => {
      setRunningStep(null);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const scheduleAllMutation = useMutation({
    mutationFn: () => scheduleArticle(siteId, { scheduleAll: true, batchSize: parseInt(batchSize) || 3, intervalMinutes: parseInt(intervalMin) || 120 }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-articles", siteId] });
      queryClient.invalidateQueries({ queryKey: ["articles", siteId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", siteId] });
      toast({ title: data.message });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const publishScheduledMutation = useMutation({
    mutationFn: () => publishArticle(siteId, { publishScheduled: true }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-articles", siteId] });
      queryClient.invalidateQueries({ queryKey: ["articles", siteId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", siteId] });
      toast({ title: data.message });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const isRunning = runMutation.isPending;

  return (
    <>
      <PageHeader title="Automation" description="Run the blog automation pipeline" />

      <div className="flex flex-1 flex-col gap-6 p-6">
        {/* Pipeline Steps */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Content Pipeline</CardTitle>
            <CardDescription>Run individual steps or the full pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
              <div className="flex flex-col items-center gap-2 lg:items-start lg:pt-6">
                <Button size="lg" className="gap-2 shadow-md" onClick={() => runMutation.mutate("all")} disabled={isRunning}>
                  {isRunning ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                  {isRunning ? "Running Pipeline..." : "Run Full Pipeline"}
                </Button>
                <p className="text-xs text-muted-foreground text-center lg:text-left">Fetch → Rewrite+SEO → Publish</p>
              </div>
              <Separator orientation="vertical" className="hidden lg:block" />
              <Separator orientation="horizontal" className="lg:hidden" />
              <div className="grid flex-1 gap-4 sm:grid-cols-3">
                {steps.map((step, i) => {
                  const Icon = step.icon;
                  const isActive = runningStep === step.key || runningStep === "all";
                  return (
                    <div key={step.key} className="relative">
                      {i < steps.length - 1 && <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden size-5 -translate-y-1/2 text-muted-foreground/40 sm:block" />}
                      <div className={cn("flex flex-col items-center gap-3 rounded-xl border p-5 text-center transition-all", isActive ? step.bgColor + " ring-2 ring-current " + step.color : "border-border")}>
                        <div className={cn("flex size-12 items-center justify-center rounded-xl transition-colors", isActive ? step.activeBg : step.bgColor)}>
                          {isActive ? <Loader2 className="size-5 animate-spin" /> : <Icon className={cn("size-5", step.color)} />}
                        </div>
                        <div>
                          <h3 className="font-medium text-sm">{step.label}</h3>
                          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                        </div>
                        <Button variant="outline" size="sm" className="mt-1 w-full" onClick={() => runMutation.mutate(step.key)} disabled={isRunning}>
                          {isActive && runningStep !== "all" ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
                          Run {step.label}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scheduling */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2"><CalendarClock className="size-4 text-orange-500" /> Content Scheduler</CardTitle>
            <CardDescription>Auto-schedule approved articles for staggered publishing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label className="text-xs">Posts per Day</Label>
                <Input type="number" min="1" max="10" value={batchSize} onChange={(e) => setBatchSize(e.target.value)} className="h-9" />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs">Interval (minutes)</Label>
                <Input type="number" min="30" max="1440" value={intervalMin} onChange={(e) => setIntervalMin(e.target.value)} className="h-9" />
              </div>
              <div className="flex flex-col gap-2">
                <Button className="gap-1.5" onClick={() => scheduleAllMutation.mutate()} disabled={scheduleAllMutation.isPending}>
                  {scheduleAllMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <CalendarClock className="size-4" />}
                  Schedule All Approved
                </Button>
                <Button variant="outline" className="gap-1.5" onClick={() => publishScheduledMutation.mutate()} disabled={publishScheduledMutation.isPending}>
                  {publishScheduledMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                  Publish Due Now
                </Button>
              </div>
            </div>
            {scheduled.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Upcoming Scheduled Posts ({scheduled.length})</p>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {scheduled.slice(0, 8).map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <span className="truncate max-w-xs">{a.title}</span>
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">{format(new Date(a.scheduledAt!), "MMM d, h:mm a")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Log */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Activity Log</CardTitle>
                <CardDescription>History of automation runs</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => queryClient.invalidateQueries({ queryKey: ["automation-logs", siteId] })}>
                <RotateCcw className="size-3" /> Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="flex justify-center py-8"><div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" /></div>
            ) : logs.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No automation runs yet.</p>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="flex flex-col gap-3 pr-4">
                  {logs.map((log) => {
                    const Icon = logStatusIcon[log.status] || AlertCircle;
                    return (
                      <div key={log.id} className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
                        <Icon className={cn("mt-0.5 size-4 shrink-0", logStatusColor[log.status] || "")} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className={cn("text-xs capitalize", logActionColor[log.action] || "")}>{log.action}</Badge>
                            <Badge variant="outline" className={cn("text-xs capitalize", log.status === "success" ? "border-emerald-300 text-emerald-600" : log.status === "failed" ? "border-red-300 text-red-600" : "border-amber-300 text-amber-600")}>{log.status}</Badge>
                          </div>
                          <p className="mt-1 text-sm">{log.message}</p>
                          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="size-3" /> {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}