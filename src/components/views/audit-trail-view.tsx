"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Loader2, User, FileText, ChevronRight } from "lucide-react";

interface AuditTrailViewProps { siteId: string; }

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  UPDATE: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  DELETE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  PUBLISH: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
};

export default function AuditTrailView({ siteId }: AuditTrailViewProps) {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["audit-stats", siteId],
    queryFn: async () => {
      const res = await fetch(`/api/audit?siteId=${siteId}&action=stats`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: activity, isLoading } = useQuery({
    queryKey: ["audit-activity", siteId],
    queryFn: async () => {
      const res = await fetch(`/api/audit?siteId=${siteId}&action=activity&limit=50`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  if (isLoading || statsLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="size-6 animate-spin" /></div>;

  const entries = activity?.activity || [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><History className="size-6" /> Audit Trail</h1>
        <p className="text-muted-foreground text-sm mt-1">Complete history of all changes with field-level diffs</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-3">
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold">{stats.totalActions}</div>
            <div className="text-[10px] text-muted-foreground">Total Actions</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold">{stats.activeUsers?.length || 0}</div>
            <div className="text-[10px] text-muted-foreground">Active Users</div>
          </Card>
          {Object.entries(stats.actionsByType || {}).slice(0, 2).map(([action, count]) => (
            <Card key={action} className="p-3 text-center">
              <div className="text-2xl font-bold">{count as number}</div>
              <div className="text-[10px] text-muted-foreground">{action}s</div>
            </Card>
          ))}
        </div>
      )}

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Recent Activity</CardTitle></CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-350px)]">
            {entries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No audit entries yet</div>
            ) : (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                <div className="space-y-4">
                  {entries.map((entry: any) => {
                    let changes: any[] = [];
                    try { changes = JSON.parse(entry.metadata || "{}").changes || []; } catch {}
                    return (
                      <div key={entry.id} className="flex gap-3 pl-1">
                        <div className="relative z-10 mt-1">
                          <div className={`size-7 rounded-full flex items-center justify-center text-[10px] font-medium ${ACTION_COLORS[entry.action] || "bg-muted"}`}>
                            {entry.action?.slice(0, 2)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{entry.action}</span>
                            <Badge variant="outline" className="text-[10px]">{entry.resource}</Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                            <User className="size-3" /> {entry.actorEmail || "System"}
                            <span>•</span>
                            <span>{new Date(entry.createdAt).toLocaleString()}</span>
                          </div>
                          {changes.length > 0 && (
                            <div className="mt-1.5 space-y-0.5">
                              {changes.slice(0, 5).map((c: any, i: number) => (
                                <div key={i} className="text-[11px] flex items-start gap-1">
                                  <ChevronRight className="size-3 mt-0.5 shrink-0 text-muted-foreground" />
                                  <span className="font-medium text-foreground">{c.field}:</span>
                                  <span className="text-red-500 line-through truncate max-w-[120px]">{String(c.oldValue)?.slice(0, 30)}</span>
                                  <span className="text-emerald-500 truncate max-w-[120px]">{String(c.newValue)?.slice(0, 30)}</span>
                                </div>
                              ))}
                              {changes.length > 5 && <span className="text-[10px] text-muted-foreground">+{changes.length - 5} more changes</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
