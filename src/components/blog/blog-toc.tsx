"use client";

import { useState, useEffect } from "react";
import { List } from "lucide-react";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface BlogTocProps {
  contentHtml: string;
}

export function BlogToc({ contentHtml }: BlogTocProps) {
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(contentHtml, "text/html");
    const headings = doc.querySelectorAll("h2, h3");
    const toc: TocItem[] = [];
    headings.forEach((h) => {
      const id = h.textContent?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "";
      toc.push({ id, text: h.textContent || "", level: parseInt(h.tagName[1]) });
    });
    setItems(toc);
  }, [contentHtml]);

  useEffect(() => {
    if (items.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px" }
    );
    // Observe actual headings in the DOM
    const articleEl = document.querySelector("[data-article-content]");
    if (articleEl) {
      const headings = articleEl.querySelectorAll("h2, h3");
      headings.forEach((h, i) => {
        h.id = items[i]?.id || h.id || `heading-${i}`;
        observer.observe(h);
      });
    }
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <nav className="rounded-lg border bg-card p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <List className="size-4" />
        Table of Contents
      </div>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id} style={{ paddingLeft: item.level === 3 ? "1rem" : 0 }}>
            <a
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById(item.id);
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={`block text-sm py-0.5 transition-colors hover:text-primary ${
                activeId === item.id ? "font-medium text-primary" : "text-muted-foreground"
              }`}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
