import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 1000;

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
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  if (!fromParam || !toParam) {
    return NextResponse.json(
      { error: "Missing from/to params" },
      { status: 400 }
    );
  }

  try {
    const all: { snapshot_date: string; views: number }[] = [];
    let offset = 0;

    while (true) {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/YouTube-views-comments-likes?select=snapshot_date,views&snapshot_date=gte.${fromParam}&snapshot_date=lte.${toParam}&order=snapshot_date.asc&limit=${PAGE_SIZE}&offset=${offset}`,
        {
          headers: {
            apikey: KEY,
            Authorization: `Bearer ${KEY}`,
          },
        }
      );

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Supabase error ${res.status}: ${body}`);
      }

      const rows: { snapshot_date: string; views: number }[] = await res.json();
      all.push(...rows);
      if (rows.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    const viewsBySnapshot = new Map<string, number>();
    for (const r of all) {
      viewsBySnapshot.set(
        r.snapshot_date,
        (viewsBySnapshot.get(r.snapshot_date) ?? 0) + (r.views ?? 0)
      );
    }

    const sortedDates = Array.from(viewsBySnapshot.keys()).sort();

    const series: { day: string; views: number }[] = [];
    for (let i = 1; i < sortedDates.length; i++) {
      const prev = viewsBySnapshot.get(sortedDates[i - 1])!;
      const curr = viewsBySnapshot.get(sortedDates[i])!;
      const delta = curr - prev;
      series.push({ day: sortedDates[i], views: delta > 0 ? delta : 0 });
    }

    return NextResponse.json({
      series,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("YT views fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch YT views" },
      { status: 500 }
    );
  }
}
