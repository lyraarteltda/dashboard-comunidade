"use client";

import { AreaChart } from "@tremor/react";
import { Skeleton } from "@/components/ui/skeleton";

interface RefundRateChartProps {
  purchases: { day: string; purchases: number }[];
  refunds: { day: string; count: number }[];
  loading?: boolean;
}

function formatDay(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

export function RefundRateChart({ purchases, refunds, loading }: RefundRateChartProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-elevation-1)]">
        <Skeleton className="h-4 w-48 mb-6" />
        <Skeleton className="h-[220px] w-full rounded-lg" />
      </div>
    );
  }

  const purchasesByDay = new Map(purchases.map((p) => [p.day, p.purchases]));
  const refundsByDay = new Map(refunds.map((r) => [r.day, r.count]));
  const allDays = [
    ...new Set([...purchasesByDay.keys(), ...refundsByDay.keys()]),
  ].sort();

  const chartData = allDays.map((day) => {
    const p = purchasesByDay.get(day) ?? 0;
    const r = refundsByDay.get(day) ?? 0;
    const rate = p > 0 ? Math.round((r / p) * 10000) / 100 : 0;
    return {
      dia: formatDay(day),
      "Taxa de Reembolso (%)": rate,
      _purchases: p,
      _refunds: r,
    };
  });

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-elevation-1)]">
      <h3 className="mb-5 text-sm font-semibold text-foreground">
        Taxa de reembolso por dia
      </h3>
      {chartData.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem dados no período</p>
      ) : (
        <AreaChart
          className="h-[220px] [&_.recharts-cartesian-grid_line]:stroke-[oklch(1_0_0/0.06)] [&_.recharts-yAxis_text]:fill-[oklch(0.7_0.01_260)] [&_.recharts-xAxis_text]:fill-[oklch(0.7_0.01_260)]"
          data={chartData}
          index="dia"
          categories={["Taxa de Reembolso (%)"]}
          colors={["rose"]}
          showGradient
          curveType="monotone"
          showLegend={false}
          showYAxis
          showXAxis
          showGridLines
          yAxisWidth={48}
          valueFormatter={(v: number) => `${v.toFixed(2)}%`}
          customTooltip={({ payload, active }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0]?.payload;
            if (!d) return null;
            return (
              <div className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs shadow-[var(--shadow-elevation-2)]">
                <p className="font-semibold text-foreground">{d.dia}</p>
                <p className="mt-1 text-rose-400">
                  {d["Taxa de Reembolso (%)"].toFixed(2)}%
                </p>
                <p className="text-muted-foreground">
                  {d._refunds} reembolso{d._refunds !== 1 ? "s" : ""} / {d._purchases} compra
                  {d._purchases !== 1 ? "s" : ""}
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
