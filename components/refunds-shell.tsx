"use client";

import { useState, useEffect, useCallback } from "react";
import { subDays } from "date-fns";
import { BarChart } from "@tremor/react";
import { Download, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { MetricCard } from "./metric-card";
import { NavHeader } from "./nav-header";
import { Skeleton } from "@/components/ui/skeleton";

type EventType = "REFUNDED" | "CHARGEDBACK" | "CANCELLED" | "PAYMENT_FAILED";

interface EventRow {
  id: string;
  transaction_id: string;
  customer_name: string;
  customer_email: string;
  product_name: string;
  amount: number;
  date: string;
  event_type: EventType;
  original_purchase_date: string | null;
  days_to_event: number | null;
  refuse_reason: string | null;
}

interface Summary {
  totalRefunds: number;
  totalChargebacks: number;
  totalCancellations: number;
  totalPaymentsFailed: number;
  totalRefundAmount: number;
  totalSales: number;
  refundRate: number;
  cancellationRate: number;
  churnRate: number;
}

interface DaySeries {
  day: string;
  refunds: number;
  cancellations: number;
  chargebacks: number;
  payment_failed: number;
}

interface ApiResponse {
  summary: Summary;
  series: DaySeries[];
  events: EventRow[];
  fetchedAt: string;
}

const PERIOD_OPTIONS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "Tudo", days: 0 },
] as const;

const EVENT_LABELS: Record<EventType, string> = {
  REFUNDED: "Reembolso",
  CHARGEDBACK: "Chargeback",
  CANCELLED: "Cancelamento",
  PAYMENT_FAILED: "Pagamento Recusado",
};

const EVENT_COLORS: Record<EventType, { bg: string; text: string; dot: string }> = {
  REFUNDED: { bg: "bg-orange-500/15", text: "text-orange-400", dot: "bg-orange-400" },
  CHARGEDBACK: { bg: "bg-rose-500/15", text: "text-rose-400", dot: "bg-rose-400" },
  CANCELLED: { bg: "bg-red-500/15", text: "text-red-400", dot: "bg-red-400" },
  PAYMENT_FAILED: { bg: "bg-zinc-500/15", text: "text-zinc-400", dot: "bg-zinc-400" },
};

type SortField = "date" | "customer_name" | "amount" | "event_type" | "days_to_event";
type SortDir = "asc" | "desc";

const ROWS_PER_PAGE = 25;

function toParam(d: Date): string {
  return d.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
}

function formatDay(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(val: number): string {
  return val.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function RefundsShell() {
  const [period, setPeriod] = useState<number>(30);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterType, setFilterType] = useState<EventType | "ALL">("ALL");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);

  const fetchData = useCallback(async (days: number) => {
    setLoading(true);
    setError("");
    setPage(0);

    const to = new Date();
    const from = days > 0 ? subDays(to, days) : new Date("2020-01-01");
    const qs = `from=${toParam(from)}&to=${toParam(to)}`;

    try {
      const res = await fetch(`/api/refunds-cancellations?${qs}`);
      if (!res.ok) throw new Error("Falha ao carregar dados");
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(period);
  }, [period, fetchData]);

  const filteredEvents = (data?.events ?? []).filter(
    (e) => filterType === "ALL" || e.event_type === filterType
  );

  const sortedEvents = [...filteredEvents].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    switch (sortField) {
      case "date":
        return a.date.localeCompare(b.date) * dir;
      case "customer_name":
        return a.customer_name.localeCompare(b.customer_name) * dir;
      case "amount":
        return (a.amount - b.amount) * dir;
      case "event_type":
        return a.event_type.localeCompare(b.event_type) * dir;
      case "days_to_event":
        return ((a.days_to_event ?? 999) - (b.days_to_event ?? 999)) * dir;
      default:
        return 0;
    }
  });

  const totalPages = Math.ceil(sortedEvents.length / ROWS_PER_PAGE);
  const pagedEvents = sortedEvents.slice(
    page * ROWS_PER_PAGE,
    (page + 1) * ROWS_PER_PAGE
  );

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
    setPage(0);
  }

  function exportCSV() {
    if (!filteredEvents.length) return;

    const csvHeader =
      "Nome,Email,Produto,Valor (R$),Data,Tipo,Data Compra Original,Dias até Evento,Motivo Recusa\n";
    const csvRows = filteredEvents
      .map((e) =>
        [
          `"${e.customer_name}"`,
          `"${e.customer_email}"`,
          `"${e.product_name}"`,
          e.amount.toFixed(2),
          formatDateTime(e.date),
          EVENT_LABELS[e.event_type],
          e.original_purchase_date ? formatDate(e.original_purchase_date + "T00:00:00Z") : "—",
          e.days_to_event != null ? String(e.days_to_event) : "—",
          e.refuse_reason ? `"${e.refuse_reason}"` : "—",
        ].join(",")
      )
      .join("\n");

    const blob = new Blob([csvHeader + csvRows], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reembolsos-cancelamentos-${toParam(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const chartData = (data?.series ?? []).map((s) => ({
    dia: formatDay(s.day),
    Reembolsos: s.refunds + s.chargebacks,
    Cancelamentos: s.cancellations,
    "Pgtos Recusados": s.payment_failed,
  }));

  const summary = data?.summary;

  const FILTER_TABS: { key: EventType | "ALL"; label: string }[] = [
    { key: "ALL", label: "Todos" },
    { key: "REFUNDED", label: "Reembolsos" },
    { key: "CANCELLED", label: "Cancelamentos" },
    { key: "PAYMENT_FAILED", label: "Pgtos Recusados" },
  ];

  return (
    <div className="min-h-screen bg-surface-0">
      <NavHeader activePage="refunds" />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {error && (
          <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Period toggle */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground">
            Reembolsos & Cancelamentos
          </h1>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-1 p-0.5">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setPeriod(opt.days)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  period === opt.days
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Summary cards — row 1 */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <MetricCard
            title="Reembolsos"
            value={summary?.totalRefunds}
            suffix={
              summary && summary.totalChargebacks > 0
                ? `${summary.totalChargebacks} chargeback${summary.totalChargebacks !== 1 ? "s" : ""}`
                : undefined
            }
            loading={loading}
          />
          <MetricCard
            title="Cancelamentos Voluntários"
            value={summary?.totalCancellations}
            suffix={
              summary
                ? `${summary.cancellationRate.toFixed(1)}% de ${summary.totalSales} vendas`
                : undefined
            }
            loading={loading}
          />
          <MetricCard
            title="Pagamentos Recusados"
            value={summary?.totalPaymentsFailed}
            loading={loading}
          />
          <MetricCard
            title="Total Perdas (Churn)"
            value={
              summary
                ? summary.totalRefunds + summary.totalCancellations
                : undefined
            }
            suffix={
              summary ? `${summary.churnRate.toFixed(1)}% de ${summary.totalSales} vendas` : undefined
            }
            loading={loading}
          />
          <MetricCard
            title="Valor Reembolsado"
            value={summary ? formatCurrency(summary.totalRefundAmount) : undefined}
            loading={loading}
          />
        </div>

        {/* Chart */}
        <div className="mt-6 rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-elevation-1)]">
          <h3 className="mb-5 text-sm font-semibold text-foreground">
            Eventos por dia
          </h3>
          {loading ? (
            <Skeleton className="h-[260px] w-full rounded-lg" />
          ) : chartData.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Nenhum evento no período
            </p>
          ) : (
            <BarChart
              className="h-[260px] [&_.recharts-cartesian-grid_line]:stroke-[oklch(1_0_0/0.06)] [&_.recharts-yAxis_text]:fill-[oklch(0.7_0.01_260)] [&_.recharts-xAxis_text]:fill-[oklch(0.7_0.01_260)]"
              data={chartData}
              index="dia"
              categories={["Reembolsos", "Cancelamentos", "Pgtos Recusados"]}
              colors={["rose", "red", "zinc"]}
              stack
              showAnimation
              showLegend
              showYAxis
              showXAxis
              showGridLines
              yAxisWidth={36}
              valueFormatter={(v: number) => v.toLocaleString("pt-BR")}
            />
          )}
        </div>

        {/* Event type filter + CSV export */}
        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-1 p-0.5">
            {FILTER_TABS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setFilterType(key);
                  setPage(0);
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  filterType === key
                    ? "bg-surface-3 text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={exportCSV}
            disabled={loading || filteredEvents.length === 0}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-surface-1 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="size-3.5" />
            Exportar CSV
          </button>
        </div>

        {/* Events table */}
        <div className="mt-3 rounded-xl border border-border bg-card shadow-[var(--shadow-elevation-1)] overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-md" />
              ))}
            </div>
          ) : sortedEvents.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Nenhum evento encontrado
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-1">
                      {[
                        { field: "customer_name" as SortField, label: "Cliente" },
                        { field: "amount" as SortField, label: "Valor" },
                        { field: "date" as SortField, label: "Data" },
                        { field: "event_type" as SortField, label: "Tipo" },
                        { field: "days_to_event" as SortField, label: "Dias até Evento" },
                      ].map((col) => (
                        <th
                          key={col.field}
                          className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"
                          onClick={() => toggleSort(col.field)}
                        >
                          <span className="inline-flex items-center gap-1">
                            {col.label}
                            <ArrowUpDown className="size-3 opacity-40" />
                          </span>
                        </th>
                      ))}
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Motivo / Produto
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pagedEvents.map((e) => {
                      const colors = EVENT_COLORS[e.event_type];
                      return (
                        <tr
                          key={e.id}
                          className="transition-colors hover:bg-surface-2/50"
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium text-foreground truncate max-w-[200px]">
                              {e.customer_name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {e.customer_email}
                            </p>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs tabular-nums text-foreground whitespace-nowrap">
                            {e.amount > 0 ? formatCurrency(e.amount) : "—"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <p className="text-xs text-foreground">
                              {formatDateTime(e.date)}
                            </p>
                            {e.original_purchase_date && (
                              <p className="text-[11px] text-muted-foreground">
                                Compra: {formatDate(e.original_purchase_date + "T00:00:00Z")}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium ${colors.bg} ${colors.text}`}
                            >
                              <span
                                className={`size-1.5 rounded-full ${colors.dot}`}
                              />
                              {EVENT_LABELS[e.event_type]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
                            {e.days_to_event != null
                              ? `${e.days_to_event} dia${e.days_to_event !== 1 ? "s" : ""}`
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground max-w-[220px]">
                            {e.refuse_reason ? (
                              <span className="inline-flex items-center gap-1.5 rounded-md bg-zinc-500/10 px-2 py-0.5 text-[11px] font-medium text-zinc-400">
                                {e.refuse_reason}
                              </span>
                            ) : (
                              <span className="truncate block">{e.product_name}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border px-4 py-3">
                  <p className="text-xs text-muted-foreground">
                    {sortedEvents.length} evento{sortedEvents.length !== 1 ? "s" : ""}{" "}
                    — Página {page + 1} de {totalPages}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground disabled:opacity-30"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPage((p) => Math.min(totalPages - 1, p + 1))
                      }
                      disabled={page >= totalPages - 1}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground disabled:opacity-30"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {data?.fetchedAt && (
          <p className="mt-8 text-center text-xs text-muted-foreground">
            Dados atualizados em{" "}
            {new Date(data.fetchedAt).toLocaleString("pt-BR")}
          </p>
        )}
      </main>
    </div>
  );
}
