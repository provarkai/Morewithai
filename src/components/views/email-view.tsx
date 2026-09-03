"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  Mail,
  Plus,
  Send,
  CalendarClock,
  Pencil,
  Trash2,
  Loader2,
  Zap,
  MousePointerClick,
  Inbox,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  getEmailCampaigns,
  getCampaignStats,
  getEmailAutomations,
  createEmailCampaign,
  deleteEmailCampaign,
  sendEmailCampaign,
  createEmailAutomation,
  deleteEmailAutomation,
} from "@/lib/api";

interface EmailViewProps {
  siteId: string;
}

const campaignStatusVariant: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  SCHEDULED: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  SENDING: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400",
  SENT: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  FAILED: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
};

const automationStatusVariant: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  PAUSED: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

const CAMPAIGN_TYPES = ["NEWSLETTER", "PROMOTIONAL", "TRANSACTIONAL", "DIGEST"] as const;
const TRIGGER_TYPES = ["SUBSCRIBED", "LEAD_CAPTURED", "PURCHASE", "MANUAL"] as const;
const DEFAULT_STEPS_JSON = JSON.stringify([
  { type: "email", delay: 0, templateId: "" },
], null, 2);

function CampaignStatCard({
  title,
  value,
  icon: Icon,
  isLoading,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  isLoading: boolean;
}) {
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
            <p className="text-2xl font-bold tabular-nums">
              {title.includes("Rate") ? `${(value * 100).toFixed(1)}%` : value.toLocaleString()}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function EmailView({ siteId }: EmailViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Campaign dialog state
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [campaignForm, setCampaignForm] = useState({
    name: "",
    type: "NEWSLETTER",
    subject: "",
    previewText: "",
    content: "",
  });

  // Automation dialog state
  const [automationDialogOpen, setAutomationDialogOpen] = useState(false);
  const [automationForm, setAutomationForm] = useState({
    name: "",
    triggerType: "SUBSCRIBED",
    steps: DEFAULT_STEPS_JSON,
  });

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ type: "campaign" | "automation"; id: string } | null>(null);

  // --- QUERIES ---
  const { data: campaignStats, isLoading: campaignStatsLoading } = useQuery({
    queryKey: ["campaign-stats", siteId],
    queryFn: () => getCampaignStats(siteId),
  });

  const { data: campaignsData, isLoading: campaignsLoading, isError: campaignsError } = useQuery({
    queryKey: ["email-campaigns", siteId],
    queryFn: () => getEmailCampaigns(siteId),
  });

  const campaigns = campaignsData?.data ?? campaignsData ?? [];

  const { data: automationsData, isLoading: automationsLoading, isError: automationsError } = useQuery({
    queryKey: ["email-automations", siteId],
    queryFn: () => getEmailAutomations(siteId),
  });

  const automations = automationsData?.data ?? automationsData ?? [];

  // --- MUTATIONS ---
  const createCampaignMutation = useMutation({
    mutationFn: (data: typeof campaignForm) => createEmailCampaign(siteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaign-stats"] });
      setCampaignDialogOpen(false);
      setCampaignForm({ name: "", type: "NEWSLETTER", subject: "", previewText: "", content: "" });
      toast({ title: "Campaign created" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: deleteEmailCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaign-stats"] });
      setDeleteTarget(null);
      toast({ title: "Campaign deleted" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const sendCampaignMutation = useMutation({
    mutationFn: sendEmailCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaign-stats"] });
      toast({ title: "Campaign sent" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const createAutomationMutation = useMutation({
    mutationFn: async (data: { name: string; triggerType: string; steps: string }) => {
      let parsedSteps;
      try {
        parsedSteps = JSON.parse(data.steps);
      } catch {
        throw new Error("Invalid JSON in steps");
      }
      return createEmailAutomation(siteId, { name: data.name, triggerType: data.triggerType, steps: parsedSteps });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-automations"] });
      setAutomationDialogOpen(false);
      setAutomationForm({ name: "", triggerType: "SUBSCRIBED", steps: DEFAULT_STEPS_JSON });
      toast({ title: "Automation created" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteAutomationMutation = useMutation({
    mutationFn: deleteEmailAutomation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-automations"] });
      setDeleteTarget(null);
      toast({ title: "Automation deleted" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <Tabs defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns" className="gap-1.5">
            <Mail className="size-4" /> Campaigns
          </TabsTrigger>
          <TabsTrigger value="automations" className="gap-1.5">
            <Zap className="size-4" /> Automations
          </TabsTrigger>
        </TabsList>

        {/* ==================== CAMPAIGNS TAB ==================== */}
        <TabsContent value="campaigns" className="space-y-6 mt-4">
          {/* Campaign Stats Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <CampaignStatCard title="Total Campaigns" value={campaignStats?.total ?? 0} icon={Mail} isLoading={campaignStatsLoading} />
            <CampaignStatCard title="Sent" value={campaignStats?.sent ?? 0} icon={Send} isLoading={campaignStatsLoading} />
            <CampaignStatCard title="Open Rate" value={campaignStats?.openRate ?? 0} icon={Inbox} isLoading={campaignStatsLoading} />
            <CampaignStatCard title="Click Rate" value={campaignStats?.clickRate ?? 0} icon={MousePointerClick} isLoading={campaignStatsLoading} />
          </div>

          {/* Campaigns Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Campaigns</CardTitle>
              <Dialog open={campaignDialogOpen} onOpenChange={setCampaignDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5">
                    <Plus className="size-4" /> New Campaign
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Create Campaign</DialogTitle>
                    <DialogDescription>Set up a new email campaign for your subscribers.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="camp-name">Name</Label>
                      <Input id="camp-name" placeholder="Weekly Newsletter #12" value={campaignForm.name} onChange={(e) => setCampaignForm((f) => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Type</Label>
                      <Select value={campaignForm.type} onValueChange={(v) => setCampaignForm((f) => ({ ...f, type: v }))}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CAMPAIGN_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="camp-subject">Subject</Label>
                      <Input id="camp-subject" placeholder="Your subject line" value={campaignForm.subject} onChange={(e) => setCampaignForm((f) => ({ ...f, subject: e.target.value }))} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="camp-preview">Preview Text</Label>
                      <Input id="camp-preview" placeholder="Brief preview shown in inbox" value={campaignForm.previewText} onChange={(e) => setCampaignForm((f) => ({ ...f, previewText: e.target.value }))} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="camp-content">Content</Label>
                      <Textarea id="camp-content" rows={5} placeholder="Email body content (HTML or plain text)..." value={campaignForm.content} onChange={(e) => setCampaignForm((f) => ({ ...f, content: e.target.value }))} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCampaignDialogOpen(false)}>Cancel</Button>
                    <Button onClick={() => createCampaignMutation.mutate(campaignForm)} disabled={createCampaignMutation.isPending || !campaignForm.name.trim()}>
                      {createCampaignMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                      Create Campaign
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                {campaignsLoading ? (
                  <div className="p-6 space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : campaignsError ? (
                  <div className="p-8 text-center">
                    <p className="text-sm text-muted-foreground">Failed to load campaigns. Please try again.</p>
                  </div>
                ) : campaigns.length === 0 ? (
                  <div className="p-8 text-center">
                    <Mail className="mx-auto size-10 text-muted-foreground/40" />
                    <p className="mt-2 text-sm font-medium text-muted-foreground">No campaigns yet</p>
                    <p className="mt-1 text-xs text-muted-foreground/70">Create your first email campaign to get started.</p>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead className="w-[100px]">Type</TableHead>
                          <TableHead className="min-w-[180px]">Subject</TableHead>
                          <TableHead className="w-[110px]">Status</TableHead>
                          <TableHead className="w-[90px] text-right">Subs</TableHead>
                          <TableHead className="w-[90px] text-right">Open %</TableHead>
                          <TableHead className="w-[90px] text-right">Click %</TableHead>
                          <TableHead className="w-[120px] text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {campaigns.map((c: Record<string, unknown>) => (
                          <TableRow key={String(c.id)}>
                            <TableCell className="font-medium text-sm truncate max-w-[160px]">{String(c.name ?? "")}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{String(c.type ?? "").replace(/_/g, " ")}</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground truncate max-w-[180px]">{String(c.subject ?? "-")}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn("text-xs", campaignStatusVariant[String(c.status)] ?? "")}>
                                {String(c.status ?? "")}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums">{Number(c.subscriberCount ?? 0).toLocaleString()}</TableCell>
                            <TableCell className="text-right text-sm tabular-nums">{c.openRate != null ? `${(Number(c.openRate) * 100).toFixed(1)}%` : "-"}</TableCell>
                            <TableCell className="text-right text-sm tabular-nums">{c.clickRate != null ? `${(Number(c.clickRate) * 100).toFixed(1)}%` : "-"}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {c.status === "DRAFT" && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 gap-1 text-xs"
                                    onClick={() => sendCampaignMutation.mutate(String(c.id))}
                                    disabled={sendCampaignMutation.isPending}
                                  >
                                    <Send className="size-3" />
                                    <span className="hidden lg:inline">Send</span>
                                  </Button>
                                )}
                                {c.status === "DRAFT" && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 gap-1 text-xs"
                                    onClick={() => toast({ title: "Schedule coming soon" })}
                                  >
                                    <CalendarClock className="size-3" />
                                    <span className="hidden lg:inline">Schedule</span>
                                  </Button>
                                )}
                                {c.status === "DRAFT" && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 gap-1 text-xs"
                                    onClick={() => toast({ title: "Edit coming soon" })}
                                  >
                                    <Pencil className="size-3" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 gap-1 text-xs text-red-600 hover:text-red-700"
                                  onClick={() => setDeleteTarget({ type: "campaign", id: String(c.id) })}
                                >
                                  <Trash2 className="size-3" />
                                </Button>
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
        </TabsContent>

        {/* ==================== AUTOMATIONS TAB ==================== */}
        <TabsContent value="automations" className="space-y-6 mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Automations</CardTitle>
              <Dialog open={automationDialogOpen} onOpenChange={setAutomationDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5">
                    <Plus className="size-4" /> New Automation
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Create Automation</DialogTitle>
                    <DialogDescription>Define a triggered email automation sequence.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="auto-name">Name</Label>
                      <Input id="auto-name" placeholder="Welcome Sequence" value={automationForm.name} onChange={(e) => setAutomationForm((f) => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Trigger Type</Label>
                      <Select value={automationForm.triggerType} onValueChange={(v) => setAutomationForm((f) => ({ ...f, triggerType: v }))}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TRIGGER_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="auto-steps">Steps (JSON)</Label>
                      <Textarea
                        id="auto-steps"
                        rows={6}
                        className="font-mono text-xs"
                        value={automationForm.steps}
                        onChange={(e) => setAutomationForm((f) => ({ ...f, steps: e.target.value }))}
                        placeholder={"[{\"type\":\"email\",\"delay\":0,\"templateId\":\"\"}]"}
                      />
                      <p className="text-xs text-muted-foreground">
                        Define automation steps as a JSON array. Each step needs at least a &quot;type&quot; and &quot;delay&quot; (in minutes).
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAutomationDialogOpen(false)}>Cancel</Button>
                    <Button onClick={() => createAutomationMutation.mutate(automationForm)} disabled={createAutomationMutation.isPending || !automationForm.name.trim()}>
                      {createAutomationMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                      Create Automation
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                {automationsLoading ? (
                  <div className="p-6 space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : automationsError ? (
                  <div className="p-8 text-center">
                    <p className="text-sm text-muted-foreground">Failed to load automations. Please try again.</p>
                  </div>
                ) : automations.length === 0 ? (
                  <div className="p-8 text-center">
                    <Zap className="mx-auto size-10 text-muted-foreground/40" />
                    <p className="mt-2 text-sm font-medium text-muted-foreground">No automations yet</p>
                    <p className="mt-1 text-xs text-muted-foreground/70">Create an automation to send emails based on triggers.</p>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead className="w-[130px]">Trigger Type</TableHead>
                          <TableHead className="w-[90px] text-center">Steps</TableHead>
                          <TableHead className="w-[110px]">Status</TableHead>
                          <TableHead className="w-[140px]">Created</TableHead>
                          <TableHead className="w-[100px] text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {automations.map((a: Record<string, unknown>) => (
                          <TableRow key={String(a.id)}>
                            <TableCell className="font-medium text-sm">{String(a.name ?? "")}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{String(a.triggerType ?? "").replace(/_/g, " ")}</Badge>
                            </TableCell>
                            <TableCell className="text-center text-sm tabular-nums">
                              {Array.isArray(a.steps) ? a.steps.length : Number(a.stepsCount ?? 0)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn("text-xs", automationStatusVariant[String(a.status)] ?? "")}>
                                {String(a.status ?? "")}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {a.createdAt ? formatDistanceToNow(new Date(String(a.createdAt)), { addSuffix: true }) : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 gap-1 text-xs"
                                  onClick={() => toast({ title: "Edit coming soon" })}
                                >
                                  <Pencil className="size-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs text-red-600 hover:text-red-700"
                                  onClick={() => setDeleteTarget({ type: "automation", id: String(a.id) })}
                                >
                                  <Trash2 className="size-3" />
                                </Button>
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
        </TabsContent>
      </Tabs>

      {/* ==================== DELETE CONFIRMATION ==================== */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type === "campaign" ? "Campaign" : "Automation"}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => {
                if (!deleteTarget) return;
                if (deleteTarget.type === "campaign") {
                  deleteCampaignMutation.mutate(deleteTarget.id);
                } else {
                  deleteAutomationMutation.mutate(deleteTarget.id);
                }
              }}
              disabled={deleteCampaignMutation.isPending || deleteAutomationMutation.isPending}
            >
              {deleteCampaignMutation.isPending || deleteAutomationMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
