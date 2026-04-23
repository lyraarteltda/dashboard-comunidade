import { NextResponse } from "next/server";
import { queryHogQL } from "@/lib/posthog-query";
import { parseDateRange } from "@/lib/date-params";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const { fromISO, toISO } = parseDateRange(searchParams);
  const hostFilter = `properties.$host = 'comunidade.maestrosdaia.com'`;

  try {
    const result = await queryHogQL(
      `SELECT
        coalesce(properties.utm_source, '(direto)') AS source,
        count() AS pageviews,
        count(DISTINCT distinct_id) AS unique_visitors
      FROM events
      WHERE event = '$pageview'
        AND ${hostFilter}
        AND timestamp >= toDateTime('${fromISO}')
        AND timestamp < toDateTime('${toISO}')
      GROUP BY source
      ORDER BY pageviews DESC
      LIMIT 20`
    );

    const data = result.results.map(([source, pageviews, unique_visitors]) => ({
      source: String(source),
      pageviews: Number(pageviews),
      unique_visitors: Number(unique_visitors),
    }));

    return NextResponse.json({
      data,
      from: fromISO,
      to: toISO,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("UTM breakdown fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch UTM data" },
      { status: 500 }
    );
  }
}
