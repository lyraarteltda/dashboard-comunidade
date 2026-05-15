"use client";

import { AreaChart } from "@tremor/react";
import { Skeleton } from "@/components/ui/skeleton";

interface ViewsVsPurchasesChartProps {
  visitsSeries: { day: string; pageviews: number }[];
  conversionSeries: { day: string; purchases: number }[];
  loading?: boolean;
}

function formatDay(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

export function ViewsVsPurchasesChart({
  visitsSeries,
  conversionSeries,
  loading,
}: ViewsVsPurchasesChartProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-elevation-1)]">
        <Skeleton className="h-4 w-64 mb-6" />
        <Skeleton className="h-[280px] w-full rounded-lg" />
      </div>
    );
  }

  const purchasesByDay = new Map(
    conversionSeries.map((s) => [s.day, s.purchases])
  );

  const allDays = new Set([
    ...visitsSeries.map((s) => s.day),
    ...conversionSeries.map((s) => s.day),
  ]);

  const viewsByDay = new Map(
    visitsSeries.map((s) => [s.day, s.pageviews])
  );

  const chartData = Array.from(allDays)
    .sort()
    .map((day) => ({
      dia: formatDay(day),
      Visitas: viewsByDay.get(day) ?? 0,
      Compras: purchasesByDay.get(day) ?? 0,
    }));

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-elevation-1)]">
      <h3 className="mb-5 text-sm font-semibold text-foreground">
        Visitas vs Novas Compras por dia
      </h3>
      {chartData.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem dados no período</p>
      ) : (
        <AreaChart
          className="h-[280px] [&_.recharts-cartesian-grid_line]:stroke-[oklch(1_0_0/0.06)] [&_.recharts-yAxis_text]:fill-[oklch(0.7_0.01_260)] [&_.recharts-xAxis_text]:fill-[oklch(0.7_0.01_260)]"
          data={chartData}
          index="dia"
          categories={["Visitas", "Compras"]}
          colors={["sky", "emerald"]}
          showGradient
          curveType="monotone"
          showLegend
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
