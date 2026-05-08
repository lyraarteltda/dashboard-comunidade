"use client";

import { useState, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricCard } from "./metric-card";

interface VideoRevenue {
  videoId: string;
  title: string;
  views: number;
  likes: number;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  utmTag: string;
  sales: number;
  revenue: number;
  allTimeRevenue: number;
  allTimeSales: number;
  rpm: number;
}

interface PoolData {
  tag: string;
  videoCount: number;
  totalViews: number;
  totalSales: number;
  totalRevenue: number;
  allTimeSales: number;
  allTimeRevenue: number;
  rpm: number;
}

export interface YouTubeRevenueData {
  videos: VideoRevenue[];
  pool: PoolData | null;
  totals: { totalRevenue: number; totalSales: number; avgRpm: number };
  snapshotDate: string | null;
  fetchedAt: string;
}

interface YouTubeRevenueTableProps {
  data: YouTubeRevenueData | null;
  loading?: boolean;
}

type SortColumn = "title" | "views" | "sales" | "revenue" | "rpm";
type SortDirection = "desc" | "asc";

function fmtBRL(value: number): string {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function rpmColor(rpm: number): string {
  if (rpm >= 100) return "text-positive";
  if (rpm >= 30) return "text-yellow-500";
  return "text-foreground";
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function SortArrow({ column, sortColumn, sortDirection }: { column: SortColumn; sortColumn: SortColumn; sortDirection: SortDirection }) {
  if (column !== sortColumn) return null;
  return <span className="ml-1">{sortDirection === "desc" ? "▼" : "▲"}</span>;
}

export function YouTubeRevenueTable({ data, loading }: YouTubeRevenueTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>("revenue");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  const sortedVideos = useMemo(() => {
    if (!data) return [];
    const sorted = [...data.videos];
    sorted.sort((a, b) => {
      let cmp: number;
      if (sortColumn === "title") {
        cmp = a.title.localeCompare(b.title, "pt-BR");
      } else {
        cmp = a[sortColumn] - b[sortColumn];
      }
      return sortDirection === "desc" ? -cmp : cmp;
    });
    return sorted;
  }, [data, sortColumn, sortDirection]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-5 w-52" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-elevation-1)]">
              <Skeleton className="h-3 w-24 mb-3" />
              <Skeleton className="h-8 w-16 mb-2" />
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-elevation-1)]">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full mb-2" />
          ))}
        </div>
      </div>
    );
  }

  const hasData = data && (data.videos.length > 0 || data.pool);

  const thBase = "px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground cursor-pointer select-none transition-colors hover:text-foreground";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <svg className="h-5 w-5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
        <h2 className="text-sm font-semibold text-foreground">
          Receita por Vídeo (YouTube)
        </h2>
      </div>

      {!hasData ? (
        <div className="rounded-xl border border-border bg-card p-8 shadow-[var(--shadow-elevation-1)] text-center">
          <p className="text-sm text-muted-foreground">Sem dados de receita disponíveis</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MetricCard
              title="Receita Atribuída"
              value={fmtBRL(data!.totals.totalRevenue)}
            />
            <MetricCard
              title="Vendas Atribuídas"
              value={data!.totals.totalSales}
            />
            <MetricCard
              title="RPM Médio"
              value={fmtBRL(data!.totals.avgRpm)}
              suffix="por 1.000 views"
            />
          </div>

          <div className="rounded-xl border border-border bg-card shadow-[var(--shadow-elevation-1)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-1">
                    <th className={`${thBase} text-left`} onClick={() => handleSort("title")}>
                      Vídeo<SortArrow column="title" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </th>
                    <th className={`${thBase} text-right`} onClick={() => handleSort("views")}>
                      Views<SortArrow column="views" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </th>
                    <th className={`${thBase} text-right`} onClick={() => handleSort("sales")}>
                      Vendas<SortArrow column="sales" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </th>
                    <th className={`${thBase} text-right`} onClick={() => handleSort("revenue")}>
                      Receita<SortArrow column="revenue" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </th>
                    <th className={`${thBase} text-right`} onClick={() => handleSort("rpm")}>
                      RPM<SortArrow column="rpm" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedVideos.map((video) => (
                    <tr
                      key={video.videoId}
                      className="transition-colors hover:bg-surface-2/50"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {video.thumbnailUrl ? (
                            <img
                              src={video.thumbnailUrl}
                              alt=""
                              className="h-9 w-16 shrink-0 rounded object-cover"
                            />
                          ) : (
                            <div className="h-9 w-16 shrink-0 rounded bg-surface-2" />
                          )}
                          <span
                            className="truncate text-foreground max-w-[200px] lg:max-w-[300px]"
                            title={video.title}
                          >
                            {video.title}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-foreground">
                        {video.views.toLocaleString("pt-BR")}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-foreground">
                        {video.sales.toLocaleString("pt-BR")}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-foreground">
                        {fmtBRL(video.revenue)}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono tabular-nums ${rpmColor(video.rpm)}`}>
                        {fmtBRL(video.rpm)}
                      </td>
                    </tr>
                  ))}

                  {data!.pool && (
                    <tr className="bg-surface-1/60 border-t-2 border-border">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-16 shrink-0 items-center justify-center rounded bg-surface-2">
                            <svg className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                            </svg>
                          </div>
                          <span className="text-muted-foreground italic">
                            {data!.pool.videoCount} vídeos (link genérico)
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-muted-foreground">
                        {data!.pool.totalViews.toLocaleString("pt-BR")}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-muted-foreground">
                        {data!.pool.totalSales.toLocaleString("pt-BR")}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-muted-foreground">
                        {fmtBRL(data!.pool.totalRevenue)}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono tabular-nums ${rpmColor(data!.pool.rpm)} opacity-70`}>
                        {fmtBRL(data!.pool.rpm)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {data!.snapshotDate && (
            <p className="text-xs text-muted-foreground text-right">
              Snapshot YouTube: {formatDate(data!.snapshotDate)}
            </p>
          )}
        </>
      )}
    </div>
  );
}
