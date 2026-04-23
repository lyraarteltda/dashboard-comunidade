export interface DateRange {
  fromISO: string;
  toISO: string;
}

export function parseDateRange(searchParams: URLSearchParams): DateRange {
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  if (fromParam && toParam) {
    const fromDate = new Date(fromParam + "T00:00:00Z");
    const toDate = new Date(toParam + "T00:00:00Z");
    toDate.setUTCDate(toDate.getUTCDate() + 1);
    return {
      fromISO: fromDate.toISOString().slice(0, 19),
      toISO: toDate.toISOString().slice(0, 19),
    };
  }

  const range = searchParams.get("range") || "7";
  const days = parseInt(range, 10) || 7;
  const from = new Date(Date.now() - days * 86_400_000);
  return {
    fromISO: from.toISOString().slice(0, 19),
    toISO: new Date().toISOString().slice(0, 19),
  };
}

export function parseDateRangeForSupabase(searchParams: URLSearchParams): {
  since: string;
  until: string;
} {
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  if (fromParam && toParam) {
    const toDate = new Date(toParam + "T00:00:00Z");
    toDate.setUTCDate(toDate.getUTCDate() + 1);
    return {
      since: fromParam + "T00:00:00.000Z",
      until: toDate.toISOString(),
    };
  }

  const range = searchParams.get("range") || "7";
  const days = parseInt(range, 10) || 7;
  return {
    since: new Date(Date.now() - days * 86_400_000).toISOString(),
    until: new Date().toISOString(),
  };
}
