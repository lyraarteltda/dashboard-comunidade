import { NextResponse } from "next/server";
import { queryHogQL } from "@/lib/posthog-query";
import { parseDateRange, parseDateRangeForSupabase } from "@/lib/date-params";

export const dynamic = "force-dynamic";

interface DaySeries {
  day: string;
  visitors: number;
  purchases: number;
  conversion_pct: number | null;
}

export async function GET(request: Request) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SB_KEY) {
    return NextResponse.json(
      { error: "Supabase credentials not configured" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const { fromISO, toISO } = parseDateRange(searchParams);
  const { since, until } = parseDateRangeForSupabase(searchParams);
  const hostFilter = `properties.$host = 'comunidade.maestrosdaia.com'`;

  try {
    const [visitorsResult, purchasesRes] = await Promise.all([
      queryHogQL(
        `SELECT toDate(timestamp) AS day, count(DISTINCT distinct_id) AS visitors
         FROM events
         WHERE event = '$pageview'
           AND ${hostFilter}
           AND timestamp >= toDateTime('${fromISO}')
           AND timestamp < toDateTime('${toISO}')
         GROUP BY day
         ORDER BY day ASC`
      ),
      fetch(
        `${SUPABASE_URL}/rest/v1/comunidade_purchases?select=purchase_date,payment_status&payment_status=eq.approved&purchase_date=gte.${since.slice(0, 10)}&purchase_date=lt.${until.slice(0, 10)}&order=purchase_date.asc&limit=10000`,
        {
          headers: {
            apikey: SB_KEY,
            Authorization: `Bearer ${SB_KEY}`,
          },
        }
      ),
    ]);

    if (!purchasesRes.ok) {
      const body = await purchasesRes.text();
      console.error("Supabase error:", purchasesRes.status, body);
      return NextResponse.json({ error: "upstream_supabase" }, { status: 502 });
    }

    const purchaseRows: { purchase_date: string; payment_status: string }[] =
      await purchasesRes.json();

    const purchasesByDay = new Map<string, number>();
    for (const r of purchaseRows) {
      const d = r.purchase_date.slice(0, 10);
      purchasesByDay.set(d, (purchasesByDay.get(d) ?? 0) + 1);
    }

    const visitorsByDay = new Map<string, number>();
    for (const [day, visitors] of visitorsResult.results) {
      visitorsByDay.set(String(day), Number(visitors));
    }

    const allDays = new Set([
      ...visitorsByDay.keys(),
      ...purchasesByDay.keys(),
    ]);

    const series: DaySeries[] = [];
    let totalVisitors = 0;
    let totalPurchases = 0;

    for (const day of [...allDays].sort()) {
      const v = visitorsByDay.get(day) ?? 0;
      const p = purchasesByDay.get(day) ?? 0;
      if (v === 0 && p === 0) continue;

      totalVisitors += v;
      totalPurchases += p;

      series.push({
        day,
        visitors: v,
        purchases: p,
        conversion_pct:
          v > 0
            ? Math.round((p / v) * 10000) / 100
            : p > 0
              ? null
              : 0,
      });
    }

    const totalConversion =
      totalVisitors > 0
        ? Math.round((totalPurchases / totalVisitors) * 10000) / 100
        : null;

    return NextResponse.json({
      series,
      totals: {
        visitors: totalVisitors,
        purchases: totalPurchases,
        conversion_pct: totalConversion,
      },
      from: fromISO,
      to: toISO,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Conversion fetch error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch conversion data",
      },
      { status: 500 }
    );
  }
}
