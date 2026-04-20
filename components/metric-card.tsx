"use client";

import { Skeleton } from "@/components/ui/skeleton";

interface MetricCardProps {
  title: string;
  value?: number;
  delta?: number;
  suffix?: string;
  loading?: boolean;
}

export function MetricCard({ title, value, delta, suffix, loading }: MetricCardProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-elevation-1)]">
        <Skeleton className="h-3 w-24 mb-3" />
        <Skeleton className="h-8 w-16 mb-2" />
        <Skeleton className="h-3 w-20" />
      </div>
    );
  }

  const deltaColor =
    delta === undefined
      ? ""
      : delta >= 0
        ? "text-positive"
        : "text-negative";

  const deltaIcon = delta === undefined ? "" : delta >= 0 ? "↑" : "↓";

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-elevation-1)] transition-colors hover:bg-surface-3/50">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-foreground">
        {value?.toLocaleString("pt-BR") ?? "—"}
      </p>
      <div className="mt-1.5 flex items-center gap-2">
        {delta !== undefined && (
          <span className={`text-xs font-semibold ${deltaColor}`}>
            {deltaIcon} {Math.abs(delta)}%
          </span>
        )}
        {suffix && (
          <span className="text-xs text-muted-foreground">{suffix}</span>
        )}
      </div>
    </div>
  );
}
