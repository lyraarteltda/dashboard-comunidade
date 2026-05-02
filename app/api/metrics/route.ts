import { NextResponse } from "next/server";
import { queryHogQL } from "@/lib/posthog-query";
import { parseDateRange } from "@/lib/date-params";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const { fromISO, toISO } = parseDateRange(searchParams);

  try {
    const hostFilter = `properties.$host = 'comunidade.maestrosdaia.com'`;

    const [visitsResult, dailyResult, ctaResult] = await Promise.all([
      queryHogQL(
        `SELECT count() as total
         FROM events
         WHERE event = '$pageview'
           AND ${hostFilter}
           AND timestamp >= toDateTime('${fromISO}')
           AND timestamp < toDateTime('${toISO}')`
      ),
      queryHogQL(
        `SELECT toDate(toTimeZone(timestamp, 'America/Sao_Paulo')) AS day, count() AS pageviews
         FROM events
         WHERE event = '$pageview'
           AND ${hostFilter}
           AND timestamp >= toDateTime('${fromISO}')
           AND timestamp < toDateTime('${toISO}')
         GROUP BY day
         ORDER BY day ASC`
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
          AND timestamp >= toDateTime('${fromISO}')
          AND timestamp < toDateTime('${toISO}')
        GROUP BY cta_text
        ORDER BY clicks DESC
        LIMIT 10`
      ),
    ]);

    const totalVisits = Number(visitsResult.results[0]?.[0] || 0);

    const visitsSeries = dailyResult.results.map(([day, pv]) => ({
      day: String(day),
      pageviews: Number(pv),
    }));

    const ctas = ctaResult.results.map(([text, clicks]) => ({
      name: String(text || "Unknown"),
      value: Number(clicks),
    }));

    return NextResponse.json({
      totalVisits,
      visitsSeries,
      ctas,
      from: fromISO,
      to: toISO,
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
