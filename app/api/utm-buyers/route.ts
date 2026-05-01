import { NextResponse } from "next/server";
import { parseDateRangeForSupabase } from "@/lib/date-params";

export const dynamic = "force-dynamic";

const UTM_FIELDS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

type UtmField = (typeof UTM_FIELDS)[number];

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
      `${SUPABASE_URL}/rest/v1/comunidade_purchases?select=utm_source,utm_medium,utm_campaign,utm_content,utm_term,id&payment_status=eq.approved&purchase_date=gte.${since}&purchase_date=lt.${until}&buyer_email=not.like.*@maestrosdaia.com&limit=10000`,
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

    const rows: Record<string, string | null>[] = await res.json();

    const result: Record<UtmField, Record<string, number>> = {
      utm_source: {},
      utm_medium: {},
      utm_campaign: {},
      utm_content: {},
      utm_term: {},
    };

    for (const row of rows) {
      for (const field of UTM_FIELDS) {
        const val = row[field]?.trim() || "(não definido)";
        result[field][val] = (result[field][val] ?? 0) + 1;
      }
    }

    const aggregated: Record<
      UtmField,
      { value: string; count: number }[]
    > = {} as any;

    for (const field of UTM_FIELDS) {
      aggregated[field] = Object.entries(result[field])
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count);
    }

    return NextResponse.json({
      aggregated,
      totalBuyers: rows.length,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("UTM buyers fetch error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch UTM buyers",
      },
      { status: 500 }
    );
  }
}
