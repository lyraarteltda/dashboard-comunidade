"use client";

import { useState } from "react";
import { AreaChart } from "@tremor/react";
import { Skeleton } from "@/components/ui/skeleton";

interface MasterChartProps {
  visitsSeries: { day: string; pageviews: number }[];
  conversionSeries: {
    day: string;
    visitors: number;
    purchases: number;
    conversion_pct: number | null;
    revenue: number;
  }[];
  refundsSeries: { day: string; count: number; amount: number }[];
  signupsSeries: { day: string; count: number }[];
  cancellationsSeries: { day: string; count: number; amount: number }[];
  loading?: boolean;
}

const METRICS = [
  { key: "Receita", label: "Receita", color: "teal" },
  { key: "Visitas", label: "Visitas", color: "cyan" },
  { key: "Compras", label: "Compras", color: "emerald" },
  { key: "Cadastros", label: "Cadastros", color: "violet" },
  { key: "Reembolsos", label: "Reembolsos", color: "rose" },
  { key: "Cancelamentos", label: "Cancelamentos", color: "amber" },
  { key: "Taxa de Conversão %", label: "Conversão %", color: "indigo" },
  { key: "Taxa de Reembolso %", label: "Reembolso %", color: "pink" },
] as const;

type MetricKey = (typeof METRICS)[number]["key"];

const COLOR_DOT: Record<string, string> = {
  teal: "bg-teal-500",
  cyan: "bg-cyan-500",
  emerald: "bg-emerald-500",
  violet: "bg-violet-500",
  rose: "bg-rose-500",
  amber: "bg-amber-500",
  indigo: "bg-indigo-500",
  pink: "bg-pink-500",
};

function formatDay(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

export function MasterChart({
  visitsSeries,
  conversionSeries,
  refundsSeries,
  signupsSeries,
  cancellationsSeries,
  loading,
}: MasterChartProps) {
  const [enabled, setEnabled] = useState<Set<MetricKey>>(
    () => new Set(METRICS.map((m) => m.key))
  );

  function toggle(key: MetricKey) {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-elevation-1)]">
        <Skeleton className="h-4 w-72 mb-4" />
        <Skeleton className="h-8 w-full mb-4 rounded-lg" />
        <Skeleton className="h-[400px] w-full rounded-lg" />
      </div>
    );
  }

  const visitsByDay = new Map(visitsSeries.map((s) => [s.day, s.pageviews]));
  const convByDay = new Map(conversionSeries.map((s) => [s.day, s]));
  const refundsByDay = new Map(refundsSeries.map((s) => [s.day, s.count]));
  const signupsByDay = new Map(signupsSeries.map((s) => [s.day, s.count]));
  const cancelByDay = new Map(
    cancellationsSeries.map((s) => [s.day, s.count])
  );

  const allDays = new Set([
    ...visitsSeries.map((s) => s.day),
    ...conversionSeries.map((s) => s.day),
    ...refundsSeries.map((s) => s.day),
    ...signupsSeries.map((s) => s.day),
    ...cancellationsSeries.map((s) => s.day),
  ]);

  const chartData = Array.from(allDays)
    .sort()
    .map((day) => {
      const conv = convByDay.get(day);
      const purchases = conv?.purchases ?? 0;
      const refCount = refundsByDay.get(day) ?? 0;
      const refundRate = purchases > 0 ? (refCount / purchases) * 100 : 0;

      return {
        dia: formatDay(day),
        Receita: conv?.revenue ?? 0,
        Visitas: visitsByDay.get(day) ?? 0,
        Compras: purchases,
        Cadastros: signupsByDay.get(day) ?? 0,
        Reembolsos: refCount,
        Cancelamentos: cancelByDay.get(day) ?? 0,
        "Taxa de Conversão %": conv?.conversion_pct ?? 0,
        "Taxa de Reembolso %": Number(refundRate.toFixed(1)),
      };
    });

  const activeMetrics = METRICS.filter((m) => enabled.has(m.key));
  const activeCategories = activeMetrics.map((m) => m.key);
  const activeColors = activeMetrics.map((m) => m.color);

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-elevation-1)]">
      <h3 className="mb-4 text-sm font-semibold text-foreground">
        Visão Geral — Todas as Métricas
      </h3>

      <div className="mb-4 flex flex-wrap gap-2">
        {METRICS.map((m) => {
          const active = enabled.has(m.key);
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => toggle(m.key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? "border border-border bg-surface-2 text-foreground"
                  : "border border-border/50 bg-surface-0 text-muted-foreground opacity-50"
              }`}
            >
              <span
                className={`inline-block h-2 w-2 rounded-full ${COLOR_DOT[m.color]}`}
              />
              {m.label}
            </button>
          );
        })}
      </div>

      {chartData.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem dados no período</p>
      ) : (
        <AreaChart
          className="h-[400px] [&_.recharts-cartesian-grid_line]:stroke-[oklch(1_0_0/0.06)] [&_.recharts-yAxis_text]:fill-[oklch(0.7_0.01_260)] [&_.recharts-xAxis_text]:fill-[oklch(0.7_0.01_260)]"
          data={chartData}
          index="dia"
          categories={activeCategories}
          colors={activeColors}
          showGradient
          curveType="monotone"
          showLegend={false}
          showYAxis
          showXAxis
          showGridLines
          yAxisWidth={72}
          autoMinValue
          valueFormatter={(v: number) => v.toLocaleString("pt-BR")}
        />
      )}
    </div>
  );
}
