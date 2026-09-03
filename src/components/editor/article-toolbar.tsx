"use client";

import { useCallback } from "react";
import {
  Save,
  Send,
  Clock,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MoreHorizontal,
  Eye,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { canTransition } from "@/lib/articles/workflow";
import type { Article } from "@/lib/api";

export type SaveStatus = "saved" | "saving" | "unsaved" | "error";

interface ArticleToolbarProps {
  article: Article;
  saveStatus: SaveStatus;
  isSaving: boolean;
  hasPrev: boolean;
  hasNext: boolean;
  onBack: () => void;
  onSave: () => void;
  onStatusChange: (status: string) => void;
  onPublish: () => void;
  onSchedule: () => void;
  onPrev: () => void;
  onNext: () => void;
  onPreview: () => void;
  onDelete: () => void;
  isPublishing?: boolean;
}

function StatusDot({ status }: { status: SaveStatus }) {
  const config = {
    saved: { color: "bg-emerald-500", label: "Saved" },
    saving: { color: "bg-amber-500 animate-pulse", label: "Saving..." },
    unsaved: { color: "bg-orange-400", label: "Unsaved changes" },
    error: { color: "bg-destructive", label: "Save failed" },
  }[status];
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={cn("inline-block size-2 rounded-full", config.color)} />
      {config.label}
    </span>
  );
}

export function ArticleToolbar({
  article,
  saveStatus,
  isSaving,
  hasPrev,
  hasNext,
  onBack,
  onSave,
  onStatusChange,
  onPublish,
  onSchedule,
  onPrev,
  onNext,
  onPreview,
  onDelete,
  isPublishing,
}: ArticleToolbarProps) {
  const status = article.status;
  const group = getGroup(status);

  const canApprove = canTransition(status, "APPROVED").allowed || canTransition(status, "approved").allowed;
  const canSchedule = canTransition(status, "SCHEDULED").allowed || canTransition(status, "scheduled").allowed;
  const canPublish = canTransition(status, "PUBLISHED").allowed || canTransition(status, "published").allowed;
  const canSubmitReview = canTransition(status, "EDITOR_REVIEW").allowed;

  const handleApprove = useCallback(() => {
    if (canTransition(status, "APPROVED").allowed) return onStatusChange("APPROVED");
    if (canTransition(status, "approved").allowed) return onStatusChange("approved");
  }, [status, onStatusChange]);

  return (
    <div className="flex items-center justify-between border-b bg-background px-3 py-2 gap-2">
      {/* Left: Back + Nav */}
      <div className="flex items-center gap-1 min-w-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={onBack}>
              <ArrowLeft className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Back to articles</TooltipContent>
        </Tooltip>
        <Separator orientation="vertical" className="h-5" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="size-7" disabled={!hasPrev} onClick={onPrev}>
              <ChevronLeft className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Previous article</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="size-7" disabled={!hasNext} onClick={onNext}>
              <ChevronRight className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Next article</TooltipContent>
        </Tooltip>
        <StatusDot status={saveStatus} />
      </div>

      {/* Center: Primary Actions */}
      <div className="flex items-center gap-1.5">
        {(group === "draft" || group === "in-review") && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSave}
            disabled={isSaving || saveStatus === "saved"}
            className="gap-1.5"
          >
            {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Save Draft
          </Button>
        )}

        {canSubmitReview && (
          <Button variant="outline" size="sm" onClick={() => onStatusChange("EDITOR_REVIEW")} className="gap-1.5 text-blue-600 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950">
            <Eye className="size-3.5" /> Submit for Review
          </Button>
        )}

        {canApprove && (
          <Button variant="outline" size="sm" onClick={handleApprove} className="gap-1.5 text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950">
            Approve
          </Button>
        )}

        {canSchedule && (
          <Button variant="outline" size="sm" onClick={onSchedule} className="gap-1.5 text-orange-600 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950">
            <Clock className="size-3.5" /> Schedule
          </Button>
        )}

        {canPublish && (
          <Button
            size="sm"
            onClick={onPublish}
            disabled={isPublishing}
            className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
          >
            {isPublishing ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            Publish
          </Button>
        )}

        {group === "published" && (
          <Button variant="outline" size="sm" onClick={onPreview} className="gap-1.5">
            <Eye className="size-3.5" /> View Live
          </Button>
        )}
      </div>

      {/* Right: More actions */}
      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onSave} disabled={isSaving}>
              <Save className="size-4 mr-2" /> Save
            </DropdownMenuItem>
            {group === "draft" && (
              <DropdownMenuItem onClick={() => onStatusChange("FAILED")}>
                <RotateCcw className="size-4 mr-2" /> Mark as Failed
              </DropdownMenuItem>
            )}
            {group !== "archived" && (
              <DropdownMenuItem onClick={() => onStatusChange("ARCHIVED")}>
                Archive
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="size-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function getGroup(status: string): string {
  if (['IDEA', 'FETCHED', 'RESEARCHING', 'OUTLINE', 'DRAFT', 'fetched', 'rewriting', 'rewritten'].includes(status)) return 'draft';
  if (['AI_REVIEW', 'EDITOR_REVIEW'].includes(status)) return 'in-review';
  if (['APPROVED', 'SCHEDULED', 'approved', 'scheduled'].includes(status)) return 'approved';
  if (['PUBLISHED', 'published', 'UPDATING', 'UPDATED'].includes(status)) return 'published';
  if (status === 'ARCHIVED') return 'archived';
  return 'failed';
}
