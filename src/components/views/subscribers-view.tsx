"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  Users,
  UserPlus,
  UserMinus,
  UserCheck,
  Plus,
  Search,
  Ban,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  getSubscriberStats,
  getSubscribers,
  unsubscribeSubscriber,
  deleteSubscriber,
} from "@/lib/api";

interface SubscribersViewProps {
  siteId: string;
}

const statusVariant: Record<string, { label: string; className: string }> = {
  SUBSCRIBED: { label: "Subscribed", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" },
  UNSUBSCRIBED: { label: "Unsubscribed", className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400" },
  BOUNCED: { label: "Bounced", className: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" },
  SUPPRESSED: { label: "Suppressed", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" },
};

const SOURCE_OPTIONS = ["ARTICLE", "POPUP", "LEAD_MAGNET", "LANDING_PAGE", "CHECKOUT", "MANUAL"] as const;

function StatCard({ title, value, icon: Icon, isLoading }: { title: string; value: number; icon: React.ElementType; isLoading: boolean }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="size-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground truncate">{title}</p>
          {isLoading ? (
            <Skeleton className="h-7 w-16" />
          ) : (
            <p className="text-2xl font-bold tabular-nums">{value.toLocaleString()}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function SubscribersView({ siteId }: SubscribersViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ email: "", firstName: "", source: "MANUAL" });

  // Suppress dialog state
  const [suppressId, setSuppressId] = useState<string | null>(null);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["subscriber-stats", siteId],
    queryFn: () => getSubscriberStats(siteId),
  });

  const { data: subscribersData, isLoading: subscribersLoading, isError } = useQuery({
    queryKey: ["subscribers", siteId, search],
    queryFn: () => getSubscribers(siteId, search ? { search } : undefined),
  });

  const subscribers = subscribersData?.data ?? subscribersData ?? [];

  const createMutation = useMutation({
    mutationFn: async (data: { email: string; firstName: string; source: string }) => {
      const res = await fetch("/api/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, siteId }),
        credentials: "include",
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({ error: "Failed" }));
        throw new Error(d.error || "Failed to create subscriber");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscribers"] });
      queryClient.invalidateQueries({ queryKey: ["subscriber-stats"] });
      setDialogOpen(false);
      setForm({ email: "", firstName: "", source: "MANUAL" });
      toast({ title: "Subscriber created" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const unsubscribeMutation = useMutation({
    mutationFn: unsubscribeSubscriber,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscribers"] });
      queryClient.invalidateQueries({ queryKey: ["subscriber-stats"] });
      toast({ title: "Subscriber unsubscribed" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const suppressMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/subscribers/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "suppress" }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to suppress subscriber");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscribers"] });
      queryClient.invalidateQueries({ queryKey: ["subscriber-stats"] });
      setSuppressId(null);
      toast({ title: "Subscriber suppressed" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleCreate = () => {
    if (!form.email.trim()) return;
    createMutation.mutate(form);
  };

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Subscribers" value={stats?.total ?? 0} icon={Users} isLoading={statsLoading} />
        <StatCard title="This Month New" value={stats?.thisMonthNew ?? 0} icon={UserPlus} isLoading={statsLoading} />
        <StatCard title="Unsubscribed This Month" value={stats?.thisMonthUnsubscribed ?? 0} icon={UserMinus} isLoading={statsLoading} />
        <StatCard title="Active Subscribers" value={stats?.active ?? 0} icon={UserCheck} isLoading={statsLoading} />
      </div>

      {/* Subscribers Table */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by email or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <Plus className="size-4" /> Add Subscriber
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Subscriber</DialogTitle>
                  <DialogDescription>Manually add a new subscriber to your list.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="sub-email">Email</Label>
                    <Input
                      id="sub-email"
                      type="email"
                      placeholder="subscriber@example.com"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="sub-name">First Name</Label>
                    <Input
                      id="sub-name"
                      placeholder="John"
                      value={form.firstName}
                      onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Source</Label>
                    <Select value={form.source} onValueChange={(v) => setForm((f) => ({ ...f, source: v }))}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent>
                        {SOURCE_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreate} disabled={createMutation.isPending || !form.email.trim()}>
                    {createMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                    Add Subscriber
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Table */}
          <div className="mt-4 rounded-md border">
            {subscribersLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : isError ? (
              <div className="p-8 text-center">
                <p className="text-sm text-muted-foreground">Failed to load subscribers. Please try again.</p>
              </div>
            ) : subscribers.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="mx-auto size-10 text-muted-foreground/40" />
                <p className="mt-2 text-sm font-medium text-muted-foreground">No subscribers yet</p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  {search ? "No results match your search." : "Add your first subscriber to get started."}
                </p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Email</TableHead>
                      <TableHead className="w-[140px]">Name</TableHead>
                      <TableHead className="w-[120px]">Status</TableHead>
                      <TableHead className="w-[110px]">Source</TableHead>
                      <TableHead className="w-[140px]">Consent Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscribers.map((sub: Record<string, unknown>) => (
                      <TableRow key={String(sub.id)}>
                        <TableCell className="font-medium text-sm truncate max-w-[200px]">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate">{String(sub.email ?? "")}</span>
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">{String(sub.firstName ?? "-")}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn("text-xs", statusVariant[String(sub.status)]?.className)}
                          >
                            {statusVariant[String(sub.status)]?.label ?? String(sub.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {String(sub.source ?? "-").replace(/_/g, " ")}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {sub.consentDate
                            ? formatDistanceToNow(new Date(String(sub.consentDate)), { addSuffix: true })
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {sub.status !== "UNSUBSCRIBED" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 gap-1 text-xs"
                                onClick={() => unsubscribeMutation.mutate(String(sub.id))}
                                disabled={unsubscribeMutation.isPending}
                              >
                                <Ban className="size-3" />
                                <span className="hidden sm:inline">Unsub</span>
                              </Button>
                            )}
                            {sub.status !== "SUPPRESSED" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 gap-1 text-xs text-red-600 hover:text-red-700"
                                onClick={() => setSuppressId(String(sub.id))}
                              >
                                <Ban className="size-3" />
                                <span className="hidden sm:inline">Suppress</span>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Suppress Confirmation */}
      <AlertDialog open={!!suppressId} onOpenChange={(open) => !open && setSuppressId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suppress Subscriber</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the subscriber as suppressed. They will no longer receive any emails.
              This action can be undone later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => suppressId && suppressMutation.mutate(suppressId)}
              disabled={suppressMutation.isPending}
            >
              {suppressMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Suppress
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
