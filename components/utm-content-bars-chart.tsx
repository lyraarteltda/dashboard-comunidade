"use client";

import { Skeleton } from "@/components/ui/skeleton";

interface UtmContentBarsChartProps {
  data: { value: string; count: number }[];
  loading?: boolean;
}

const PALETTE: string[] = [
  "20, 184, 166",   // teal
  "14, 165, 233",   // sky
  "139, 92, 246",   // violet
  "249, 115, 22",   // orange
  "16, 185, 129",   // emerald
  "245, 158, 11",   // amber
  "244, 63, 94",    // rose
  "217, 70, 239",   // fuchsia
  "99, 102, 241",   // indigo
  "236, 72, 153",   // pink
  "132, 204, 22",   // lime
  "6, 182, 212",    // cyan
];

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
        <ul className="space-y-3">
          {items.map((it, i) => {
            const pct = max > 0 ? (it.count / max) * 100 : 0;
            const rgb = PALETTE[i % PALETTE.length];
            return (
              <li key={it.value} className="flex items-center gap-3">
                <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-surface-2">
                  <div
                    className="absolute inset-y-0 left-0 rounded-md transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: `rgb(${rgb} / 0.32)`,
                      boxShadow: `inset 0 0 0 1px rgb(${rgb} / 0.45)`,
                    }}
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
