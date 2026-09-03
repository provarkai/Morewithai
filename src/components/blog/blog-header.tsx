"use client";

import { Bot, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BlogHeader({ siteName, onGoAdmin }: { siteName: string; onGoAdmin: () => void }) {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Bot className="size-4" />
          </div>
          <span className="text-lg font-bold">{siteName}</span>
        </div>
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={onGoAdmin}>
          <Shield className="size-3.5" />
          Admin
        </Button>
      </div>
    </header>
  );
}