const POSTHOG_HOST = "https://us.posthog.com";
const PROJECT_ID = process.env.POSTHOG_PROJECT_ID || "389613";
const API_KEY = process.env.POSTHOG_PERSONAL_API_KEY!;

export interface HogQLResult {
  columns: string[];
  results: unknown[][];
}

export async function queryHogQL(sql: string): Promise<HogQLResult> {
  const res = await fetch(
    `${POSTHOG_HOST}/api/projects/${PROJECT_ID}/query/`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: {
          kind: "HogQLQuery",
          query: sql,
        },
      }),
      next: { revalidate: 0 },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PostHog API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return {
    columns: data.columns || [],
    results: data.results || [],
  };
}
