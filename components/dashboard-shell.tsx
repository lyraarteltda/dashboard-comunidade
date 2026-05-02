"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { subDays } from "date-fns";
import { MetricCard } from "./metric-card";
import { ConversionChart } from "./conversion-chart";
import { UtmChart } from "./utm-chart";
import { VisitsChart } from "./visits-chart";
import { SignupsChart } from "./signups-chart";
import { CtaLeaderboard } from "./cta-leaderboard";
import { UtmBuyersChart } from "./utm-buyers-chart";
import { RefundsChart } from "./refunds-chart";
import { DateRangePicker } from "./date-range-picker";
import { NavHeader } from "./nav-header";

interface MetricsData {
  totalVisits: number;
  visitsSeries: { day: string; pageviews: number }[];
  ctas: { name: string; value: number }[];
  fetchedAt: string;
}

interface SignupsData {
  totalSignups: number;
  series: { day: string; count: number }[];
  fetchedAt: string;
}

interface ConversionData {
  series: {
    day: string;
    visitors: number;
    purchases: number;
    conversion_pct: number | null;
  }[];
  totals: {
    visitors: number;
    purchases: number;
    conversion_pct: number | null;
  };
  fetchedAt: string;
}

interface UtmData {
  data: { source: string; pageviews: number; unique_visitors: number }[];
  fetchedAt: string;
}

interface UtmBuyersData {
  aggregated: Record<string, { value: string; count: number }[]>;
  totalBuyers: number;
  fetchedAt: string;
}

interface RefundsData {
  totalRefunds: number;
  totalAmount: number;
  series: { day: string; count: number; amount: number }[];
  recent: { name: string; email: string; reason: string; amount: number | null; date: string }[];
  fetchedAt: string;
}

function toParam(d: Date): string {
  return d.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
}

export function DashboardShell() {
  const [dateFrom, setDateFrom] = useState(() => subDays(new Date(), 7));
  const [dateTo, setDateTo] = useState(() => new Date());

  const [data, setData] = useState<MetricsData | null>(null);
  const [signups, setSignups] = useState<SignupsData | null>(null);
  const [conversion, setConversion] = useState<ConversionData | null>(null);
  const [utm, setUtm] = useState<UtmData | null>(null);
  const [utmBuyers, setUtmBuyers] = useState<UtmBuyersData | null>(null);
  const [refunds, setRefunds] = useState<RefundsData | null>(null);

  const [loading, setLoading] = useState(true);
  const [signupsLoading, setSignupsLoading] = useState(true);
  const [conversionLoading, setConversionLoading] = useState(true);
  const [utmLoading, setUtmLoading] = useState(true);
  const [utmBuyersLoading, setUtmBuyersLoading] = useState(true);
  const [refundsLoading, setRefundsLoading] = useState(true);
  const [error, setError] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const fetchAll = useCallback(
    async (from: Date, to: Date) => {
      const f = toParam(from);
      const t = toParam(to);
      const qs = `from=${f}&to=${t}`;

      setLoading(true);
      setSignupsLoading(true);
      setConversionLoading(true);
      setUtmLoading(true);
      setUtmBuyersLoading(true);
      setRefundsLoading(true);
      setError("");

      const fetchMetrics = async () => {
        try {
          const res = await fetch(`/api/metrics?${qs}`);
          if (!res.ok) throw new Error("Falha ao carregar métricas");
          setData(await res.json());
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erro desconhecido");
        } finally {
          setLoading(false);
        }
      };

      const fetchSignups = async () => {
        try {
          const res = await fetch(`/api/signups?${qs}`);
          if (!res.ok) throw new Error("Falha ao carregar cadastros");
          setSignups(await res.json());
        } catch {
          // non-blocking
        } finally {
          setSignupsLoading(false);
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

      const fetchUtm = async () => {
        try {
          const res = await fetch(`/api/utm-breakdown?${qs}`);
          if (!res.ok) throw new Error("Falha ao carregar UTM");
          setUtm(await res.json());
        } catch {
          // non-blocking
        } finally {
          setUtmLoading(false);
        }
      };

      const fetchUtmBuyers = async () => {
        try {
          const res = await fetch(`/api/utm-buyers?${qs}`);
          if (!res.ok) throw new Error("Falha ao carregar UTM compradores");
          setUtmBuyers(await res.json());
        } catch {
          // non-blocking
        } finally {
          setUtmBuyersLoading(false);
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

      await Promise.all([fetchMetrics(), fetchSignups(), fetchConversion(), fetchUtm(), fetchUtmBuyers(), fetchRefunds()]);
    },
    []
  );

  useEffect(() => {
    fetchAll(dateFrom, dateTo);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleDateChange(from: Date, to: Date) {
    setDateFrom(from);
    setDateTo(to);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchAll(from, to), 200);
  }

  return (
    <div className="min-h-screen bg-surface-0">
      {/* Top nav */}
      <NavHeader activePage="dashboard">
        <DateRangePicker
          from={dateFrom}
          to={dateTo}
          onChange={handleDateChange}
        />
      </NavHeader>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {error && (
          <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* 4 metric cards: Visitas | Cadastros | Compras | Reembolsos */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Visitas"
            value={data?.totalVisits}
            loading={loading}
          />
          <MetricCard
            title="Cadastros"
            value={signups?.totalSignups}
            loading={signupsLoading}
          />
          <MetricCard
            title="Compras"
            value={conversion?.totals?.purchases}
            loading={conversionLoading}
          />
          <MetricCard
            title="Reembolsos"
            value={refundsLoading ? undefined : refunds?.totalRefunds ?? 0}
            suffix={
              refunds && refunds.totalAmount > 0
                ? `R$ ${refunds.totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                : undefined
            }
            loading={refundsLoading}
          />
        </div>

        {/* UTM dos Compradores — primary chart after cards */}
        <div className="mt-6">
          <UtmBuyersChart data={utmBuyers} loading={utmBuyersLoading} />
        </div>

        {/* Conversion chart */}
        <div className="mt-6">
          <ConversionChart
            series={conversion?.series || []}
            totals={conversion?.totals ?? null}
            loading={conversionLoading}
          />
        </div>

        {/* UTM horizontal bars */}
        <div className="mt-6">
          <UtmChart
            data={utm?.data || []}
            loading={utmLoading}
          />
        </div>

        {/* Visits per day + Signups per day */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <VisitsChart
            series={data?.visitsSeries || []}
            loading={loading}
          />
          <SignupsChart
            series={signups?.series || []}
            loading={signupsLoading}
          />
        </div>

        {/* Refunds per day */}
        <div className="mt-6">
          <RefundsChart
            series={refunds?.series || []}
            loading={refundsLoading}
          />
        </div>

        {/* CTA Leaderboard */}
        <div className="mt-6">
          <CtaLeaderboard ctas={data?.ctas || []} loading={loading} />
        </div>

        {/* Footer */}
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
