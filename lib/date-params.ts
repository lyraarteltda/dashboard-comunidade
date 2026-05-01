export function toBRTDate(utcTimestamp: string): string {
  const d = new Date(utcTimestamp);
  d.setUTCHours(d.getUTCHours() - 3);
  return d.toISOString().slice(0, 10);
}

export interface DateRange {
  fromISO: string;
  toISO: string;
}

export function parseDateRange(searchParams: URLSearchParams): DateRange {
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  if (fromParam && toParam) {
    const fromDate = new Date(fromParam + "T03:00:00Z");
    const toDate = new Date(toParam + "T03:00:00Z");
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
    const toDate = new Date(toParam + "T03:00:00Z");
    toDate.setUTCDate(toDate.getUTCDate() + 1);
    return {
      since: fromParam + "T03:00:00.000Z",
      until: toDate.toISOString(),
    };
  }

  const range = searchParams.get("range") || "7";
  const days = parseInt(range, 10) || 7;
  const nowBRT = new Date();
  nowBRT.setUTCHours(3, 0, 0, 0);
  if (Date.now() < nowBRT.getTime()) {
    nowBRT.setUTCDate(nowBRT.getUTCDate() - 1);
  }
  const sinceBRT = new Date(nowBRT);
  sinceBRT.setUTCDate(sinceBRT.getUTCDate() - days);
  const untilBRT = new Date(nowBRT);
  untilBRT.setUTCDate(untilBRT.getUTCDate() + 1);
  return {
    since: sinceBRT.toISOString(),
    until: untilBRT.toISOString(),
  };
}
