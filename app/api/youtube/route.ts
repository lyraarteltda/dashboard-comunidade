import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SB_KEY) {
    return NextResponse.json(
      { error: "Supabase credentials not configured" },
      { status: 500 }
    );
  }

  try {
    const snapshotRes = await fetch(
      `${SUPABASE_URL}/rest/v1/YouTube-views-comments-likes?select=snapshot_date&order=snapshot_date.desc&limit=1`,
      {
        headers: {
          apikey: SB_KEY,
          Authorization: `Bearer ${SB_KEY}`,
        },
      }
    );

    if (!snapshotRes.ok) {
      const body = await snapshotRes.text();
      console.error("Supabase snapshot error:", snapshotRes.status, body);
      return NextResponse.json({ error: "upstream_supabase" }, { status: 502 });
    }

    const snapshotRows: { snapshot_date: string }[] = await snapshotRes.json();

    if (snapshotRows.length === 0) {
      return NextResponse.json({
        videos: [],
        totals: { total_views: 0, total_likes: 0, total_comments: 0, total_videos: 0 },
        snapshot_date: null,
        fetchedAt: new Date().toISOString(),
      });
    }

    const latestSnapshot = snapshotRows[0].snapshot_date;
    const baseFilter = `snapshot_date=eq.${latestSnapshot}&duration_seconds=gt.60`;

    const [videosRes, allRes] = await Promise.all([
      fetch(
        `${SUPABASE_URL}/rest/v1/YouTube-views-comments-likes?select=video_id,title,views,likes,comments,shares,avg_view_duration_seconds,avg_view_percentage,estimated_minutes_watched,subscribers_gained,published_at,snapshot_date,thumbnail_url,duration_seconds&${baseFilter}&order=views.desc&limit=20`,
        {
          headers: {
            apikey: SB_KEY,
            Authorization: `Bearer ${SB_KEY}`,
          },
        }
      ),
      fetch(
        `${SUPABASE_URL}/rest/v1/YouTube-views-comments-likes?select=views,likes,comments&${baseFilter}`,
        {
          headers: {
            apikey: SB_KEY,
            Authorization: `Bearer ${SB_KEY}`,
          },
        }
      ),
    ]);

    if (!videosRes.ok) {
      const body = await videosRes.text();
      console.error("Supabase videos error:", videosRes.status, body);
      return NextResponse.json({ error: "upstream_supabase" }, { status: 502 });
    }

    const videos = await videosRes.json();
    const allVideos = allRes.ok ? await allRes.json() : videos;

    let total_views = 0;
    let total_likes = 0;
    let total_comments = 0;

    for (const v of allVideos) {
      total_views += v.views ?? 0;
      total_likes += v.likes ?? 0;
      total_comments += v.comments ?? 0;
    }

    return NextResponse.json({
      videos,
      totals: {
        total_views,
        total_likes,
        total_comments,
        total_videos: allVideos.length,
      },
      snapshot_date: latestSnapshot,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("YouTube fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch YouTube data" },
      { status: 500 }
    );
  }
}
