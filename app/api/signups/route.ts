import { NextResponse } from "next/server";
import { parseDateRangeForSupabase } from "@/lib/date-params";

export const dynamic = "force-dynamic";

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
  const { since, until } = parseDateRangeForSupabase(searchParams);

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/community_signups?select=created_at&created_at=gte.${since}&created_at=lt.${until}&order=created_at.asc&limit=10000`,
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
      const dt = new Date(r.created_at);
      dt.setUTCHours(dt.getUTCHours() - 3);
      const d = dt.toISOString().slice(0, 10);
      byDay.set(d, (byDay.get(d) ?? 0) + 1);
    }

    const series = Array.from(byDay.entries())
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => a.day.localeCompare(b.day));

    const totalSignups = rows.length;

    return NextResponse.json({
      totalSignups,
      series,
      from: since,
      to: until,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Signups fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch signups" },
      { status: 500 }
    );
  }
}
