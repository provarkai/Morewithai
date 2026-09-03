"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Layers, Loader2, CheckSquare, Trash2, Tag, FolderOpen, Clock, Download, Search } from "lucide-react";

interface BulkOperationsViewProps { siteId: string; }

export default function BulkOperationsView({ siteId }: BulkOperationsViewProps) {
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>("");
  const [tagInput, setTagInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["bulk-articles", siteId],
    queryFn: async () => {
      const res = await fetch(`/api/bulk?siteId=${siteId}&action=select&limit=100`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const bulkMutation = useMutation({
    mutationFn: async () => {
      const params: Record<string, unknown> = {};
      if (bulkAction === "ADD_TAGS") params.tagNames = tagInput.split(",").map((t) => t.trim()).filter(Boolean);
      if (bulkAction === "UPDATE_STATUS") params.status = "PUBLISHED";
      const res = await fetch("/api/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ siteId, action: bulkAction, articleIds: Array.from(selectedIds), params }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (op) => {
      toast({ title: `Bulk operation started`, description: `${op.totalArticles} articles processing...` });
      setSelectedIds(new Set());
      setBulkAction("");
      refetch();
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const articles = (data?.articles || []).filter((a: any) =>
    !searchQuery || a.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleAll = () => {
    if (selectedIds.size === articles.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(articles.map((a: any) => a.id)));
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const ACTIONS = [
    { value: "ADD_TAGS", label: "Add Tags", icon: Tag, color: "text-blue-500" },
    { value: "UPDATE_CATEGORY", label: "Change Category", icon: FolderOpen, color: "text-emerald-500" },
    { value: "UPDATE_STATUS", label: "Change Status", icon: Clock, color: "text-violet-500" },
    { value: "DELETE", label: "Delete", icon: Trash2, color: "text-red-500" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Layers className="size-6" /> Bulk Operations</h1>
        <p className="text-muted-foreground text-sm mt-1">Select multiple articles and apply batch changes</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search articles..." className="pl-9" />
        </div>
        <Button variant="outline" size="sm" onClick={toggleAll}>
          <CheckSquare className="size-3.5 mr-1" /> {selectedIds.size === articles.length ? "Deselect All" : "Select All"}
        </Button>
        <Badge variant="secondary">{selectedIds.size} selected</Badge>
      </div>

      <div className="flex gap-2 flex-wrap">
        {ACTIONS.map(({ value, label, icon: Icon, color }) => (
          <Button key={value} variant={bulkAction === value ? "default" : "outline"} size="sm"
            onClick={() => setBulkAction(bulkAction === value ? "" : value)}>
            <Icon className={`size-3.5 mr-1 ${color}`} /> {label}
          </Button>
        ))}
      </div>

      {bulkAction === "ADD_TAGS" && (
        <div className="flex gap-2 items-center">
          <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="Tag names, comma-separated" className="max-w-xs" />
          <Button size="sm" onClick={() => bulkMutation.mutate()} disabled={selectedIds.size === 0 || !tagInput.trim() || bulkMutation.isPending}>
            {bulkMutation.isPending ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
            Apply to {selectedIds.size}
          </Button>
        </div>
      )}

      {bulkAction && bulkAction !== "ADD_TAGS" && (
        <Button size="sm" onClick={() => bulkMutation.mutate()} disabled={selectedIds.size === 0 || bulkMutation.isPending}
          variant={bulkAction === "DELETE" ? "destructive" : "default"}>
          {bulkMutation.isPending ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
          {bulkAction} ({selectedIds.size} articles)
        </Button>
      )}

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Articles ({articles.length})</CardTitle></CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-380px)]">
            <div className="space-y-1">
              {isLoading ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="size-4 animate-spin" /></div>
              ) : articles.map((article: any) => (
                <div key={article.id} className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${selectedIds.has(article.id) ? "bg-primary/5" : "hover:bg-muted"}`}
                  onClick={() => toggleOne(article.id)}>
                  <Checkbox checked={selectedIds.has(article.id)} onCheckedChange={() => toggleOne(article.id)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{article.title}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{article.status}</Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
