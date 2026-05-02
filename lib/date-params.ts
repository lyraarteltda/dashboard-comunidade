const TZ = "America/Sao_Paulo";

export function toSaoPauloDate(utcTimestamp: string): string {
  return new Date(utcTimestamp).toLocaleDateString("sv-SE", { timeZone: TZ });
}

/** @deprecated Use toSaoPauloDate */
export const toBRTDate = toSaoPauloDate;

function todayInSaoPaulo(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: TZ });
}

function spMidnightToUTC(dateStr: string): Date {
  return new Date(dateStr + "T03:00:00.000Z");
}

export interface DateRange {
  fromISO: string;
  toISO: string;
}

export function parseDateRange(searchParams: URLSearchParams): DateRange {
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  if (fromParam && toParam) {
    const fromDate = spMidnightToUTC(fromParam);
    const toDate = spMidnightToUTC(toParam);
    toDate.setUTCDate(toDate.getUTCDate() + 1);
    return {
      fromISO: fromDate.toISOString().slice(0, 19),
      toISO: toDate.toISOString().slice(0, 19),
    };
  }

  const range = searchParams.get("range") || "7";
  const days = parseInt(range, 10) || 7;
  const today = todayInSaoPaulo();
  const from = spMidnightToUTC(today);
  from.setUTCDate(from.getUTCDate() - days);
  const to = spMidnightToUTC(today);
  to.setUTCDate(to.getUTCDate() + 1);
  return {
    fromISO: from.toISOString().slice(0, 19),
    toISO: to.toISOString().slice(0, 19),
  };
}

export function parseDateRangeForSupabase(searchParams: URLSearchParams): {
  since: string;
  until: string;
} {
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  if (fromParam && toParam) {
    const toDate = spMidnightToUTC(toParam);
    toDate.setUTCDate(toDate.getUTCDate() + 1);
    return {
      since: spMidnightToUTC(fromParam).toISOString(),
      until: toDate.toISOString(),
    };
  }

  const range = searchParams.get("range") || "7";
  const days = parseInt(range, 10) || 7;
  const today = todayInSaoPaulo();
  const since = spMidnightToUTC(today);
  since.setUTCDate(since.getUTCDate() - days);
  const until = spMidnightToUTC(today);
  until.setUTCDate(until.getUTCDate() + 1);
  return {
    since: since.toISOString(),
    until: until.toISOString(),
  };
}
