"use client";

import { Badge } from "@/components/ui/badge";
import {
  Lightbulb,
  Download,
  Loader2,
  Search,
  List,
  PenLine,
  Eye,
  CheckCircle2,
  CalendarClock,
  Send,
  Globe,
  RefreshCw,
  Archive,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType; className?: string }
> = {
  // New statuses
  IDEA: { label: "Idea", variant: "outline", icon: Lightbulb, className: "text-gray-500 border-gray-300 bg-gray-50 dark:bg-gray-900 dark:border-gray-700" },
  FETCHED: { label: "Fetched", variant: "secondary", icon: Download },
  RESEARCHING: { label: "Researching", variant: "outline", icon: Search, className: "text-blue-500 border-blue-300 bg-blue-50 dark:bg-blue-950 dark:border-blue-800" },
  OUTLINE: { label: "Outline", variant: "outline", icon: List, className: "text-indigo-500 border-indigo-300 bg-indigo-50 dark:bg-indigo-950 dark:border-indigo-800" },
  DRAFT: { label: "Draft", variant: "default", icon: PenLine, className: "bg-blue-600 hover:bg-blue-600 text-white" },
  AI_REVIEW: { label: "AI Review", variant: "outline", icon: Eye, className: "text-blue-500 border-blue-300 bg-blue-50 dark:bg-blue-950 dark:border-blue-800" },
  EDITOR_REVIEW: { label: "Editor Review", variant: "outline", icon: Eye, className: "text-amber-500 border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-800" },
  APPROVED: { label: "Approved", variant: "default", icon: CheckCircle2, className: "bg-emerald-600 hover:bg-emerald-600 text-white" },
  SCHEDULED: { label: "Scheduled", variant: "outline", icon: CalendarClock, className: "text-orange-600 border-orange-300 bg-orange-50 dark:bg-orange-950 dark:border-orange-800" },
  PUBLISHED: { label: "Published", variant: "default", icon: Globe, className: "bg-violet-600 hover:bg-violet-600 text-white" },
  UPDATING: { label: "Updating", variant: "outline", icon: RefreshCw, className: "text-blue-500 border-blue-300 bg-blue-50 dark:bg-blue-950 dark:border-blue-800" },
  UPDATED: { label: "Updated", variant: "default", icon: Globe, className: "bg-violet-600 hover:bg-violet-600 text-white" },
  ARCHIVED: { label: "Archived", variant: "outline", icon: Archive, className: "text-muted-foreground border-muted-foreground/30" },
  FAILED: { label: "Failed", variant: "destructive", icon: AlertTriangle },

  // Legacy statuses
  fetched: { label: "Fetched", variant: "secondary", icon: Download },
  rewriting: { label: "Rewriting", variant: "outline", icon: Loader2, className: "text-blue-500 border-blue-300 bg-blue-50 dark:bg-blue-950 dark:border-blue-800" },
  rewritten: { label: "Rewritten", variant: "default", icon: PenLine, className: "bg-blue-600 hover:bg-blue-600 text-white" },
  approved: { label: "Approved", variant: "default", icon: CheckCircle2, className: "bg-emerald-600 hover:bg-emerald-600 text-white" },
  scheduled: { label: "Scheduled", variant: "outline", icon: CalendarClock, className: "text-orange-600 border-orange-300 bg-orange-50 dark:bg-orange-950 dark:border-orange-800" },
  publishing: { label: "Publishing", variant: "outline", icon: Loader2, className: "text-amber-500 border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-800" },
  published: { label: "Published", variant: "default", icon: Globe, className: "bg-violet-600 hover:bg-violet-600 text-white" },
  rejected: { label: "Rejected", variant: "destructive", icon: XCircle },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || {
    label: status,
    variant: "outline" as const,
    icon: AlertTriangle,
  };
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={cn("gap-1 font-medium", config.className)}>
      <Icon className="size-3" />
      {config.label}
    </Badge>
  );
}

export const allStatuses = Object.keys(statusConfig);
