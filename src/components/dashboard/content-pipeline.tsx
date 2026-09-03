"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis, Cell } from "recharts";

const PIPELINE_COLORS: Record<string, string> = {
  Idea: "hsl(200, 20%, 65%)",
  Fetched: "hsl(215, 20%, 65%)",
  Researching: "hsl(220, 50%, 60%)",
  Outline: "hsl(250, 40%, 65%)",
  Draft: "hsl(190, 50%, 55%)",
  "AI Review": "hsl(270, 50%, 60%)",
  Review: "hsl(38, 92%, 50%)",
  Approved: "hsl(45, 93%, 47%)",
  Scheduled: "hsl(25, 95%, 53%)",
  Published: "hsl(160, 60%, 40%)",
  Updating: "hsl(280, 60%, 55%)",
  Updated: "hsl(200, 70%, 50%)",
  Failed: "hsl(0, 70%, 55%)",
  Archived: "hsl(0, 0%, 60%)",
};

const chartConfig: ChartConfig = {
  count: { label: "Articles" },
};

Object.entries(PIPELINE_COLORS).forEach(([key, color]) => {
  (chartConfig as any)[key] = { label: key, color };
});

interface ContentPipelineProps {
  statusBreakdown: { status: string; count: number }[];
  totalArticles: number;
}

export function ContentPipeline({ statusBreakdown, totalArticles }: ContentPipelineProps) {
  const chartData = statusBreakdown.map((item) => ({
    status: item.status,
    count: item.count,
    fill: PIPELINE_COLORS[item.status] || "hsl(0, 0%, 70%)",
  }));

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Content Pipeline</CardTitle>
        <CardDescription>Articles by lifecycle stage ({totalArticles} total)</CardDescription>
      </CardHeader>
      <CardContent>
        {totalArticles === 0 ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
            No articles yet. Create your first article to see the pipeline.
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[240px] w-full">
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <XAxis dataKey="status" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent nameKey="status" />} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}