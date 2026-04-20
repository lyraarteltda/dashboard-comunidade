"use client";

import { Skeleton } from "@/components/ui/skeleton";

interface CtaLeaderboardProps {
  ctas: { name: string; value: number }[];
  loading?: boolean;
}

export function CtaLeaderboard({ ctas, loading }: CtaLeaderboardProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-elevation-1)]">
        <Skeleton className="h-4 w-36 mb-6" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="mb-3 flex items-center justify-between">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
    );
  }

  const maxValue = Math.max(...ctas.map((c) => c.value), 1);

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-elevation-1)]">
      <h3 className="mb-5 text-sm font-semibold text-foreground">
        CTA Leaderboard
      </h3>
      <div className="space-y-2">
        {ctas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem cliques no período</p>
        ) : (
          ctas.map((cta, i) => (
            <div
              key={i}
              className="group flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-surface-2"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-3 font-mono text-[10px] font-bold text-muted-foreground">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm text-foreground">{cta.name}</p>
                <div className="mt-1 h-1 rounded-full bg-surface-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${(cta.value / maxValue) * 100}%` }}
                  />
                </div>
              </div>
              <span className="font-mono text-xs font-semibold text-muted-foreground tabular-nums">
                {cta.value.toLocaleString("pt-BR")}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
