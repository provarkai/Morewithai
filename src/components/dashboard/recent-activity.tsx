"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertCircle, XCircle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityLog {
  id: string;
  action: string;
  status: string;
  message: string;
  createdAt: string;
}

interface RecentActivityProps {
  logs: ActivityLog[];
}

const LOG_ICONS: Record<string, typeof CheckCircle> = {
  success: CheckCircle,
  partial: AlertCircle,
  failed: XCircle,
};

const LOG_COLORS: Record<string, string> = {
  success: 'text-emerald-500',
  partial: 'text-amber-500',
  failed: 'text-red-500',
};

const ACTION_ICONS: Record<string, string> = {
  'scheduled-publish': '📤',
  'fetch': '📥',
  'rewrite': '✍️',
  'publish': '🚀',
  'refresh': '🔄',
};

export function RecentActivity({ logs }: RecentActivityProps) {
  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent Activity</CardTitle>
          <CardDescription>Latest automation events</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-muted-foreground">No activity yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Recent Activity</CardTitle>
        <CardDescription>Latest automation events</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {logs.slice(0, 8).map((log) => {
            const Icon = LOG_ICONS[log.status] || AlertCircle;
            return (
              <div key={log.id} className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 text-sm">{ACTION_ICONS[log.action] || '⚙️'}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-tight truncate">{log.message}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <Icon className={`size-3 ${LOG_COLORS[log.status] || ''}`} />
                    <span className="capitalize">{log.status}</span>
                    <span>·</span>
                    <Clock className="size-3" />
                    {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}