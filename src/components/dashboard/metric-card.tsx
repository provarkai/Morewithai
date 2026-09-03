"use client";

import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  subtitle?: string;
  trend?: { value: number; label: string };
  onClick?: () => void;
}

export function MetricCard({ title, value, icon: Icon, color, bgColor, subtitle, onClick }: MetricCardProps) {
  return (
    <Card className={cn("transition-shadow hover:shadow-md", onClick && "cursor-pointer")} onClick={onClick}>
      <CardContent className="flex items-center gap-4 p-4">
        <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", bgColor)}>
          <Icon className={cn("size-5", color)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground truncate">{title}</p>
          <p className="text-2xl font-bold tabular-nums">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}