"use client";

import { Skeleton } from "@/components/ui/skeleton";

interface SectionChartProps {
  sections: { name: string; value: number }[];
  loading?: boolean;
}

function extractPagePath(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname === "/" ? "Home (/)" : parsed.pathname;
  } catch {
    return url;
  }
}

export function SectionChart({ sections, loading }: SectionChartProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-elevation-1)]">
        <Skeleton className="h-4 w-40 mb-6" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="mb-3 flex items-center gap-3">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-6 flex-1" />
          </div>
        ))}
      </div>
    );
  }

  const maxValue = Math.max(...sections.map((s) => s.value), 1);

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-elevation-1)]">
      <h3 className="mb-5 text-sm font-semibold text-foreground">
        Páginas mais visitadas
      </h3>
      <div className="space-y-3">
        {sections.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem dados no período</p>
        ) : (
          sections.map((section, i) => (
            <div key={i} className="group flex items-center gap-3">
              <span className="w-36 shrink-0 truncate text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                {extractPagePath(section.name)}
              </span>
              <div className="relative flex-1 h-7 rounded-md bg-surface-2 overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-md bg-accent/60 transition-all duration-500"
                  style={{ width: `${(section.value / maxValue) * 100}%` }}
                />
                <span className="absolute inset-y-0 right-2 flex items-center font-mono text-xs font-medium text-foreground">
                  {section.value.toLocaleString("pt-BR")}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
