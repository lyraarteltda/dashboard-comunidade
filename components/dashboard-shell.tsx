"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MetricCard } from "./metric-card";
import { SectionChart } from "./section-chart";
import { CtaLeaderboard } from "./cta-leaderboard";
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

const RANGES = [
  { label: "7d", value: 7 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
];

export function DashboardShell() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [range, setRange] = useState(7);
  const router = useRouter();

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/metrics?range=${range}`);
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error("Falha ao carregar métricas");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [range, router]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
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

            <button
              onClick={handleLogout}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Sair
            </button>
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

        {/* Charts row */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SectionChart sections={data?.sections || []} loading={loading} />
          <CtaLeaderboard ctas={data?.ctas || []} loading={loading} />
        </div>

        {/* Placeholder row */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <PlaceholderCard
            title="Leads"
            description="Integração com formulário de captura"
            icon="users"
          />
          <PlaceholderCard
            title="Compradores"
            description="Integração com gateway de pagamento"
            icon="credit-card"
          />
          <PlaceholderCard
            title="Membros ativos"
            description="Integração com área de membros"
            icon="activity"
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
