"use client";

import { useState, useEffect, useCallback } from "react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { X } from "lucide-react";
import { BarChart } from "@tremor/react";
import { DateRangePicker } from "./date-range-picker";
import { NavHeader } from "./nav-header";

const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  "landing-page": { bg: "bg-emerald-500/15", text: "text-emerald-400", dot: "bg-emerald-400" },
  manychat:       { bg: "bg-cyan-500/15",    text: "text-cyan-400",    dot: "bg-cyan-400" },
  n8n:            { bg: "bg-blue-500/15",    text: "text-blue-400",    dot: "bg-blue-400" },
  circle:         { bg: "bg-pink-500/15",    text: "text-pink-400",    dot: "bg-pink-400" },
  checkout:       { bg: "bg-orange-500/15",  text: "text-orange-400",  dot: "bg-orange-400" },
  other:          { bg: "bg-zinc-500/15",    text: "text-zinc-400",    dot: "bg-zinc-400" },
};

const CATEGORY_LABELS: Record<string, string> = {
  "landing-page": "Landing Page",
  manychat: "ManyChat",
  n8n: "n8n",
  circle: "Circle",
  checkout: "Checkout",
  other: "Outro",
};

interface SessionRow {
  id: string;
  created_at: string;
  task_summary: string;
  task_category: string;
  primary_tool: string;
  responsible_employee: string;
  status: string;
}

function toParam(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function ActivityLogShell() {
  const [dateFrom, setDateFrom] = useState(() => subDays(new Date(), 30));
  const [dateTo, setDateTo] = useState(() => new Date());
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const fetchData = useCallback(async (from: Date, to: Date) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        from: toParam(from),
        to: toParam(to),
        perPage: "10000",
      });
      const res = await fetch(`/api/activity-log?${params}`);
      if (!res.ok) throw new Error("Falha ao carregar registro de atividades");
      const json = await res.json();
      setRows(json.rows || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(dateFrom, dateTo);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleDateChange(from: Date, to: Date) {
    setDateFrom(from);
    setDateTo(to);
    fetchData(from, to);
  }

  const dailyCounts = rows.reduce<Record<string, number>>((acc, row) => {
    const day = row.created_at.slice(0, 10);
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.entries(dailyCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({
      date: format(new Date(date + "T12:00:00"), "dd/MM", { locale: ptBR }),
      rawDate: date,
      "Ações": count,
    }));

  const selectedRows = selectedDate
    ? rows
        .filter((r) => r.created_at.startsWith(selectedDate))
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
    : [];

  const selectedDateLabel = selectedDate
    ? format(new Date(selectedDate + "T12:00:00"), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })
    : "";

  return (
    <div className="min-h-screen bg-surface-0">
      <NavHeader activePage="activity-log">
        <DateRangePicker from={dateFrom} to={dateTo} onChange={handleDateChange} />
      </NavHeader>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {error && (
          <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-elevation-1)]">
          <h2 className="mb-6 text-lg font-semibold text-foreground">Ações por Dia</h2>

          {loading ? (
            <div className="flex items-center justify-center h-80">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-80 text-muted-foreground">
              <p className="text-sm">Nenhuma atividade encontrada neste período</p>
            </div>
          ) : (
            <BarChart
              data={chartData}
              index="date"
              categories={["Ações"]}
              colors={["violet"]}
              yAxisWidth={40}
              className="h-80 cursor-pointer"
              showAnimation
              onValueChange={(value) => {
                if (value?.rawDate) {
                  setSelectedDate(value.rawDate as string);
                }
              }}
            />
          )}
        </div>

        {rows.length > 0 && !loading && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Clique em uma barra para ver os detalhes do dia
          </p>
        )}
      </main>

      {/* Modal overlay */}
      {selectedDate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setSelectedDate(null)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[80vh] rounded-2xl border border-border bg-card shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Ações em {selectedDate && format(new Date(selectedDate + "T12:00:00"), "dd/MM/yyyy")}
                </h3>
                <p className="text-xs text-muted-foreground capitalize mt-0.5">
                  {selectedDateLabel}
                </p>
              </div>
              <button
                onClick={() => setSelectedDate(null)}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto px-6 py-4 space-y-2">
              {selectedRows.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma ação registrada neste dia
                </p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground mb-3">
                    {selectedRows.length} {selectedRows.length === 1 ? "ação" : "ações"}
                  </p>
                  {selectedRows.map((row) => {
                    const time = format(new Date(row.created_at), "HH:mm");
                    const cat = row.task_category?.toLowerCase() || "other";
                    const catColors = CATEGORY_COLORS[cat] || CATEGORY_COLORS.other;
                    const catLabel = CATEGORY_LABELS[cat] || cat;

                    return (
                      <div
                        key={row.id}
                        className="rounded-lg border border-border bg-surface-1 p-3.5 transition-colors hover:bg-surface-2"
                      >
                        <div className="flex items-start gap-3">
                          <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums pt-0.5">
                            {time}
                          </span>
                          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                            <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium ${catColors.bg} ${catColors.text}`}>
                              <span className={`size-1.5 rounded-full ${catColors.dot}`} />
                              {catLabel}
                            </span>
                            {row.primary_tool && (
                              <span className="inline-flex items-center rounded-md bg-surface-3 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                {row.primary_tool}
                              </span>
                            )}
                          </div>
                          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary shrink-0">
                            {row.responsible_employee || "—"}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-foreground leading-relaxed">
                          {row.task_summary || <span className="text-muted-foreground italic">Sem resumo</span>}
                        </p>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
