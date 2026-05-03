"use client";

import { BarList } from "@tremor/react";
import { Skeleton } from "@/components/ui/skeleton";

interface UtmContentBarsChartProps {
  data: { value: string; count: number }[];
  loading?: boolean;
}

export function UtmContentBarsChart({ data, loading }: UtmContentBarsChartProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-elevation-1)]">
        <Skeleton className="h-4 w-64 mb-6" />
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  const items = data
    .slice(0, 15)
    .map((d) => ({ name: d.value, value: d.count }));

  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-elevation-1)]">
      <div className="mb-5 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Vendas por UTM Content
        </h3>
        <span className="text-xs text-muted-foreground">
          {total} {total === 1 ? "venda" : "vendas"}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem dados no período</p>
      ) : (
        <BarList
          data={items}
          color="fuchsia"
          valueFormatter={(v: number) => v.toLocaleString("pt-BR")}
          className="[&_a]:text-foreground [&_p]:text-muted-foreground"
        />
      )}
    </div>
  );
}
