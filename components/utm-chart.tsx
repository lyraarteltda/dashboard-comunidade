"use client";

import { Skeleton } from "@/components/ui/skeleton";

interface UtmData {
  source: string;
  pageviews: number;
  unique_visitors: number;
}

interface UtmChartProps {
  data: UtmData[];
  loading?: boolean;
}

const BAR_COLORS = [
  "oklch(0.75 0.16 82)",
  "oklch(0.65 0.18 200)",
  "oklch(0.70 0.17 155)",
  "oklch(0.68 0.16 280)",
  "oklch(0.72 0.19 30)",
  "oklch(0.60 0.15 330)",
];

export function UtmChart({ data, loading }: UtmChartProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-elevation-1)]">
        <Skeleton className="h-4 w-48 mb-6" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="mb-3 flex items-center gap-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 flex-1" />
          </div>
        ))}
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.pageviews), 1);

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-elevation-1)]">
      <h3 className="mb-5 text-sm font-semibold text-foreground">
        Visitas por fonte UTM
      </h3>
      <div className="space-y-2.5">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem dados no período</p>
        ) : (
          data.map((item, i) => (
            <div key={i} className="group flex items-center gap-3">
              <span className="w-28 shrink-0 truncate text-xs text-muted-foreground group-hover:text-foreground transition-colors text-right">
                {item.source}
              </span>
              <div className="relative flex-1 h-7 rounded-md bg-surface-2 overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-md transition-all duration-500"
                  style={{
                    width: `${Math.max((item.pageviews / maxValue) * 100, 2)}%`,
                    backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                  }}
                />
                <span className="absolute inset-y-0 right-2 flex items-center font-mono text-xs font-semibold text-foreground tabular-nums">
                  {item.pageviews.toLocaleString("pt-BR")}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
      {data.length > 0 && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          Total: {data.reduce((s, d) => s + d.pageviews, 0).toLocaleString("pt-BR")} pageviews
        </p>
      )}
    </div>
  );
}
