"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { MetricCard } from "./metric-card";

interface YouTubeVideo {
  video_id: string;
  title: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  avg_view_duration_seconds: number;
  avg_view_percentage: number;
  estimated_minutes_watched: number;
  subscribers_gained: number;
  published_at: string;
  snapshot_date: string;
  thumbnail_url: string;
}

interface YouTubeData {
  videos: YouTubeVideo[];
  totals: {
    total_views: number;
    total_likes: number;
    total_comments: number;
    total_videos: number;
  };
  snapshot_date: string | null;
  fetchedAt: string;
}

interface YouTubeMetricsProps {
  data: YouTubeData | null;
  loading?: boolean;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
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

export function YouTubeMetrics({ data, loading }: YouTubeMetricsProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
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

  const hasData = data && data.videos.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <svg
          className="h-5 w-5 text-red-500"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
        <h2 className="text-sm font-semibold text-foreground">
          Métricas YouTube
        </h2>
      </div>

      {!hasData ? (
        <div className="rounded-xl border border-border bg-card p-8 shadow-[var(--shadow-elevation-1)] text-center">
          <p className="text-sm text-muted-foreground">Sem dados disponíveis</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <MetricCard
              title="Total Views"
              value={data.totals.total_views.toLocaleString("pt-BR")}
            />
            <MetricCard
              title="Total Likes"
              value={data.totals.total_likes.toLocaleString("pt-BR")}
            />
            <MetricCard
              title="Total Comments"
              value={data.totals.total_comments.toLocaleString("pt-BR")}
            />
            <MetricCard
              title="Total Vídeos"
              value={data.totals.total_videos}
            />
          </div>

          <div className="rounded-xl border border-border bg-card shadow-[var(--shadow-elevation-1)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-1">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Vídeo
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Views
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Likes
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Comments
                    </th>
                    <th className="hidden px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground md:table-cell">
                      Avg View %
                    </th>
                    <th className="hidden px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground lg:table-cell">
                      Publicado
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.videos.map((video) => (
                    <tr
                      key={video.video_id}
                      className="transition-colors hover:bg-surface-2/50"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {video.thumbnail_url ? (
                            <img
                              src={video.thumbnail_url}
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
                        {(video.views ?? 0).toLocaleString("pt-BR")}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-foreground">
                        {(video.likes ?? 0).toLocaleString("pt-BR")}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-foreground">
                        {(video.comments ?? 0).toLocaleString("pt-BR")}
                      </td>
                      <td className="hidden px-4 py-3 text-right font-mono tabular-nums text-muted-foreground md:table-cell">
                        {video.avg_view_percentage != null
                          ? `${video.avg_view_percentage.toFixed(1)}%`
                          : "—"}
                      </td>
                      <td className="hidden px-4 py-3 text-right text-xs text-muted-foreground lg:table-cell">
                        {video.published_at ? formatDate(video.published_at) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {data.snapshot_date && (
            <p className="text-xs text-muted-foreground text-right">
              Última atualização: {formatDate(data.snapshot_date)}
            </p>
          )}
        </>
      )}
    </div>
  );
}
