import { NextResponse } from "next/server";
import { parseDateRangeForPurchases } from "@/lib/date-params";

export const dynamic = "force-dynamic";

const GENERIC_TAG = "youtubedescription";

interface YouTubeRow {
  video_id: string;
  title: string;
  views: number;
  likes: number;
  thumbnail_url: string | null;
  published_at: string | null;
  video_utm_content: string;
  snapshot_date: string;
}

interface PurchaseRow {
  utm_content: string;
  price_reais: number;
}

export async function GET(request: Request) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !KEY) {
    return NextResponse.json(
      { error: "Supabase credentials not configured" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const { since, until } = parseDateRangeForPurchases(searchParams);
  const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };

  try {
    const snapshotRes = await fetch(
      `${SUPABASE_URL}/rest/v1/YouTube-views-comments-likes?select=snapshot_date&order=snapshot_date.desc&limit=1`,
      { headers }
    );
    if (!snapshotRes.ok) {
      return NextResponse.json({ error: "upstream" }, { status: 502 });
    }
    const snapshotRows: { snapshot_date: string }[] = await snapshotRes.json();
    if (snapshotRows.length === 0) {
      return NextResponse.json({
        videos: [],
        pool: null,
        totals: { totalRevenue: 0, totalSales: 0, avgRpm: 0 },
        snapshotDate: null,
        fetchedAt: new Date().toISOString(),
      });
    }
    const latestSnapshot = snapshotRows[0].snapshot_date;

    const [videosRes, purchasesRes] = await Promise.all([
      fetch(
        `${SUPABASE_URL}/rest/v1/YouTube-views-comments-likes?select=video_id,title,views,likes,thumbnail_url,published_at,video_utm_content,snapshot_date&snapshot_date=eq.${latestSnapshot}&duration_seconds=gt.180&video_utm_content=not.is.null&order=views.desc&limit=200`,
        { headers }
      ),
      fetch(
        `${SUPABASE_URL}/rest/v1/comunidade_purchases?select=utm_content,price_reais&payment_status=eq.approved&utm_content=not.is.null&purchase_date=gte.${since}&purchase_date=lt.${until}&buyer_email=not.like.*@maestrosdaia.com&limit=10000`,
        { headers }
      ),
    ]);

    if (!videosRes.ok || !purchasesRes.ok) {
      return NextResponse.json({ error: "upstream" }, { status: 502 });
    }

    const videos: YouTubeRow[] = await videosRes.json();
    const purchases: PurchaseRow[] = await purchasesRes.json();

    const ytUtmTags = new Set(videos.map((v) => v.video_utm_content));

    const purchasesByUtm: Record<string, { sales: number; revenue: number }> = {};
    for (const p of purchases) {
      const tag = p.utm_content?.trim();
      if (!tag || !ytUtmTags.has(tag)) continue;
      if (!purchasesByUtm[tag]) purchasesByUtm[tag] = { sales: 0, revenue: 0 };
      purchasesByUtm[tag].sales += 1;
      purchasesByUtm[tag].revenue += p.price_reais ?? 0;
    }

    const uniqueVideos: {
      videoId: string;
      title: string;
      views: number;
      likes: number;
      thumbnailUrl: string | null;
      publishedAt: string | null;
      utmTag: string;
      sales: number;
      revenue: number;
      rpm: number;
    }[] = [];

    const poolVideos: YouTubeRow[] = [];

    for (const v of videos) {
      if (v.video_utm_content === GENERIC_TAG) {
        poolVideos.push(v);
      } else {
        const stats = purchasesByUtm[v.video_utm_content] || {
          sales: 0,
          revenue: 0,
        };
        uniqueVideos.push({
          videoId: v.video_id,
          title: v.title,
          views: v.views ?? 0,
          likes: v.likes ?? 0,
          thumbnailUrl: v.thumbnail_url,
          publishedAt: v.published_at,
          utmTag: v.video_utm_content,
          sales: stats.sales,
          revenue: stats.revenue,
          rpm: v.views > 0 ? (stats.revenue / v.views) * 1000 : 0,
        });
      }
    }

    uniqueVideos.sort((a, b) => b.revenue - a.revenue);

    const poolStats = purchasesByUtm[GENERIC_TAG] || { sales: 0, revenue: 0 };
    const poolTotalViews = poolVideos.reduce((s, v) => s + (v.views ?? 0), 0);
    const pool = poolVideos.length > 0
      ? {
          tag: GENERIC_TAG,
          videoCount: poolVideos.length,
          totalViews: poolTotalViews,
          totalSales: poolStats.sales,
          totalRevenue: poolStats.revenue,
          rpm: poolTotalViews > 0 ? (poolStats.revenue / poolTotalViews) * 1000 : 0,
        }
      : null;

    const totalRevenue =
      uniqueVideos.reduce((s, v) => s + v.revenue, 0) +
      (pool?.totalRevenue ?? 0);
    const totalSales =
      uniqueVideos.reduce((s, v) => s + v.sales, 0) +
      (pool?.totalSales ?? 0);
    const totalViews =
      uniqueVideos.reduce((s, v) => s + v.views, 0) +
      (pool?.totalViews ?? 0);
    const avgRpm = totalViews > 0 ? (totalRevenue / totalViews) * 1000 : 0;

    return NextResponse.json({
      videos: uniqueVideos,
      pool,
      totals: { totalRevenue, totalSales, avgRpm },
      snapshotDate: latestSnapshot,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("YouTube revenue fetch error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch YouTube revenue",
      },
      { status: 500 }
    );
  }
}
