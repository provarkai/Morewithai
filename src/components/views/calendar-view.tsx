"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Sparkles,
  Loader2,
  XCircle,
  CalendarDays,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  generateCalendarSuggestions,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

// ─── Constants ──────────────────────────────────────────────────

const EVENT_TYPE_OPTIONS = [
  { value: "ALL", label: "All Types" },
  { value: "PUBLISH", label: "Publish" },
  { value: "UPDATE", label: "Update" },
  { value: "PROMOTE", label: "Promote" },
  { value: "MONETIZE", label: "Monetize" },
  { value: "REPURPOSE", label: "Repurpose" },
];

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
];

const TYPE_BADGE_COLORS: Record<string, string> = {
  PUBLISH: "bg-sky-500/15 text-sky-700 border-sky-500/25",
  UPDATE: "bg-amber-500/15 text-amber-700 border-amber-500/25",
  PROMOTE: "bg-green-500/15 text-green-700 border-green-500/25",
  MONETIZE: "bg-purple-500/15 text-purple-700 border-purple-500/25",
  REPURPOSE: "bg-pink-500/15 text-pink-700 border-pink-500/25",
};

const TYPE_DOT_COLORS: Record<string, string> = {
  PUBLISH: "bg-sky-500",
  UPDATE: "bg-amber-500",
  PROMOTE: "bg-green-500",
  MONETIZE: "bg-purple-500",
  REPURPOSE: "bg-pink-500",
};

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: "bg-red-500/15 text-red-700 border-red-500/25",
  MEDIUM: "bg-amber-500/15 text-amber-700 border-amber-500/25",
  LOW: "bg-gray-500/15 text-gray-600 border-gray-500/25",
};

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-sky-500/15 text-sky-700 border-sky-500/25",
  COMPLETED: "bg-green-500/15 text-green-700 border-green-500/25",
  CANCELLED: "bg-gray-500/15 text-gray-500 border-gray-500/25",
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ─── Helpers ────────────────────────────────────────────────────

function formatType(type: string) {
  return type.charAt(0) + type.slice(1).toLowerCase();
}

function formatStatus(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

// ─── Event Form (extracted) ────────────────────────────────────

function EventForm({
  formTitle,
  formType,
  formDescription,
  formDate,
  formPriority,
  setFormTitle,
  setFormType,
  setFormDescription,
  setFormDate,
  setFormPriority,
  onSubmit,
  submitLabel,
  isPending,
  onCancel,
}: {
  formTitle: string;
  formType: string;
  formDescription: string;
  formDate: string;
  formPriority: string;
  setFormTitle: (v: string) => void;
  setFormType: (v: string) => void;
  setFormDescription: (v: string) => void;
  setFormDate: (v: string) => void;
  setFormPriority: (v: string) => void;
  onSubmit: () => void;
  submitLabel: string;
  isPending: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <Label htmlFor="event-title">Title</Label>
        <Input
          id="event-title"
          value={formTitle}
          onChange={(e) => setFormTitle(e.target.value)}
          placeholder="e.g. Publish SEO Guide"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="event-type">Event Type</Label>
        <Select value={formType} onValueChange={setFormType}>
          <SelectTrigger id="event-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EVENT_TYPE_OPTIONS.filter((o) => o.value !== "ALL").map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="event-date">Scheduled Date</Label>
        <Input
          id="event-date"
          type="date"
          value={formDate}
          onChange={(e) => setFormDate(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="event-priority">Priority</Label>
        <Select value={formPriority} onValueChange={setFormPriority}>
          <SelectTrigger id="event-priority">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="event-desc">Description</Label>
        <Textarea
          id="event-desc"
          value={formDescription}
          onChange={(e) => setFormDescription(e.target.value)}
          placeholder="Optional description..."
          rows={3}
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={onSubmit}
          disabled={!formTitle.trim() || !formDate || isPending}
        >
          {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
          {submitLabel}
        </Button>
      </DialogFooter>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────

interface CalendarViewProps {
  siteId: string;
}

export function CalendarView({ siteId }: CalendarViewProps) {
  const queryClient = useQueryClient();

  // Calendar navigation
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [eventTypeFilter, setEventTypeFilter] = useState("ALL");

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<any | null>(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState<any[] | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState("PUBLISH");
  const [formDescription, setFormDescription] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formPriority, setFormPriority] = useState("MEDIUM");

  // ─── Queries ─────────────────────────────────────────────────

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const eventsQuery = useQuery({
    queryKey: ["calendar-events", siteId, eventTypeFilter, format(monthStart, "yyyy-MM")],
    queryFn: () =>
      getCalendarEvents(siteId, {
        eventType: eventTypeFilter !== "ALL" ? eventTypeFilter : undefined,
        startDate: format(startOfWeek(monthStart, { weekStartsOn: 0 }), "yyyy-MM-dd"),
        endDate: format(endOfWeek(monthEnd, { weekStartsOn: 0 }), "yyyy-MM-dd"),
      }),
  });

  // ─── Mutations ───────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (data: {
      title: string;
      eventType: string;
      description?: string;
      scheduledDate: string;
      priority?: string;
    }) => createCalendarEvent(siteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      setCreateOpen(false);
      resetForm();
      toast.success("Event created");
    },
    onError: (err) => toast.error(err.message || "Failed to create event"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      updateCalendarEvent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      setEditEvent(null);
      resetForm();
      toast.success("Event updated");
    },
    onError: (err) => toast.error(err.message || "Failed to update event"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCalendarEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      toast.success("Event deleted");
    },
    onError: (err) => toast.error(err.message || "Failed to delete event"),
  });

  const suggestMutation = useMutation({
    mutationFn: () => generateCalendarSuggestions(siteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      toast.success("AI suggestions generated!");
    },
    onError: (err) => toast.error(err.message || "Failed to generate suggestions"),
  });

  // ─── Derived ─────────────────────────────────────────────────

  const events = Array.isArray(eventsQuery.data)
    ? eventsQuery.data
    : eventsQuery.data?.events ?? [];

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const start = startOfWeek(monthStart, { weekStartsOn: 0 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [monthStart, monthEnd]);

  function getEventsForDay(day: Date) {
    return events.filter((e: any) => {
      if (!e.scheduledDate) return false;
      try {
        return isSameDay(new Date(e.scheduledDate), day);
      } catch {
        return false;
      }
    });
  }

  // ─── Form handlers ───────────────────────────────────────────

  function resetForm() {
    setFormTitle("");
    setFormType("PUBLISH");
    setFormDescription("");
    setFormDate("");
    setFormPriority("MEDIUM");
  }

  function openEditDialog(event: any) {
    setEditEvent(event);
    setFormTitle(event.title ?? "");
    setFormType(event.eventType ?? "PUBLISH");
    setFormDescription(event.description ?? "");
    setFormDate(
      event.scheduledDate
        ? format(new Date(event.scheduledDate), "yyyy-MM-dd")
        : ""
    );
    setFormPriority(event.priority ?? "MEDIUM");
  }

  function handleCreate() {
    if (!formTitle.trim() || !formDate) return;
    createMutation.mutate({
      title: formTitle.trim(),
      eventType: formType,
      description: formDescription.trim() || undefined,
      scheduledDate: formDate,
      priority: formPriority,
    });
  }

  function handleUpdate() {
    if (!editEvent || !formTitle.trim()) return;
    updateMutation.mutate({
      id: editEvent.id,
      data: {
        title: formTitle.trim(),
        eventType: formType,
        description: formDescription.trim() || undefined,
        scheduledDate: formDate || undefined,
        priority: formPriority,
      },
    });
  }

  function handleCancel() {
    setCreateOpen(false);
    setEditEvent(null);
    resetForm();
  }

  // ─── Render ──────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className="flex-1 space-y-6 p-6">
        {/* ─── Top Bar ────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <h2 className="min-w-[180px] text-center text-lg font-semibold">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => suggestMutation.mutate()}
              disabled={suggestMutation.isPending}
            >
              {suggestMutation.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 size-4" />
              )}
              Generate AI Suggestions
            </Button>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 size-4" />
                  Create Event
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Calendar Event</DialogTitle>
                  <DialogDescription>
                    Schedule a content activity on your calendar.
                  </DialogDescription>
                </DialogHeader>
                <EventForm
                  formTitle={formTitle}
                  formType={formType}
                  formDescription={formDescription}
                  formDate={formDate}
                  formPriority={formPriority}
                  setFormTitle={setFormTitle}
                  setFormType={setFormType}
                  setFormDescription={setFormDescription}
                  setFormDate={setFormDate}
                  setFormPriority={setFormPriority}
                  onSubmit={handleCreate}
                  submitLabel="Create"
                  isPending={createMutation.isPending}
                  onCancel={handleCancel}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* ─── Filter ─────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Event Type" />
            </SelectTrigger>
            <SelectContent>
              {EVENT_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ─── Calendar Grid ──────────────────────────────────── */}
        <Card>
          <CardContent className="p-4">
            {eventsQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[640px]">
                  {/* Day headers */}
                  <div className="grid grid-cols-7 border-b">
                    {DAY_LABELS.map((d) => (
                      <div
                        key={d}
                        className="px-2 py-2 text-center text-xs font-medium text-muted-foreground"
                      >
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* Weeks */}
                  {Array.from({ length: Math.ceil(calendarDays.length / 7) }).map(
                    (_, weekIdx) => {
                      const weekDays = calendarDays.slice(
                        weekIdx * 7,
                        weekIdx * 7 + 7
                      );
                      return (
                        <div
                          key={weekIdx}
                          className="grid grid-cols-7 border-b last:border-b-0"
                        >
                          {weekDays.map((day) => {
                            const dayEvents = getEventsForDay(day);
                            const isCurrentMonth =
                              day.getMonth() === currentMonth.getMonth();
                            const isSelected = isToday(day);

                            return (
                              <div
                                key={day.toISOString()}
                                className={cn(
                                  "min-h-[80px] border-r p-1 last:border-r-0",
                                  !isCurrentMonth && "bg-muted/30",
                                  isSelected && "bg-primary/5"
                                )}
                                onClick={() =>
                                  dayEvents.length > 0 &&
                                  setSelectedDayEvents(dayEvents)
                                }
                              >
                                <span
                                  className={cn(
                                    "inline-flex size-6 items-center justify-center rounded-full text-xs",
                                    isSelected &&
                                      "bg-primary text-primary-foreground font-bold",
                                    !isSelected &&
                                      !isCurrentMonth &&
                                      "text-muted-foreground/50"
                                  )}
                                >
                                  {format(day, "d")}
                                </span>
                                <div className="mt-0.5 flex flex-col gap-0.5">
                                  {dayEvents.slice(0, 3).map((ev: any) => (
                                    <Tooltip key={ev.id}>
                                      <TooltipTrigger asChild>
                                        <div
                                          className={cn(
                                            "flex items-center gap-1 rounded px-1 py-0.5 text-[10px] leading-tight truncate cursor-pointer hover:opacity-80",
                                            TYPE_BADGE_COLORS[ev.eventType] ??
                                              "bg-muted text-muted-foreground"
                                          )}
                                        >
                                          <span
                                            className={cn(
                                              "shrink-0 rounded-full size-1.5",
                                              TYPE_DOT_COLORS[ev.eventType] ??
                                                "bg-muted-foreground"
                                            )}
                                          />
                                          {ev.title}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="top">
                                        <p className="font-medium">{ev.title}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {formatType(ev.eventType)}
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  ))}
                                  {dayEvents.length > 3 && (
                                    <span className="text-[10px] text-muted-foreground px-1">
                                      +{dayEvents.length - 3} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Event List Table ───────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="size-4" />
              Scheduled Events
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {eventsQuery.isLoading ? (
              <div className="space-y-3 p-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded" />
                ))}
              </div>
            ) : eventsQuery.error ? (
              <div className="flex flex-col items-center justify-center gap-2 p-12">
                <XCircle className="size-10 text-red-400" />
                <p className="text-sm text-muted-foreground">
                  Failed to load events
                </p>
              </div>
            ) : events.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 p-12">
                <CalendarDays className="size-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No events scheduled for this period
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="pr-6 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((ev: any) => (
                      <TableRow key={ev.id}>
                        <TableCell className="pl-6 font-medium">
                          {ev.title}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              TYPE_BADGE_COLORS[ev.eventType] ?? ""
                            )}
                          >
                            {formatType(ev.eventType)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-1.5">
                            <Clock className="size-3.5 text-muted-foreground" />
                            {ev.scheduledDate
                              ? format(new Date(ev.scheduledDate), "MMM d, yyyy")
                              : "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              PRIORITY_COLORS[ev.priority] ?? ""
                            )}
                          >
                            {ev.priority ?? "MEDIUM"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              STATUS_COLORS[ev.status] ?? ""
                            )}
                          >
                            {formatStatus(ev.status ?? "SCHEDULED")}
                          </Badge>
                        </TableCell>
                        <TableCell className="pr-6">
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-8"
                                  onClick={() => openEditDialog(ev)}
                                >
                                  <Pencil className="size-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit event</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-8 text-muted-foreground hover:text-red-500"
                                  disabled={deleteMutation.isPending}
                                  onClick={() => deleteMutation.mutate(ev.id)}
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete event</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Edit Dialog ─────────────────────────────────────── */}
        <Dialog
          open={!!editEvent}
          onOpenChange={(open) => {
            if (!open) {
              setEditEvent(null);
              resetForm();
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Calendar Event</DialogTitle>
              <DialogDescription>
                Update the scheduled event details.
              </DialogDescription>
            </DialogHeader>
            <EventForm
              formTitle={formTitle}
              formType={formType}
              formDescription={formDescription}
              formDate={formDate}
              formPriority={formPriority}
              setFormTitle={setFormTitle}
              setFormType={setFormType}
              setFormDescription={setFormDescription}
              setFormDate={setFormDate}
              setFormPriority={setFormPriority}
              onSubmit={handleUpdate}
              submitLabel="Save Changes"
              isPending={updateMutation.isPending}
              onCancel={handleCancel}
            />
          </DialogContent>
        </Dialog>

        {/* ─── Day Detail Dialog ───────────────────────────────── */}
        <Dialog
          open={!!selectedDayEvents}
          onOpenChange={(open) => {
            if (!open) setSelectedDayEvents(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedDayEvents && selectedDayEvents.length > 0
                  ? format(new Date(selectedDayEvents[0].scheduledDate), "EEEE, MMMM d, yyyy")
                  : "Events"}
              </DialogTitle>
              <DialogDescription>
                {selectedDayEvents?.length ?? 0} event(s) scheduled
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {selectedDayEvents?.map((ev: any) => (
                <div
                  key={ev.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="space-y-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ev.title}</p>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          TYPE_BADGE_COLORS[ev.eventType] ?? ""
                        )}
                      >
                        {formatType(ev.eventType)}
                      </Badge>
                      {ev.priority && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            PRIORITY_COLORS[ev.priority] ?? ""
                          )}
                        >
                          {ev.priority}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      onClick={() => {
                        setSelectedDayEvents(null);
                        openEditDialog(ev);
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
