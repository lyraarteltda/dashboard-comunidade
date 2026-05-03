"use client";

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
            <Skeleton key={i} className="h-7 w-full rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  const items = data.slice(0, 15);
  const max = items[0]?.count ?? 0;
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
        <ul className="space-y-2">
          {items.map((it) => {
            const pct = max > 0 ? (it.count / max) * 100 : 0;
            return (
              <li key={it.value} className="group flex items-center gap-3">
                <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-surface-2">
                  <div
                    className="absolute inset-y-0 left-0 rounded-md bg-fuchsia-500/25 transition-all group-hover:bg-fuchsia-500/35"
                    style={{ width: `${pct}%` }}
                  />
                  <span className="relative z-10 flex h-full items-center px-3 text-xs font-medium text-foreground truncate">
                    {it.value}
                  </span>
                </div>
                <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">
                  {it.count.toLocaleString("pt-BR")}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
