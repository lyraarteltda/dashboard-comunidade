import { NextResponse } from "next/server";
import { parseDateRangeForPurchases, extractPurchaseDate } from "@/lib/date-params";

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
  const { since, until } = parseDateRangeForPurchases(searchParams);

  const headers = {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
  };

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/subscription_cancelled_comunidade?select=transaction_id,customer_name,customer_email,amount_cents,occurred_at,raw_payload&occurred_at=gte.${since}&occurred_at=lt.${until}&order=occurred_at.asc&limit=10000`,
      { headers }
    );

    if (!res.ok) {
      const body = await res.text();
      console.error("Supabase cancellations error:", res.status, body);
      return NextResponse.json({ error: "upstream" }, { status: 502 });
    }

    const rows: {
      transaction_id: string;
      customer_name: string;
      customer_email: string;
      amount_cents: number | null;
      occurred_at: string;
      raw_payload: Record<string, unknown> | null;
    }[] = await res.json();

    const byDay = new Map<string, { count: number; amount: number }>();
    let totalAmount = 0;

    for (const r of rows) {
      const d = extractPurchaseDate(r.occurred_at);
      const amountReais = (r.amount_cents ?? 0) / 100;
      const existing = byDay.get(d) ?? { count: 0, amount: 0 };
      existing.count += 1;
      existing.amount += amountReais;
      byDay.set(d, existing);
      totalAmount += amountReais;
    }

    const series = Array.from(byDay.entries())
      .map(([day, { count, amount }]) => ({ day, count, amount }))
      .sort((a, b) => a.day.localeCompare(b.day));

    const recent = rows.slice(-10).reverse().map((r) => ({
      name: r.customer_name,
      email: r.customer_email,
      reason: "Cancelamento",
      amount: (r.amount_cents ?? 0) / 100,
      date: r.occurred_at,
    }));

    return NextResponse.json({
      totalRefunds: rows.length,
      totalAmount,
      series,
      recent,
      from: since,
      to: until,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cancellations fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch cancellations" },
      { status: 500 }
    );
  }
}
