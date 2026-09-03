"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis, Cell } from "recharts";

const SCORE_COLORS = {
  '0-20': 'hsl(0, 70%, 55%)',
  '21-40': 'hsl(25, 80%, 55%)',
  '41-60': 'hsl(45, 90%, 50%)',
  '61-80': 'hsl(160, 60%, 45%)',
  '81-100': 'hsl(160, 80%, 35%)',
};

const chartConfig: ChartConfig = {
  count: { label: 'Articles' },
  '0-20': { label: '0-20 (Poor)', color: SCORE_COLORS['0-20'] },
  '21-40': { label: '21-40 (Below Avg)', color: SCORE_COLORS['21-40'] },
  '41-60': { label: '41-60 (Average)', color: SCORE_COLORS['41-60'] },
  '61-80': { label: '61-80 (Good)', color: SCORE_COLORS['61-80'] },
  '81-100': { label: '81-100 (Excellent)', color: SCORE_COLORS['81-100'] },
};

interface QualityOverviewProps {
  avgSeoScore: number | null;
  avgQualityScore: number | null;
  scoreDistribution?: { range: string; count: number }[];
}

// Static demo distribution — real data would come from a dedicated API
const DEFAULT_DISTRIBUTION = [
  { range: '0-20', count: 0 },
  { range: '21-40', count: 1 },
  { range: '41-60', count: 3 },
  { range: '61-80', count: 5 },
  { range: '81-100', count: 2 },
];

function getScoreColor(score: number | null): string {
  if (score === null) return 'text-muted-foreground';
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-sky-600';
  if (score >= 40) return 'text-amber-600';
  return 'text-red-600';
}

function getScoreLabel(score: number | null): string {
  if (score === null) return 'N/A';
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Average';
  return 'Needs Work';
}

export function QualityOverview({ avgSeoScore, avgQualityScore, scoreDistribution }: QualityOverviewProps) {
  const data = scoreDistribution || DEFAULT_DISTRIBUTION;
  const chartData = data.map((d) => ({
    range: d.range,
    count: d.count,
    fill: SCORE_COLORS[d.range as keyof typeof SCORE_COLORS] || '#999',
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Quality Overview</CardTitle>
        <CardDescription>SEO & quality score distribution</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Score summaries */}
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Avg SEO Score</p>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${getScoreColor(avgSeoScore)}`}>
                {avgSeoScore ?? '—'}
              </span>
              <span className="text-xs text-muted-foreground">/ 100</span>
            </div>
            <p className={`text-xs mt-0.5 ${getScoreColor(avgSeoScore)}`}>{getScoreLabel(avgSeoScore)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Avg Quality Score</p>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${getScoreColor(avgQualityScore)}`}>
                {avgQualityScore ?? '—'}
              </span>
              <span className="text-xs text-muted-foreground">/ 100</span>
            </div>
            <p className={`text-xs mt-0.5 ${getScoreColor(avgQualityScore)}`}>{getScoreLabel(avgQualityScore)}</p>
          </div>
        </div>

        {/* Distribution chart */}
        <ChartContainer config={chartConfig} className="h-[140px] w-full">
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <XAxis dataKey="range" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
            <ChartTooltip content={<ChartTooltipContent nameKey="range" />} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}