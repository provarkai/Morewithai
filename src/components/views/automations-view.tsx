"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  Plus,
  Pencil,
  Trash2,
  Play,
  Loader2,
  XCircle,
  Zap,
  Clock,
  Hash,
  Power,
  PowerOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getAutomationRules,
  createAutomationRule,
  updateAutomationRule,
  deleteAutomationRule,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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

// ─── Helpers ────────────────────────────────────────────────────

interface ParsedCondition {
  field?: string;
  operator?: string;
  value?: string | number;
  raw?: string;
}

interface ParsedAction {
  type?: string;
  params?: Record<string, any>;
  raw?: string;
}

function parseTriggerCondition(condition: any): ParsedCondition {
  if (!condition) return { raw: "—" };
  if (typeof condition === "string") {
    try {
      const parsed = JSON.parse(condition);
      return {
        field: parsed.field,
        operator: parsed.operator,
        value: parsed.value,
      };
    } catch {
      return { raw: condition };
    }
  }
  return {
    field: condition.field,
    operator: condition.operator,
    value: condition.value,
  };
}

function parseAction(action: any): ParsedAction {
  if (!action) return { raw: "—" };
  if (typeof action === "string") {
    try {
      const parsed = JSON.parse(action);
      return {
        type: parsed.type,
        params: parsed.params,
      };
    } catch {
      return { raw: action };
    }
  }
  return {
    type: action.type,
    params: action.params,
  };
}

function TriggerDisplay({ condition }: { condition: ParsedCondition }) {
  if (condition.raw) {
    return <span className="font-mono text-xs text-muted-foreground">{condition.raw}</span>;
  }
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {condition.field && (
        <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 font-mono text-xs">
          {condition.field}
        </span>
      )}
      {condition.operator && (
        <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
          {condition.operator}
        </span>
      )}
      {condition.value != null && (
        <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 font-mono text-xs text-amber-700">
          {String(condition.value)}
        </span>
      )}
    </div>
  );
}

function ActionDisplay({ action }: { action: ParsedAction }) {
  if (action.raw) {
    return <span className="font-mono text-xs text-muted-foreground">{action.raw}</span>;
  }
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {action.type && (
        <Badge variant="outline" className="text-xs">
          {action.type.replace(/_/g, " ")}
        </Badge>
      )}
      {action.params && (
        <span className="font-mono text-xs text-muted-foreground">
          {Object.entries(action.params)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ")}
        </span>
      )}
    </div>
  );
}

function validateJson(str: string): boolean {
  if (!str.trim()) return false;
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

// ─── Rule Form (extracted) ─────────────────────────────────────

function RuleForm({
  formName,
  formTrigger,
  formAction,
  setFormName,
  setFormTrigger,
  setFormAction,
  onSubmit,
  submitLabel,
  isPending,
  onCancel,
}: {
  formName: string;
  formTrigger: string;
  formAction: string;
  setFormName: (v: string) => void;
  setFormTrigger: (v: string) => void;
  setFormAction: (v: string) => void;
  onSubmit: () => void;
  submitLabel: string;
  isPending: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <Label htmlFor="rule-name">Rule Name</Label>
        <Input
          id="rule-name"
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          placeholder="e.g. High Traffic Alert"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="rule-trigger">Trigger Condition (JSON)</Label>
        <Textarea
          id="rule-trigger"
          value={formTrigger}
          onChange={(e) => setFormTrigger(e.target.value)}
          placeholder='{"field": "traffic", "operator": ">", "value": 5000}'
          rows={4}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Define when the rule should trigger. Example:{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono">
            {'{'}&quot;field&quot;: &quot;traffic&quot;, &quot;operator&quot;: &quot;&gt;&quot;, &quot;value&quot;: 5000{'}'}
          </code>
        </p>
        {formTrigger && !validateJson(formTrigger) && (
          <p className="text-xs text-red-500">Invalid JSON format</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="rule-action">Action (JSON)</Label>
        <Textarea
          id="rule-action"
          value={formAction}
          onChange={(e) => setFormAction(e.target.value)}
          placeholder='{"type": "create_recommendation", "params": {"priority": "HIGH"}}'
          rows={4}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Define what happens when triggered. Example:{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono">
            {'{'}&quot;type&quot;: &quot;create_recommendation&quot;, &quot;params&quot;: {'{'}&quot;priority&quot;: &quot;HIGH&quot;{'}'}{'}'}
          </code>
        </p>
        {formAction && !validateJson(formAction) && (
          <p className="text-xs text-red-500">Invalid JSON format</p>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={onSubmit}
          disabled={
            !formName.trim() ||
            !validateJson(formTrigger) ||
            !validateJson(formAction) ||
            isPending
          }
        >
          {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
          {submitLabel}
        </Button>
      </DialogFooter>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────

interface AutomationsViewProps {
  siteId: string;
}

export function AutomationsView({ siteId }: AutomationsViewProps) {
  const queryClient = useQueryClient();

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [editRule, setEditRule] = useState<any | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formTrigger, setFormTrigger] = useState("");
  const [formAction, setFormAction] = useState("");

  // ─── Queries ─────────────────────────────────────────────────

  const rulesQuery = useQuery({
    queryKey: ["automation-rules", siteId],
    queryFn: () => getAutomationRules(siteId),
  });

  // ─── Mutations ───────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (data: { name: string; triggerCondition: any; action: any }) =>
      createAutomationRule(siteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
      setCreateOpen(false);
      resetForm();
      toast.success("Rule created successfully");
    },
    onError: (err) => toast.error(err.message || "Failed to create rule"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      updateAutomationRule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
      setEditRule(null);
      resetForm();
      toast.success("Rule updated");
    },
    onError: (err) => toast.error(err.message || "Failed to update rule"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAutomationRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
      toast.success("Rule deleted");
    },
    onError: (err) => toast.error(err.message || "Failed to delete rule"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateAutomationRule(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
    },
    onError: (err) => toast.error(err.message || "Failed to toggle rule"),
  });

  const evaluateMutation = useMutation({
    mutationFn: () =>
      fetch("/api/automation/rules/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId }),
        credentials: "include",
      }).then((r) => r.json()),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
      const results = data?.results ?? data;
      if (Array.isArray(results)) {
        const triggered = results.filter(
          (r: any) => r.triggered
        ).length;
        toast.success(
          `Evaluation complete: ${triggered} rule(s) triggered`
        );
      } else {
        toast.success("Rules evaluated successfully");
      }
    },
    onError: (err) => toast.error(err.message || "Failed to evaluate rules"),
  });

  // ─── Derived ─────────────────────────────────────────────────

  const rules = Array.isArray(rulesQuery.data)
    ? rulesQuery.data
    : rulesQuery.data?.rules ?? [];

  // ─── Form handlers ───────────────────────────────────────────

  function resetForm() {
    setFormName("");
    setFormTrigger("");
    setFormAction("");
  }

  function openEditDialog(rule: any) {
    setEditRule(rule);
    setFormName(rule.name ?? "");
    const triggerStr =
      typeof rule.triggerCondition === "string"
        ? rule.triggerCondition
        : JSON.stringify(rule.triggerCondition ?? {}, null, 2);
    setFormTrigger(triggerStr);
    const actionStr =
      typeof rule.action === "string"
        ? rule.action
        : JSON.stringify(rule.action ?? {}, null, 2);
    setFormAction(actionStr);
  }

  function handleCreate() {
    if (!formName.trim() || !validateJson(formTrigger) || !validateJson(formAction)) {
      toast.error("Please fill all fields with valid JSON");
      return;
    }
    createMutation.mutate({
      name: formName.trim(),
      triggerCondition: JSON.parse(formTrigger),
      action: JSON.parse(formAction),
    });
  }

  function handleUpdate() {
    if (!editRule || !formName.trim()) return;
    const data: any = { name: formName.trim() };
    if (validateJson(formTrigger)) data.triggerCondition = JSON.parse(formTrigger);
    if (validateJson(formAction)) data.action = JSON.parse(formAction);
    updateMutation.mutate({ id: editRule.id, data });
  }

  function handleCancel() {
    setCreateOpen(false);
    setEditRule(null);
    resetForm();
  }

  // ─── Render ──────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className="flex-1 space-y-6 p-6">
        {/* ─── Top Bar ────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {rules.length} rule{rules.length !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => evaluateMutation.mutate()}
              disabled={evaluateMutation.isPending}
            >
              {evaluateMutation.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Play className="mr-2 size-4" />
              )}
              Evaluate All Rules
            </Button>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 size-4" />
                  Create Rule
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create Automation Rule</DialogTitle>
                  <DialogDescription>
                    Define a trigger condition and an automated action.
                  </DialogDescription>
                </DialogHeader>
                <RuleForm
                  formName={formName}
                  formTrigger={formTrigger}
                  formAction={formAction}
                  setFormName={setFormName}
                  setFormTrigger={setFormTrigger}
                  setFormAction={setFormAction}
                  onSubmit={handleCreate}
                  submitLabel="Create"
                  isPending={createMutation.isPending}
                  onCancel={handleCancel}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* ─── Rules Table ────────────────────────────────────── */}
        <Card>
          <CardContent className="p-0">
            {rulesQuery.isLoading ? (
              <div className="space-y-3 p-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded" />
                ))}
              </div>
            ) : rulesQuery.error ? (
              <div className="flex flex-col items-center justify-center gap-2 p-12">
                <XCircle className="size-10 text-red-400" />
                <p className="text-sm text-muted-foreground">
                  Failed to load automation rules
                </p>
              </div>
            ) : rules.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 p-12">
                <Zap className="size-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No automation rules yet. Create one to automate your growth strategy.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Name</TableHead>
                      <TableHead>Trigger</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead className="text-center">Active</TableHead>
                      <TableHead>Last Triggered</TableHead>
                      <TableHead className="text-center">Runs</TableHead>
                      <TableHead className="pr-6 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.map((rule: any) => {
                      const trigger = parseTriggerCondition(rule.triggerCondition);
                      const action = parseAction(rule.action);
                      const isActive = rule.isActive !== false;

                      return (
                        <TableRow key={rule.id}>
                          <TableCell className="pl-6">
                            <div className="flex items-center gap-2">
                              <Zap className="size-4 shrink-0 text-amber-500" />
                              <span className="font-medium">{rule.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <TriggerDisplay condition={trigger} />
                          </TableCell>
                          <TableCell>
                            <ActionDisplay action={action} />
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Switch
                                checked={isActive}
                                disabled={toggleMutation.isPending}
                                onCheckedChange={(checked) =>
                                  toggleMutation.mutate({
                                    id: rule.id,
                                    isActive: checked,
                                  })
                                }
                              />
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs",
                                  isActive
                                    ? "bg-green-500/15 text-green-700 border-green-500/25"
                                    : "bg-gray-500/15 text-gray-500 border-gray-500/25"
                                )}
                              >
                                {isActive ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            {rule.lastTriggeredAt ? (
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <Clock className="size-3.5" />
                                {formatDistanceToNow(
                                  new Date(rule.lastTriggeredAt),
                                  { addSuffix: true }
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">Never</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Hash className="size-3.5 text-muted-foreground" />
                              <span className="font-mono text-sm">
                                {rule.runCount ?? 0}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="pr-6">
                            <div className="flex items-center justify-end gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="size-8"
                                    onClick={() => openEditDialog(rule)}
                                  >
                                    <Pencil className="size-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit rule</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="size-8"
                                    disabled={toggleMutation.isPending}
                                    onClick={() =>
                                      toggleMutation.mutate({
                                        id: rule.id,
                                        isActive: !isActive,
                                      })
                                    }
                                  >
                                    {isActive ? (
                                      <PowerOff className="size-3.5 text-muted-foreground" />
                                    ) : (
                                      <Power className="size-3.5 text-green-500" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {isActive ? "Deactivate" : "Activate"}
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="size-8 text-muted-foreground hover:text-red-500"
                                    disabled={deleteMutation.isPending}
                                    onClick={() => deleteMutation.mutate(rule.id)}
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete rule</TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Edit Dialog ─────────────────────────────────────── */}
        <Dialog
          open={!!editRule}
          onOpenChange={(open) => {
            if (!open) {
              setEditRule(null);
              resetForm();
            }
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Automation Rule</DialogTitle>
              <DialogDescription>
                Update the trigger condition and action for this rule.
              </DialogDescription>
            </DialogHeader>
            <RuleForm
              formName={formName}
              formTrigger={formTrigger}
              formAction={formAction}
              setFormName={setFormName}
              setFormTrigger={setFormTrigger}
              setFormAction={setFormAction}
              onSubmit={handleUpdate}
              submitLabel="Save Changes"
              isPending={updateMutation.isPending}
              onCancel={handleCancel}
            />
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
