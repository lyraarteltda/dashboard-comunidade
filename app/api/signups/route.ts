import { NextResponse } from "next/server";
import { parseDateRangeForSupabase, toSaoPauloDate } from "@/lib/date-params";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 1000;

async function fetchAllSignups(
  supabaseUrl: string,
  key: string,
  since: string,
  until: string
): Promise<{ created_at: string }[]> {
  const all: { created_at: string }[] = [];
  let offset = 0;

  while (true) {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/community_signups?select=created_at&created_at=gte.${since}&created_at=lt.${until}&order=created_at.asc&limit=${PAGE_SIZE}&offset=${offset}`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
      }
    );

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Supabase error ${res.status}: ${body}`);
    }

    const rows: { created_at: string }[] = await res.json();
    all.push(...rows);

    if (rows.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return all;
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
  const { since, until } = parseDateRangeForSupabase(searchParams);

  try {
    const rows = await fetchAllSignups(SUPABASE_URL, KEY, since, until);

    const byDay = new Map<string, number>();
    for (const r of rows) {
      const d = toSaoPauloDate(r.created_at);
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
