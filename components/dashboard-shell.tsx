"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { subDays } from "date-fns";
import { MetricCard } from "./metric-card";
import { RevenueChart } from "./revenue-chart";
import { VisitsChart } from "./visits-chart";
import { ConversionRateChart } from "./conversion-rate-chart";
import { RefundRateChart } from "./refund-rate-chart";
import { UtmContentBarsChart } from "./utm-content-bars-chart";
import { DateRangePicker } from "./date-range-picker";
import { NavHeader } from "./nav-header";

interface MetricsData {
  totalVisits: number;
  visitsSeries: { day: string; pageviews: number }[];
  fetchedAt: string;
}

interface ConversionData {
  series: {
    day: string;
    visitors: number;
    purchases: number;
    conversion_pct: number | null;
    revenue: number;
  }[];
  totals: {
    visitors: number;
    purchases: number;
    conversion_pct: number | null;
    totalRevenue: number;
  };
  fetchedAt: string;
}

interface RefundsData {
  totalRefunds: number;
  totalAmount: number;
  series: { day: string; count: number; amount: number }[];
  fetchedAt: string;
}

interface UtmBuyersData {
  aggregated: {
    utm_source: { value: string; count: number }[];
    utm_medium: { value: string; count: number }[];
    utm_campaign: { value: string; count: number }[];
    utm_content: { value: string; count: number }[];
    utm_term: { value: string; count: number }[];
  };
  totalBuyers: number;
  fetchedAt: string;
}

function toParam(d: Date): string {
  return d.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
}

export function DashboardShell() {
  const [dateFrom, setDateFrom] = useState(() => subDays(new Date(), 7));
  const [dateTo, setDateTo] = useState(() => new Date());

  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [conversion, setConversion] = useState<ConversionData | null>(null);
  const [refunds, setRefunds] = useState<RefundsData | null>(null);
  const [utmBuyers, setUtmBuyers] = useState<UtmBuyersData | null>(null);

  const [metricsLoading, setMetricsLoading] = useState(true);
  const [conversionLoading, setConversionLoading] = useState(true);
  const [refundsLoading, setRefundsLoading] = useState(true);
  const [utmBuyersLoading, setUtmBuyersLoading] = useState(true);
  const [error, setError] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const fetchAll = useCallback(async (from: Date, to: Date) => {
    const qs = `from=${toParam(from)}&to=${toParam(to)}`;

    setMetricsLoading(true);
    setConversionLoading(true);
    setRefundsLoading(true);
    setUtmBuyersLoading(true);
    setError("");

    const fetchMetrics = async () => {
      try {
        const res = await fetch(`/api/metrics?${qs}`);
        if (!res.ok) throw new Error("Falha ao carregar métricas");
        setMetrics(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido");
      } finally {
        setMetricsLoading(false);
      }
    };

    const fetchConversion = async () => {
      try {
        const res = await fetch(`/api/conversion?${qs}`);
        if (!res.ok) throw new Error("Falha ao carregar conversão");
        setConversion(await res.json());
      } catch {
        // non-blocking
      } finally {
        setConversionLoading(false);
      }
    };

    const fetchRefunds = async () => {
      try {
        const res = await fetch(`/api/refunds?${qs}`);
        if (!res.ok) throw new Error("Falha ao carregar reembolsos");
        setRefunds(await res.json());
      } catch {
        // non-blocking
      } finally {
        setRefundsLoading(false);
      }
    };

    const fetchUtmBuyers = async () => {
      try {
        const res = await fetch(`/api/utm-buyers?${qs}`);
        if (!res.ok) throw new Error("Falha ao carregar UTMs");
        setUtmBuyers(await res.json());
      } catch {
        // non-blocking
      } finally {
        setUtmBuyersLoading(false);
      }
    };

    await Promise.all([
      fetchMetrics(),
      fetchConversion(),
      fetchRefunds(),
      fetchUtmBuyers(),
    ]);
  }, []);

  useEffect(() => {
    fetchAll(dateFrom, dateTo);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleDateChange(from: Date, to: Date) {
    setDateFrom(from);
    setDateTo(to);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchAll(from, to), 200);
  }

  const refundRateValue =
    !refundsLoading && !conversionLoading && conversion?.totals?.purchases
      ? `${(((refunds?.totalRefunds ?? 0) / conversion.totals.purchases) * 100).toFixed(1)}%`
      : refundsLoading || conversionLoading
        ? undefined
        : "0%";

  const conversionRateValue =
    conversion?.totals?.conversion_pct != null
      ? `${conversion.totals.conversion_pct.toFixed(2)}%`
      : conversionLoading
        ? undefined
        : "—";

  const revenueValue =
    conversion?.totals?.totalRevenue != null
      ? `R$ ${conversion.totals.totalRevenue.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
        })}`
      : conversionLoading
        ? undefined
        : "R$ 0,00";

  const revenueSeries =
    conversion?.series.map((s) => ({ day: s.day, revenue: s.revenue })) ?? [];

  const purchasesSeries =
    conversion?.series.map((s) => ({ day: s.day, purchases: s.purchases })) ?? [];

  return (
    <div className="min-h-screen bg-surface-0">
      <NavHeader activePage="dashboard">
        <DateRangePicker from={dateFrom} to={dateTo} onChange={handleDateChange} />
      </NavHeader>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {error && (
          <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* TOP — 3 cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricCard
            title="Revenue"
            value={revenueValue}
            loading={conversionLoading}
          />
          <MetricCard
            title="Landing Page Conversion"
            value={conversionRateValue}
            suffix={
              conversion?.totals
                ? `${conversion.totals.purchases} compras / ${conversion.totals.visitors.toLocaleString("pt-BR")} visitantes`
                : undefined
            }
            loading={conversionLoading}
          />
          <MetricCard
            title="Reembolso Rate"
            value={refundRateValue}
            suffix={
              refunds && refunds.totalRefunds > 0 && conversion?.totals?.purchases
                ? `${refunds.totalRefunds} de ${conversion.totals.purchases}`
                : undefined
            }
            loading={refundsLoading || conversionLoading}
          />
        </div>

        {/* ROW 1 — Revenue | Landing Page Visits */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <RevenueChart series={revenueSeries} loading={conversionLoading} />
          <VisitsChart
            series={metrics?.visitsSeries || []}
            loading={metricsLoading}
          />
        </div>

        {/* ROW 2 — Landing Page Conversion Rate | Reembolso Rate */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ConversionRateChart
            series={conversion?.series || []}
            loading={conversionLoading}
          />
          <RefundRateChart
            purchases={purchasesSeries}
            refunds={refunds?.series || []}
            loading={refundsLoading || conversionLoading}
          />
        </div>

        {/* ROW 3 — UTM Content (full width, horizontal bars) */}
        <div className="mt-6">
          <UtmContentBarsChart
            data={utmBuyers?.aggregated.utm_content || []}
            loading={utmBuyersLoading}
          />
        </div>

        {metrics?.fetchedAt && (
          <p className="mt-8 text-center text-xs text-muted-foreground">
            Dados atualizados em {new Date(metrics.fetchedAt).toLocaleString("pt-BR")}
          </p>
        )}
      </main>
    </div>
  );
}
