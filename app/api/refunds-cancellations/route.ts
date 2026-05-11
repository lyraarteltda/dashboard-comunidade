import { NextResponse } from "next/server";
import { parseDateRangeForPurchases, extractPurchaseDate } from "@/lib/date-params";

export const dynamic = "force-dynamic";

interface SupabaseRow {
  id: string;
  transaction_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  product_name: string;
  amount_cents: number | null;
  occurred_at: string;
  raw_payload: Record<string, unknown> | null;
}

interface EventRow {
  id: string;
  transaction_id: string;
  customer_name: string;
  customer_email: string;
  product_name: string;
  amount: number;
  date: string;
  event_type: "REFUNDED" | "CHARGEDBACK" | "CANCELLED";
  original_purchase_date: string | null;
  days_to_event: number | null;
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
  const { since, until } = parseDateRangeForPurchases(searchParams);

  const headers = {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
  };

  try {
    const [refundsRes, cancellationsRes, purchasesRes] = await Promise.all([
      fetch(
        `${SUPABASE_URL}/rest/v1/refunds_comunidade?select=id,transaction_id,customer_name,customer_email,customer_phone,product_name,amount_cents,occurred_at,raw_payload&occurred_at=gte.${since}&occurred_at=lt.${until}&order=occurred_at.asc&limit=10000`,
        { headers }
      ),
      fetch(
        `${SUPABASE_URL}/rest/v1/subscription_cancelled_comunidade?select=id,transaction_id,customer_name,customer_email,customer_phone,product_name,amount_cents,occurred_at,raw_payload&occurred_at=gte.${since}&occurred_at=lt.${until}&order=occurred_at.asc&limit=10000`,
        { headers }
      ),
      fetch(
        `${SUPABASE_URL}/rest/v1/comunidade_purchases?select=order_id,price_reais&payment_status=eq.approved&purchase_date=gte.${since}&purchase_date=lt.${until}&buyer_email=not.like.*@maestrosdaia.com&limit=10000`,
        { headers }
      ),
    ]);

    if (!refundsRes.ok || !cancellationsRes.ok || !purchasesRes.ok) {
      console.error("Supabase error:", {
        refunds: refundsRes.status,
        cancellations: cancellationsRes.status,
        purchases: purchasesRes.status,
      });
      return NextResponse.json({ error: "upstream" }, { status: 502 });
    }

    const refundRows: SupabaseRow[] = await refundsRes.json();
    const cancellationRows: SupabaseRow[] = await cancellationsRes.json();
    const purchaseRows: { order_id: string; price_reais: number | null }[] =
      await purchasesRes.json();

    const totalSales = purchaseRows.length;

    function parseRow(
      row: SupabaseRow,
      defaultType: "REFUNDED" | "CANCELLED"
    ): EventRow {
      const rawStatus = (row.raw_payload?.status as string) ?? "";
      let event_type: EventRow["event_type"] = defaultType;
      if (rawStatus === "CHARGEDBACK") event_type = "CHARGEDBACK";
      else if (rawStatus === "REFUNDED") event_type = "REFUNDED";
      else if (rawStatus === "CANCELLED") event_type = "CANCELLED";

      const purchaseDateStr =
        (row.raw_payload?.purchase_date as string) ?? null;
      let original_purchase_date: string | null = null;
      let days_to_event: number | null = null;

      if (purchaseDateStr) {
        original_purchase_date = purchaseDateStr.slice(0, 10);
        const purchaseMs = new Date(purchaseDateStr).getTime();
        const eventMs = new Date(row.occurred_at).getTime();
        if (!isNaN(purchaseMs) && !isNaN(eventMs)) {
          days_to_event = Math.round(
            (eventMs - purchaseMs) / (1000 * 60 * 60 * 24)
          );
        }
      }

      return {
        id: row.id,
        transaction_id: row.transaction_id,
        customer_name: row.customer_name,
        customer_email: row.customer_email,
        product_name: row.product_name || "Comunidade Maestros da IA",
        amount: (row.amount_cents ?? 0) / 100,
        date: row.occurred_at,
        event_type,
        original_purchase_date,
        days_to_event,
      };
    }

    const allEvents: EventRow[] = [
      ...refundRows.map((r) => parseRow(r, "REFUNDED")),
      ...cancellationRows.map((r) => parseRow(r, "CANCELLED")),
    ].sort((a, b) => a.date.localeCompare(b.date));

    const refundCount = allEvents.filter(
      (e) => e.event_type === "REFUNDED" || e.event_type === "CHARGEDBACK"
    ).length;
    const chargebackCount = allEvents.filter(
      (e) => e.event_type === "CHARGEDBACK"
    ).length;
    const cancellationCount = allEvents.filter(
      (e) => e.event_type === "CANCELLED"
    ).length;
    const totalRefundAmount = allEvents
      .filter(
        (e) => e.event_type === "REFUNDED" || e.event_type === "CHARGEDBACK"
      )
      .reduce((sum, e) => sum + e.amount, 0);

    const refundRate =
      totalSales > 0
        ? Math.round((refundCount / totalSales) * 10000) / 100
        : 0;
    const cancellationRate =
      totalSales > 0
        ? Math.round((cancellationCount / totalSales) * 10000) / 100
        : 0;

    const byDay = new Map<
      string,
      { refunds: number; cancellations: number; chargebacks: number }
    >();
    for (const e of allEvents) {
      const d = extractPurchaseDate(e.date);
      const existing = byDay.get(d) ?? {
        refunds: 0,
        cancellations: 0,
        chargebacks: 0,
      };
      if (e.event_type === "CHARGEDBACK") existing.chargebacks += 1;
      else if (e.event_type === "REFUNDED") existing.refunds += 1;
      else existing.cancellations += 1;
      byDay.set(d, existing);
    }

    const series = Array.from(byDay.entries())
      .map(([day, counts]) => ({ day, ...counts }))
      .sort((a, b) => a.day.localeCompare(b.day));

    return NextResponse.json({
      summary: {
        totalRefunds: refundCount,
        totalChargebacks: chargebackCount,
        totalCancellations: cancellationCount,
        totalRefundAmount,
        totalSales,
        refundRate,
        cancellationRate,
      },
      series,
      events: allEvents,
      from: since,
      to: until,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Refunds-cancellations fetch error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch refunds/cancellations",
      },
      { status: 500 }
    );
  }
}
