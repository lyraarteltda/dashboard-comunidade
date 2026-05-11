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

type EventType = "REFUNDED" | "CHARGEDBACK" | "CANCELLED" | "PAYMENT_FAILED";

interface EventRow {
  id: string;
  transaction_id: string;
  customer_name: string;
  customer_email: string;
  product_name: string;
  amount: number;
  date: string;
  event_type: EventType;
  original_purchase_date: string | null;
  days_to_event: number | null;
  refuse_reason: string | null;
}

const REFUSE_CODE_MAP: Record<string, string> = {
  cc_rejected_high_risk: "Alto risco (antifraude)",
  cc_rejected_insufficient_amount: "Saldo insuficiente",
  cc_rejected_call_for_authorize: "Cartão com restrição",
  cc_rejected_card_type_not_allowed: "Tipo de cartão não aceito",
  not_authorized: "Não autorizado",
  "1004": "Não autorizado",
  "1016": "Não autorizado",
};

function classifyCancellation(raw: Record<string, unknown> | null): {
  eventType: EventType;
  refuseReason: string | null;
} {
  if (!raw || Object.keys(raw).length === 0) {
    return { eventType: "CANCELLED", refuseReason: null };
  }

  const transactions = (raw.transactions as Array<Record<string, unknown>>) ?? [];

  if (transactions.length === 0) {
    return { eventType: "CANCELLED", refuseReason: null };
  }

  const refuseCodes: string[] = [];
  let hasFailure = false;

  for (const txn of transactions) {
    if (txn.refuse_code) {
      refuseCodes.push(String(txn.refuse_code));
      hasFailure = true;
    }
    if (txn.status === "FAILED") {
      hasFailure = true;
    }
  }

  if (hasFailure) {
    const primaryCode = refuseCodes[0] ?? null;
    const reason = primaryCode
      ? REFUSE_CODE_MAP[primaryCode] ?? `Recusado (${primaryCode})`
      : "Pagamento falhou";
    return { eventType: "PAYMENT_FAILED", refuseReason: reason };
  }

  return { eventType: "CANCELLED", refuseReason: null };
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

    function parseRefundRow(row: SupabaseRow): EventRow {
      const rawStatus = (row.raw_payload?.status as string) ?? "";
      let event_type: EventType = "REFUNDED";
      if (rawStatus === "CHARGEDBACK") event_type = "CHARGEDBACK";

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
        refuse_reason: null,
      };
    }

    function parseCancellationRow(row: SupabaseRow): EventRow {
      const { eventType, refuseReason } = classifyCancellation(row.raw_payload);

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
        event_type: eventType,
        original_purchase_date,
        days_to_event,
        refuse_reason: refuseReason,
      };
    }

    const allEvents: EventRow[] = [
      ...refundRows.map(parseRefundRow),
      ...cancellationRows.map(parseCancellationRow),
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
    const paymentFailedCount = allEvents.filter(
      (e) => e.event_type === "PAYMENT_FAILED"
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
    const churnRate =
      totalSales > 0
        ? Math.round(
            ((refundCount + cancellationCount) / totalSales) * 10000
          ) / 100
        : 0;

    const byDay = new Map<
      string,
      { refunds: number; cancellations: number; chargebacks: number; payment_failed: number }
    >();
    for (const e of allEvents) {
      const d = extractPurchaseDate(e.date);
      const existing = byDay.get(d) ?? {
        refunds: 0,
        cancellations: 0,
        chargebacks: 0,
        payment_failed: 0,
      };
      if (e.event_type === "CHARGEDBACK") existing.chargebacks += 1;
      else if (e.event_type === "REFUNDED") existing.refunds += 1;
      else if (e.event_type === "PAYMENT_FAILED") existing.payment_failed += 1;
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
        totalPaymentsFailed: paymentFailedCount,
        totalRefundAmount,
        totalSales,
        refundRate,
        cancellationRate,
        churnRate,
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
