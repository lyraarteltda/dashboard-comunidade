"use client";

import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const BAR_COLORS = [
  "oklch(0.75 0.16 82)",
  "oklch(0.65 0.18 200)",
  "oklch(0.70 0.17 155)",
  "oklch(0.68 0.16 280)",
  "oklch(0.72 0.19 30)",
  "oklch(0.60 0.15 330)",
];

const DIMENSIONS = [
  { key: "utm_source", label: "Source" },
  { key: "utm_medium", label: "Medium" },
  { key: "utm_campaign", label: "Campaign" },
  { key: "utm_content", label: "Content" },
] as const;

type DimensionKey = (typeof DIMENSIONS)[number]["key"];
type ViewMode = "bar" | "donut";

interface UtmBuyersData {
  aggregated: Record<string, { value: string; count: number }[]>;
  totalBuyers: number;
  fetchedAt: string;
}

interface UtmBuyersChartProps {
  data: UtmBuyersData | null;
  loading?: boolean;
}

function CustomDonut({
  items,
  totalLabel,
}: {
  items: { value: string; count: number }[];
  totalLabel: string;
}) {
  const total = items.reduce((s, d) => s + d.count, 0);
  const cx = 100;
  const cy = 100;
  const r = 80;
  const strokeWidth = 28;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const segments = items.map((item, i) => {
    const pct = total > 0 ? item.count / total : 0;
    const dashLen = pct * circumference;
    const seg = {
      dashArray: `${dashLen} ${circumference - dashLen}`,
      dashOffset: -offset,
      color: BAR_COLORS[i % BAR_COLORS.length],
      label: item.value,
      count: item.count,
      pct,
    };
    offset += dashLen;
    return seg;
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative shrink-0">
        <svg width="200" height="200" viewBox="0 0 200 200">
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="oklch(0.25 0.01 260)"
            strokeWidth={strokeWidth}
          />
          {segments.map((seg, i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={seg.dashArray}
              strokeDashoffset={seg.dashOffset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${cx} ${cy})`}
              className="transition-all duration-500"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-semibold text-foreground">
            {totalLabel}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 min-w-0">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="h-3 w-3 shrink-0 rounded-sm"
              style={{ backgroundColor: seg.color }}
            />
            <span className="truncate text-xs text-muted-foreground">
              {seg.label}
            </span>
            <span className="ml-auto font-mono text-xs font-semibold text-foreground tabular-nums">
              {seg.count.toLocaleString("pt-BR")}
            </span>
            <span className="text-[10px] text-muted-foreground tabular-nums w-10 text-right">
              {(seg.pct * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function UtmBuyersChart({ data, loading }: UtmBuyersChartProps) {
  const [dimension, setDimension] = useState<DimensionKey>("utm_source");
  const [view, setView] = useState<ViewMode>("bar");

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-elevation-1)]">
        <Skeleton className="h-4 w-56 mb-6" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="mb-3 flex items-center gap-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 flex-1" />
          </div>
        ))}
      </div>
    );
  }

  const items = data?.aggregated?.[dimension] ?? [];
  const maxValue = Math.max(...items.map((d) => d.count), 1);

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-elevation-1)]">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          UTM dos Compradores
        </h3>

        <div className="flex items-center gap-2">
          {DIMENSIONS.map((dim) => (
            <Button
              key={dim.key}
              variant={dimension === dim.key ? "default" : "outline"}
              size="xs"
              onClick={() => setDimension(dim.key)}
            >
              {dim.label}
            </Button>
          ))}

          <span className="mx-1 h-4 w-px bg-border" />

          <Button
            variant={view === "bar" ? "default" : "outline"}
            size="xs"
            onClick={() => setView("bar")}
          >
            Barras
          </Button>
          <Button
            variant={view === "donut" ? "default" : "outline"}
            size="xs"
            onClick={() => setView("donut")}
          >
            Pizza
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem dados no período</p>
      ) : view === "bar" ? (
        <div className="space-y-2.5">
          {items.map((item, i) => (
            <div key={i} className="group flex items-center gap-3">
              <span className="w-32 shrink-0 truncate text-xs text-muted-foreground group-hover:text-foreground transition-colors text-right">
                {item.value}
              </span>
              <div className="relative flex-1 h-7 rounded-md bg-surface-2 overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-md transition-all duration-500"
                  style={{
                    width: `${Math.max((item.count / maxValue) * 100, 2)}%`,
                    backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                  }}
                />
                <span className="absolute inset-y-0 right-2 flex items-center font-mono text-xs font-semibold text-foreground tabular-nums">
                  {item.count.toLocaleString("pt-BR")}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <CustomDonut
          items={items}
          totalLabel={`${data?.totalBuyers?.toLocaleString("pt-BR") ?? 0} compras`}
        />
      )}

      {items.length > 0 && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          Total: {items.reduce((s, d) => s + d.count, 0).toLocaleString("pt-BR")} compras
        </p>
      )}
    </div>
  );
}
