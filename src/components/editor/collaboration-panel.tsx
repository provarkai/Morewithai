"use client";

import { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Users, Loader2, UserPlus, UserMinus, Wifi, WifiOff, Pencil } from "lucide-react";

interface CollaborationPanelProps {
  articleId: string;
  siteId: string;
}

export function CollaborationPanel({ articleId, siteId }: CollaborationPanelProps) {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [currentUser] = useState({ id: `user-${Date.now()}`, name: "You" });

  const { data: session, refetch: refetchSession } = useQuery({
    queryKey: ["collaboration", articleId],
    queryFn: async () => {
      const res = await fetch(`/api/collaboration?articleId=${articleId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load session");
      return res.json();
    },
    refetchInterval: isConnected ? 5000 : false, // Poll every 5s when connected
  });

  const { data: config } = useQuery({
    queryKey: ["collab-config", articleId],
    queryFn: async () => {
      const res = await fetch(`/api/collaboration?articleId=${articleId}&action=config`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load config");
      return res.json();
    },
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/collaboration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "join",
          articleId,
          userId: currentUser.id,
          userName: currentUser.name,
        }),
      });
      if (!res.ok) throw new Error("Failed to join session");
      return res.json();
    },
    onSuccess: () => {
      setIsConnected(true);
      toast({ title: "Joined session", description: "You are now collaborating in real-time" });
      refetchSession();
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/collaboration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "leave",
          articleId,
          userId: currentUser.id,
        }),
      });
      if (!res.ok) throw new Error("Failed to leave session");
      return res.json();
    },
    onSuccess: () => {
      setIsConnected(false);
      toast({ title: "Left session" });
      refetchSession();
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const activeUsers = session?.activeUsers || [];
  const userCount = activeUsers.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="size-4 text-indigo-500" />
              Collaborate
            </CardTitle>
            <CardDescription>Real-time collaborative editing</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Badge variant="default" className="gap-1 bg-emerald-500">
                <Wifi className="size-3" /> Live
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1">
                <WifiOff className="size-3" /> Offline
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        {!isConnected ? (
          <div className="text-center space-y-3">
            <Users className="size-8 mx-auto opacity-30" />
            <p className="text-sm text-muted-foreground">
              Start a collaboration session to edit this article with your team in real-time.
            </p>
            <Button
              size="sm"
              onClick={() => joinMutation.mutate()}
              disabled={joinMutation.isPending}
            >
              {joinMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin mr-1" />
              ) : (
                <UserPlus className="size-3.5 mr-1" />
              )}
              Start Session
            </Button>
          </div>
        ) : (
          <>
            {/* Active Users */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">Active Editors ({userCount})</h4>
                <Button size="sm" variant="outline" onClick={() => leaveMutation.mutate()} disabled={leaveMutation.isPending}>
                  <UserMinus className="size-3.5 mr-1" /> Leave
                </Button>
              </div>
              <ScrollArea className="max-h-[200px]">
                <div className="space-y-2">
                  {activeUsers.map((user: any) => (
                    <div key={user.userId} className="flex items-center gap-2 rounded-md border p-2">
                      <Avatar className="size-7">
                        <AvatarFallback
                          className="text-[10px] text-white"
                          style={{ backgroundColor: user.color || "#6366f1" }}
                        >
                          {user.name?.charAt(0)?.toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{user.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {user.isActive ? (
                            <span className="flex items-center gap-1">
                              <Pencil className="size-2.5" /> Editing
                            </span>
                          ) : (
                            "Away"
                          )}
                        </p>
                      </div>
                      {user.isActive && (
                        <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Collaboration Info */}
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
              <p>💡 Changes are synced in real-time via Y.js CRDT.</p>
              <p>Each editor sees live cursors with color-coded selections.</p>
              {session?.maxUsers && (
                <p>Max collaborators: {session.maxUsers}</p>
              )}
            </div>

            {/* Document Info */}
            {config && (
              <div className="text-[10px] text-muted-foreground space-y-0.5">
                <p>Document: {config.documentId}</p>
                <p>WebRTC: {config.serverUrl ? "Server-mediated" : "Peer-to-peer"}</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
