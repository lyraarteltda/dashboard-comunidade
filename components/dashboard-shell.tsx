"use client";

import { useState, useEffect, useCallback } from "react";
import { MetricCard } from "./metric-card";
import { SectionChart } from "./section-chart";
import { CtaLeaderboard } from "./cta-leaderboard";
import { SignupsChart } from "./signups-chart";
import { ConversionChart } from "./conversion-chart";
import { PlaceholderCard } from "./placeholder-card";

interface MetricsData {
  totalVisits: number;
  visitsDelta: number;
  todayVisits: number;
  yesterdayVisits: number;
  totalCtaClicks: number;
  sections: { name: string; value: number }[];
  ctas: { name: string; value: number }[];
  range: number;
  fetchedAt: string;
}

interface SignupsData {
  totalSignups: number;
  todaySignups: number;
  yesterdaySignups: number;
  series: { day: string; count: number }[];
  range: number;
  fetchedAt: string;
}

interface ConversionData {
  range: number;
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

const RANGES = [
  { label: "7d", value: 7 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
];

export function DashboardShell() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [signups, setSignups] = useState<SignupsData | null>(null);
  const [conversion, setConversion] = useState<ConversionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [signupsLoading, setSignupsLoading] = useState(true);
  const [conversionLoading, setConversionLoading] = useState(true);
  const [error, setError] = useState("");
  const [range, setRange] = useState(7);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/metrics?range=${range}`);
      if (!res.ok) throw new Error("Falha ao carregar métricas");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [range]);

  const fetchSignups = useCallback(async () => {
    setSignupsLoading(true);
    try {
      const res = await fetch(`/api/signups?range=${range}`);
      if (!res.ok) throw new Error("Falha ao carregar cadastros");
      const json = await res.json();
      setSignups(json);
    } catch {
      // signups error is non-blocking — the card shows "—"
    } finally {
      setSignupsLoading(false);
    }
  }, [range]);

  const fetchConversion = useCallback(async () => {
    setConversionLoading(true);
    try {
      const res = await fetch(`/api/conversion?range=${range}`);
      if (!res.ok) throw new Error("Falha ao carregar conversão");
      const json = await res.json();
      setConversion(json);
    } catch {
      // non-blocking
    } finally {
      setConversionLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchMetrics();
    fetchSignups();
    fetchConversion();
  }, [fetchMetrics, fetchSignups, fetchConversion]);

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

          <div className="flex items-center gap-4">
            {/* Range selector */}
            <div className="flex rounded-lg border border-border bg-surface-1 p-0.5">
              {RANGES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRange(r.value)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                    range === r.value
                      ? "bg-surface-3 text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {error && (
          <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* 4-column metric grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total de visitas"
            value={data?.totalVisits}
            delta={data?.visitsDelta}
            suffix={`últimos ${range}d`}
            loading={loading}
          />
          <MetricCard
            title="Cliques em CTAs"
            value={data?.totalCtaClicks}
            suffix={`últimos ${range}d`}
            loading={loading}
          />
          <MetricCard
            title="Visitas hoje"
            value={data?.todayVisits}
            delta={
              data && data.yesterdayVisits > 0
                ? Math.round(((data.todayVisits - data.yesterdayVisits) / data.yesterdayVisits) * 100)
                : undefined
            }
            suffix="vs ontem"
            loading={loading}
          />
          <MetricCard
            title="Páginas rastreadas"
            value={data?.sections?.length}
            suffix="com tráfego"
            loading={loading}
          />
        </div>

        {/* Signups metric card */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Cadastros comunidade gratuita"
            value={signups?.totalSignups}
            suffix={`últimos ${range}d`}
            loading={signupsLoading}
          />
          <MetricCard
            title="Cadastros hoje"
            value={signups?.todaySignups}
            delta={
              signups && signups.yesterdaySignups > 0
                ? Math.round(
                    ((signups.todaySignups - signups.yesterdaySignups) /
                      signups.yesterdaySignups) *
                      100
                  )
                : undefined
            }
            suffix="vs ontem"
            loading={signupsLoading}
          />
        </div>

        {/* Charts row */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SectionChart sections={data?.sections || []} loading={loading} />
          <CtaLeaderboard ctas={data?.ctas || []} loading={loading} />
        </div>

        {/* Signups + Conversion charts row */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SignupsChart
            series={signups?.series || []}
            loading={signupsLoading}
          />
          <ConversionChart
            series={conversion?.series || []}
            totals={conversion?.totals ?? null}
            loading={conversionLoading}
          />
        </div>

        {/* Conversion metric cards */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Compras no período"
            value={conversion?.totals?.purchases}
            suffix={`últimos ${range}d`}
            loading={conversionLoading}
          />
          <MetricCard
            title="Taxa de conversão"
            value={
              conversion?.totals?.conversion_pct != null
                ? `${conversion.totals.conversion_pct.toFixed(2)}%`
                : undefined
            }
            suffix="visitantes → compra"
            loading={conversionLoading}
          />
        </div>

        {/* Placeholder row */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <PlaceholderCard
            title="Leads"
            description="Integração com formulário de captura"
            icon="users"
          />
        </div>

        {/* Footer */}
        {data?.fetchedAt && (
          <p className="mt-8 text-center text-xs text-muted-foreground">
            Dados atualizados em {new Date(data.fetchedAt).toLocaleString("pt-BR")}
          </p>
        )}
      </main>
    </div>
  );
}
