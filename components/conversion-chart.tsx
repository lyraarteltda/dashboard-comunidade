"use client";

import { AreaChart } from "@tremor/react";
import { Skeleton } from "@/components/ui/skeleton";

interface ConversionSeries {
  day: string;
  visitors: number;
  purchases: number;
  conversion_pct: number | null;
}

interface ConversionTotals {
  visitors: number;
  purchases: number;
  conversion_pct: number | null;
}

interface ConversionChartProps {
  series: ConversionSeries[];
  totals: ConversionTotals | null;
  loading?: boolean;
}

function formatDay(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

export function ConversionChart({
  series,
  totals,
  loading,
}: ConversionChartProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-elevation-1)]">
        <Skeleton className="h-4 w-64 mb-2" />
        <Skeleton className="h-8 w-24 mb-1" />
        <Skeleton className="h-3 w-40 mb-6" />
        <Skeleton className="h-[220px] w-full rounded-lg" />
      </div>
    );
  }

  const chartData = series.map((s) => ({
    dia: formatDay(s.day),
    "Conversão (%)": s.conversion_pct ?? 0,
    Visitantes: s.visitors,
    Compras: s.purchases,
  }));

  const conversionDisplay =
    totals?.conversion_pct != null
      ? `${totals.conversion_pct.toFixed(2)}%`
      : "—";

  const subtitleParts: string[] = [];
  if (totals) {
    subtitleParts.push(
      `${totals.purchases} compra${totals.purchases !== 1 ? "s" : ""}`,
      `${totals.visitors.toLocaleString("pt-BR")} visitantes`
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-elevation-1)]">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Taxa de conversão LP &rarr; Compra
      </p>
      <p className="mt-1 text-3xl font-bold text-foreground tabular-nums tracking-tight">
        {conversionDisplay}
      </p>
      {subtitleParts.length > 0 && (
        <p className="mt-0.5 text-sm text-muted-foreground">
          {subtitleParts.join(" / ")}
        </p>
      )}

      <div className="mt-5">
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sem dados no período
          </p>
        ) : (
          <AreaChart
            className="h-[220px] [&_.recharts-cartesian-grid_line]:stroke-[oklch(1_0_0/0.06)] [&_.recharts-yAxis_text]:fill-[oklch(0.7_0.01_260)] [&_.recharts-xAxis_text]:fill-[oklch(0.7_0.01_260)]"
            data={chartData}
            index="dia"
            categories={["Conversão (%)"]}
            colors={["amber"]}
            showGradient
            curveType="monotone"
            showLegend={false}
            showYAxis
            showXAxis
            showGridLines
            yAxisWidth={40}
            valueFormatter={(v: number) => `${v.toFixed(2)}%`}
            customTooltip={({ payload, active }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0]?.payload;
              if (!d) return null;
              return (
                <div className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs shadow-[var(--shadow-elevation-2)]">
                  <p className="font-semibold text-foreground">{d.dia}</p>
                  <p className="mt-1 text-amber-400">
                    Conversão: {d["Conversão (%)"].toFixed(2)}%
                  </p>
                  <p className="text-muted-foreground">
                    {d.Compras} compra{d.Compras !== 1 ? "s" : ""} /{" "}
                    {d.Visitantes.toLocaleString("pt-BR")} visitantes
                  </p>
                </div>
              );
            }}
            autoMinValue
          />
        )}
      </div>
    </div>
  );
}
