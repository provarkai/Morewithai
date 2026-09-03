"use client";

import { Bot } from "lucide-react";

export function BlogFooter({ siteName }: { siteName: string }) {
  return (
    <footer className="mt-auto border-t bg-muted/30">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Bot className="size-4" />
          <span>{siteName} &mdash; AI-Powered Blog</span>
        </div>
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} {siteName}. Content enhanced by AI.
        </p>
      </div>
    </footer>
  );
}