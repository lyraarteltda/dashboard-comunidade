"use client";

import { AreaChart } from "@tremor/react";
import { Skeleton } from "@/components/ui/skeleton";

interface RefundsChartProps {
  series: { day: string; count: number; amount: number }[];
  loading?: boolean;
}

function formatDay(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

export function RefundsChart({ series, loading }: RefundsChartProps) {
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
    Reembolsos: s.count,
    "Valor (R$)": s.amount,
  }));

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-elevation-1)]">
      <h3 className="mb-5 text-sm font-semibold text-foreground">
        Reembolsos por dia
      </h3>
      {chartData.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem reembolsos no período</p>
      ) : (
        <AreaChart
          className="h-[220px] [&_.recharts-cartesian-grid_line]:stroke-[oklch(1_0_0/0.06)] [&_.recharts-yAxis_text]:fill-[oklch(0.7_0.01_260)] [&_.recharts-xAxis_text]:fill-[oklch(0.7_0.01_260)]"
          data={chartData}
          index="dia"
          categories={["Reembolsos"]}
          colors={["rose"]}
          showGradient
          curveType="monotone"
          showLegend={false}
          showYAxis
          showXAxis
          showGridLines
          yAxisWidth={36}
          valueFormatter={(v: number) => v.toLocaleString("pt-BR")}
          customTooltip={({ payload, active }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0]?.payload;
            if (!d) return null;
            return (
              <div className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs shadow-[var(--shadow-elevation-2)]">
                <p className="font-semibold text-foreground">{d.dia}</p>
                <p className="mt-1 text-rose-400">
                  {d.Reembolsos} reembolso{d.Reembolsos !== 1 ? "s" : ""}
                </p>
                <p className="text-muted-foreground">
                  R$ {d["Valor (R$)"].toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
            );
          }}
          autoMinValue
        />
      )}
    </div>
  );
}
