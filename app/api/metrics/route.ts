import { NextResponse } from "next/server";
import { queryHogQL } from "@/lib/posthog-query";

export const dynamic = "force-dynamic";

function getDaysParam(searchParams: URLSearchParams): number {
  const range = searchParams.get("range") || "7";
  const days = parseInt(range, 10);
  if ([7, 30, 90].includes(days)) return days;
  return 7;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = getDaysParam(searchParams);

  try {
    const hostFilter = `properties.$host = 'comunidade.maestrosdaia.com'`;

    const [visitsResult, visitsYesterdayResult, sectionResult, ctaResult] = await Promise.all([
      queryHogQL(
        `SELECT count() as total FROM events WHERE event = '$pageview' AND ${hostFilter} AND timestamp > now() - interval ${days} day`
      ),
      queryHogQL(
        `SELECT
          countIf(timestamp > now() - interval 1 day) as today,
          countIf(timestamp > now() - interval 2 day AND timestamp <= now() - interval 1 day) as yesterday
        FROM events WHERE event = '$pageview' AND ${hostFilter}`
      ),
      queryHogQL(
        `SELECT properties.$pathname as path, count() as views
        FROM events
        WHERE event = '$pageview'
          AND ${hostFilter}
          AND timestamp > now() - interval ${days} day
        GROUP BY path
        ORDER BY views DESC
        LIMIT 10`
      ),
      queryHogQL(
        `SELECT
          properties.$el_text as cta_text,
          count() as clicks
        FROM events
        WHERE event = '$autocapture'
          AND ${hostFilter}
          AND properties.$el_text != ''
          AND properties.$el_text IS NOT NULL
          AND timestamp > now() - interval ${days} day
        GROUP BY cta_text
        ORDER BY clicks DESC
        LIMIT 10`
      ),
    ]);

    const totalVisits = Number(visitsResult.results[0]?.[0] || 0);
    const todayVisits = Number(visitsYesterdayResult.results[0]?.[0] || 0);
    const yesterdayVisits = Number(visitsYesterdayResult.results[0]?.[1] || 0);
    const visitsDelta = yesterdayVisits > 0
      ? ((todayVisits - yesterdayVisits) / yesterdayVisits) * 100
      : 0;

    const sections = sectionResult.results.map(([path, views]) => ({
      name: String(path) === "/" ? "Home (/)" : String(path || "Unknown"),
      value: Number(views),
    }));

    const ctas = ctaResult.results.map(([text, clicks]) => ({
      name: String(text || "Unknown"),
      value: Number(clicks),
    }));

    const totalCtaClicks = ctas.reduce((sum, c) => sum + c.value, 0);

    return NextResponse.json({
      totalVisits,
      visitsDelta: Math.round(visitsDelta * 10) / 10,
      todayVisits,
      yesterdayVisits,
      totalCtaClicks,
      sections,
      ctas,
      range: days,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Metrics fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch metrics" },
      { status: 500 }
    );
  }
}
