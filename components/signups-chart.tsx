"use client";

import { AreaChart } from "@tremor/react";
import { Skeleton } from "@/components/ui/skeleton";

interface SignupsChartProps {
  series: { day: string; count: number }[];
  loading?: boolean;
}

function formatDay(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

export function SignupsChart({ series, loading }: SignupsChartProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-elevation-1)]">
        <Skeleton className="h-4 w-56 mb-6" />
        <Skeleton className="h-[220px] w-full rounded-lg" />
      </div>
    );
  }

  const chartData = series.map((s) => ({
    dia: formatDay(s.day),
    Cadastros: s.count,
  }));

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-elevation-1)]">
      <h3 className="mb-5 text-sm font-semibold text-foreground">
        Cadastros diários — Comunidade Gratuita
      </h3>
      {chartData.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem dados no período</p>
      ) : (
        <AreaChart
          className="h-[220px]"
          data={chartData}
          index="dia"
          categories={["Cadastros"]}
          colors={["amber"]}
          showGradient
          curveType="monotone"
          showLegend={false}
          showYAxis
          showXAxis
          showGridLines={false}
          yAxisWidth={36}
          valueFormatter={(v: number) => v.toLocaleString("pt-BR")}
          autoMinValue
        />
      )}
    </div>
  );
}
