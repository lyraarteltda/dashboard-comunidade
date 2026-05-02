import { NextResponse } from "next/server";
import { parseDateRangeForSupabase, toSaoPauloDate } from "@/lib/date-params";

export const dynamic = "force-dynamic";

const REFUND_STATUSES = ["refunded", "chargeback", "canceled", "revoked", "chargedback"];

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

  const headers = {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
  };

  try {
    const statusFilter = REFUND_STATUSES.map((s) => `payment_status.eq.${s}`).join(",");

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/comunidade_purchases?select=purchase_date,payment_status,price_reais,buyer_name,buyer_email&or=(${statusFilter})&purchase_date=gte.${since}&purchase_date=lt.${until}&order=purchase_date.asc&limit=10000`,
      { headers }
    );

    if (!res.ok) {
      const body = await res.text();
      console.error("Supabase refunds error:", res.status, body);
      return NextResponse.json({ error: "upstream" }, { status: 502 });
    }

    const rows: {
      purchase_date: string;
      payment_status: string;
      price_reais: number | null;
      buyer_name: string;
      buyer_email: string;
    }[] = await res.json();

    const byDay = new Map<string, { count: number; amount: number }>();
    let totalAmount = 0;

    for (const r of rows) {
      const d = toSaoPauloDate(r.purchase_date);
      const existing = byDay.get(d) ?? { count: 0, amount: 0 };
      existing.count += 1;
      existing.amount += r.price_reais ?? 0;
      byDay.set(d, existing);
      totalAmount += r.price_reais ?? 0;
    }

    const series = Array.from(byDay.entries())
      .map(([day, { count, amount }]) => ({ day, count, amount }))
      .sort((a, b) => a.day.localeCompare(b.day));

    const recent = rows.slice(-10).reverse().map((r) => ({
      name: r.buyer_name,
      email: r.buyer_email,
      reason: r.payment_status,
      amount: r.price_reais,
      date: r.purchase_date,
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
    console.error("Refunds fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch refunds" },
      { status: 500 }
    );
  }
}
