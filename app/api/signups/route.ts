import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getDaysParam(searchParams: URLSearchParams): number {
  const range = searchParams.get("range") || "30";
  const days = parseInt(range, 10);
  if ([7, 30, 90].includes(days)) return days;
  return 30;
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
  const days = getDaysParam(searchParams);
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/community_signups?select=created_at&created_at=gte.${since}&order=created_at.asc&limit=10000`,
      {
        headers: {
          apikey: KEY,
          Authorization: `Bearer ${KEY}`,
        },
      }
    );

    if (!res.ok) {
      const body = await res.text();
      console.error("Supabase error:", res.status, body);
      return NextResponse.json({ error: "upstream" }, { status: 502 });
    }

    const rows: { created_at: string }[] = await res.json();

    const byDay = new Map<string, number>();
    for (const r of rows) {
      const d = r.created_at.slice(0, 10);
      byDay.set(d, (byDay.get(d) ?? 0) + 1);
    }

    const series = Array.from(byDay.entries())
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => a.day.localeCompare(b.day));

    const totalSignups = rows.length;
    const todayKey = new Date().toISOString().slice(0, 10);
    const todaySignups = byDay.get(todayKey) ?? 0;
    const yesterdayKey = new Date(Date.now() - 86_400_000)
      .toISOString()
      .slice(0, 10);
    const yesterdaySignups = byDay.get(yesterdayKey) ?? 0;

    return NextResponse.json({
      totalSignups,
      todaySignups,
      yesterdaySignups,
      series,
      range: days,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Signups fetch error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch signups",
      },
      { status: 500 }
    );
  }
}
