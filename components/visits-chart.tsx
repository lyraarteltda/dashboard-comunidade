"use client";

import { AreaChart } from "@tremor/react";
import { Skeleton } from "@/components/ui/skeleton";

interface VisitsChartProps {
  series: { day: string; pageviews: number }[];
  loading?: boolean;
}

function formatDay(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

export function VisitsChart({ series, loading }: VisitsChartProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-elevation-1)]">
        <Skeleton className="h-4 w-48 mb-6" />
        <Skeleton className="h-[220px] w-full rounded-lg" />
      </div>
    );
  }

  const chartData = series.map((s) => ({
    dia: formatDay(s.day),
    Visitas: s.pageviews,
  }));

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-elevation-1)]">
      <h3 className="mb-5 text-sm font-semibold text-foreground">
        Visitas por dia
      </h3>
      {chartData.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem dados no período</p>
      ) : (
        <AreaChart
          className="h-[220px] [&_.recharts-cartesian-grid_line]:stroke-[oklch(1_0_0/0.06)] [&_.recharts-yAxis_text]:fill-[oklch(0.7_0.01_260)] [&_.recharts-xAxis_text]:fill-[oklch(0.7_0.01_260)]"
          data={chartData}
          index="dia"
          categories={["Visitas"]}
          colors={["sky"]}
          showGradient
          curveType="monotone"
          showLegend={false}
          showYAxis
          showXAxis
          showGridLines
          yAxisWidth={44}
          valueFormatter={(v: number) => v.toLocaleString("pt-BR")}
          autoMinValue
        />
      )}
    </div>
  );
}
