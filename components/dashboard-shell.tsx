"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { format, subDays } from "date-fns";
import { MetricCard } from "./metric-card";
import { ConversionChart } from "./conversion-chart";
import { UtmChart } from "./utm-chart";
import { VisitsChart } from "./visits-chart";
import { SignupsChart } from "./signups-chart";
import { CtaLeaderboard } from "./cta-leaderboard";
import { UtmBuyersChart } from "./utm-buyers-chart";
import { DateRangePicker } from "./date-range-picker";

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

function toParam(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function DashboardShell() {
  const [dateFrom, setDateFrom] = useState(() => subDays(new Date(), 7));
  const [dateTo, setDateTo] = useState(() => new Date());

  const [data, setData] = useState<MetricsData | null>(null);
  const [signups, setSignups] = useState<SignupsData | null>(null);
  const [conversion, setConversion] = useState<ConversionData | null>(null);
  const [utm, setUtm] = useState<UtmData | null>(null);
  const [utmBuyers, setUtmBuyers] = useState<UtmBuyersData | null>(null);

  const [loading, setLoading] = useState(true);
  const [signupsLoading, setSignupsLoading] = useState(true);
  const [conversionLoading, setConversionLoading] = useState(true);
  const [utmLoading, setUtmLoading] = useState(true);
  const [utmBuyersLoading, setUtmBuyersLoading] = useState(true);
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

      await Promise.all([fetchMetrics(), fetchSignups(), fetchConversion(), fetchUtm(), fetchUtmBuyers()]);
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
      <header className="sticky top-0 z-50 border-b border-border bg-surface-0/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 rounded-md bg-primary" />
            <span className="text-sm font-semibold text-foreground tracking-tight">
              Dashboard Comunidade
            </span>
          </div>
          <DateRangePicker
            from={dateFrom}
            to={dateTo}
            onChange={handleDateChange}
          />
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {error && (
          <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* 3 metric cards: Visitas | Cadastros | Compras */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
