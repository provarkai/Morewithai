"use client";

import { Twitter, Linkedin, Facebook, Link2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface BlogShareProps {
  title: string;
  url?: string;
}

export function BlogShare({ title, url }: BlogShareProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");
  const encodedTitle = encodeURIComponent(title);
  const encodedUrl = encodeURIComponent(shareUrl);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const links = [
    { icon: Twitter, label: "Twitter", href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`, color: "hover:text-sky-500" },
    { icon: Linkedin, label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`, color: "hover:text-blue-600" },
    { icon: Facebook, label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, color: "hover:text-indigo-500" },
  ];

  return (
    <div className="flex items-center gap-1">
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <Button
            key={link.label}
            variant="ghost"
            size="icon"
            className={`size-9 ${link.color}`}
            asChild
          >
            <a href={link.href} target="_blank" rel="noopener noreferrer" aria-label={link.label}>
              <Icon className="size-4" />
            </a>
          </Button>
        );
      })}
      <Button variant="ghost" size="icon" className="size-9" onClick={copyLink}>
        {copied ? <Check className="size-4 text-emerald-500" /> : <Link2 className="size-4" />}
      </Button>
    </div>
  );
}
