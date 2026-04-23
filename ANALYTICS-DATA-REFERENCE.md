# Comunidade Maestros da IA — Analytics Data Reference

Complete reference for any Claude Code session to pull analytics data from **comunidade.maestrosdaia.com** (the paid community landing page). Drop this file into a data-analyst worker's context and every query below becomes a ready-to-run recipe.

---

## 1. What's being tracked

**Property / source:** PostHog Cloud US · Project `comunidade-maestros` (ID `389613`) · Host `https://us.i.posthog.com`.

**Tracking scope:** pageviews + autocapture clicks + custom section events + session replay. Integration went live on the LP on **2026-04-20 at 14:10 UTC** — no data exists before that.

**Critical scoping filter:** the project also receives events from the sibling `comunidadeaberta.maestrosdaia.com` (free community LP). **Always** add `properties.$host = 'comunidade.maestrosdaia.com'` to every query unless you explicitly want cross-site data.

**Live view:** https://dash.maestrosdaia.com (public) and the PostHog dashboard `LP Overview` at https://us.posthog.com/project/389613/dashboard/1488483.

---

## 2. Credentials (never hard-code)

All PostHog credentials live in `.claude/keys.md` on the operating worker's folder under the `## PostHog Cloud` section:

| Field | Where |
|---|---|
| Personal API Key (`phx_...`) — for HogQL | keys.md → "Personal API Key" |
| Project API Key (`phc_...`) — used by the browser, NOT needed for reading | keys.md → "Project API Key" |
| Project ID (`389613`) | keys.md / hardcoded below |
| API base | `https://us.posthog.com/api/projects/389613/` |

Standard one-liner to read the key (works from any worker that has a copy of keys.md):

```bash
KEY=$(grep -oE 'phx_[A-Za-z0-9_-]+' .claude/keys.md | head -1)
PROJECT=389613
```

If the worker doesn't have keys.md, fall back to:
```bash
KEY=$(grep -oE 'phx_[A-Za-z0-9_-]+' "/Users/arthurendo/Desktop/AI COMPANY/_chiefs/cmo/head-of-landing-pages/github-frontend-editor/.claude/keys.md" | head -1)
```

---

## 3. Authentication template (all queries use this)

```bash
curl -s -X POST "https://us.posthog.com/api/projects/$PROJECT/query/" \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"query":{"kind":"HogQLQuery","query":"<SQL_HERE>"}}'
```

Response shape (only `results` matters for most cases):
```json
{
  "results": [[val1, val2, ...], [val1, val2, ...]],
  "columns": ["col1", "col2", ...],
  "types": [...]
}
```

Parse with:
```bash
| python3 -c "import sys,json; [print(r) for r in json.load(sys.stdin)['results']]"
```

---

## 4. HogQL ↔ SQL quick notes

- `properties.<key>` reads a PostHog property. Wrap `$`-prefixed ones in backticks OR dot-access (`properties.$host` works).
- `toDate(timestamp)` → date part.
- `now() - interval N <unit>` where unit is `second|minute|hour|day|week|month`.
- `count(DISTINCT distinct_id)` for unique users; `count(DISTINCT $session_id)` for sessions.
- `today()` = start of today in project timezone (UTC by default).
- String `IN` syntax: `properties.cta IN ('a', 'b')` (comma-separated, no tuple keyword needed).
- To shell-escape `$` inside single-quoted curl body: use `'\''...'\''` for literal single quotes, and keep `$foo` inside double-quotes if you want bash interpolation. See examples below.

---

## 5. Event + property reference

### Events fired from the LP
| Event | When | Key properties |
|---|---|---|
| `$pageview` | Page loads | `$current_url`, `$pathname`, `$host`, `$referrer`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `$device_type`, `$browser`, `$geoip_country_name`, `$geoip_city_name` |
| `$pageleave` | User leaves page | duration via implicit `$session_id` |
| `$autocapture` | Any click | `$el_text` (clicked text), `cta` (custom — set on tagged CTAs), `$event_type` |
| `section_viewed` | Section scrolls into view | `section` (string: `hero`, `problem`, `pillars`, `knowledge`, `lives`, `support`, `updates`, `testimonials`, `founders`, `pricing`, `faq`, `final_cta`) |
| `section_dwell` | Section leaves viewport after >500ms | `section`, `dwell_ms` |

### Named CTAs (via `data-ph-capture-attribute-cta=` on the LP)
- `pricing_main_checkout` — pricing card checkout CTA
- `final_cta_checkout` — bottom FinalCTA section checkout
- All other clicks auto-captured with `cta` = null (use `$el_text` for their label)

### Useful auto-properties
- `properties.$host` — hostname only (e.g. `comunidade.maestrosdaia.com`). **Primary scoping filter.**
- `properties.$pathname` — `/` or `/entrar`. Use for "top pages" grouping (dedupes UTM/fbclid noise).
- `properties.$current_url` — full URL including query string (AVOID for grouping).
- `properties.$referring_domain` — where visitor came from when no UTM.
- `properties.utm_*` — standard UTM fields.
- `properties.$device_type` — `Desktop` / `Mobile` / `Tablet`.
- `properties.$browser`, `$os`.
- `properties.$geoip_country_name`, `$geoip_city_name`.

---

## 6. Recipe library (copy-paste, swap window as needed)

All recipes below assume `KEY`, `PROJECT` set per section 2. Unless noted, every recipe already scopes to `comunidade.maestrosdaia.com`.

### 6.1 Total visits + unique visitors + sessions (window)

Windows: swap the `interval N hour/day` block.

```bash
curl -s -X POST "https://us.posthog.com/api/projects/$PROJECT/query/" \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"query":{"kind":"HogQLQuery","query":"SELECT count() AS pageviews, count(DISTINCT distinct_id) AS unique_visitors, count(DISTINCT $session_id) AS sessions FROM events WHERE event = '\''$pageview'\'' AND properties.$host = '\''comunidade.maestrosdaia.com'\'' AND timestamp > now() - interval 24 hour"}}'
```

Common windows:
- `interval 1 hour` — last hour
- `interval 24 hour` — last 24h
- `interval 7 day` — last week
- `interval 30 day` — last 30d
- No `timestamp` filter — all-time (currently since 2026-04-20 14:10 UTC)
- `AND toDate(timestamp) = today()` — today in project TZ

### 6.2 Pageviews by day

```bash
curl -s -X POST "https://us.posthog.com/api/projects/$PROJECT/query/" \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"query":{"kind":"HogQLQuery","query":"SELECT toDate(timestamp) AS day, count() AS pageviews, count(DISTINCT distinct_id) AS unique_visitors, count(DISTINCT $session_id) AS sessions FROM events WHERE event = '\''$pageview'\'' AND properties.$host = '\''comunidade.maestrosdaia.com'\'' GROUP BY day ORDER BY day ASC"}}'
```

### 6.3 Pageviews by hour (last 24h)

```bash
curl -s -X POST "https://us.posthog.com/api/projects/$PROJECT/query/" \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"query":{"kind":"HogQLQuery","query":"SELECT toStartOfHour(timestamp) AS hour, count() AS pv FROM events WHERE event = '\''$pageview'\'' AND properties.$host = '\''comunidade.maestrosdaia.com'\'' AND timestamp > now() - interval 24 hour GROUP BY hour ORDER BY hour ASC"}}'
```

### 6.4 UTM source / medium / campaign / content breakdown (today)

```bash
curl -s -X POST "https://us.posthog.com/api/projects/$PROJECT/query/" \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"query":{"kind":"HogQLQuery","query":"SELECT coalesce(properties.utm_source, '\''(direct)'\'') AS src, coalesce(properties.utm_medium, '\''—'\'') AS med, coalesce(properties.utm_campaign, '\''—'\'') AS camp, coalesce(properties.utm_content, '\''—'\'') AS cont, count() AS pv, count(DISTINCT distinct_id) AS users FROM events WHERE event = '\''$pageview'\'' AND properties.$host = '\''comunidade.maestrosdaia.com'\'' AND toDate(timestamp) = today() GROUP BY src, med, camp, cont ORDER BY pv DESC"}}'
```

Adjust date filter: `toDate(timestamp) = today() - 1` for yesterday, or `timestamp > now() - interval 7 day` for last week.

### 6.5 Top pages (dedupe by pathname)

```bash
curl -s -X POST "https://us.posthog.com/api/projects/$PROJECT/query/" \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"query":{"kind":"HogQLQuery","query":"SELECT properties.$pathname AS path, count() AS pv, count(DISTINCT distinct_id) AS users FROM events WHERE event = '\''$pageview'\'' AND properties.$host = '\''comunidade.maestrosdaia.com'\'' AND timestamp > now() - interval 7 day GROUP BY path ORDER BY pv DESC LIMIT 10"}}'
```

### 6.6 CTA click leaderboard

```bash
curl -s -X POST "https://us.posthog.com/api/projects/$PROJECT/query/" \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"query":{"kind":"HogQLQuery","query":"SELECT properties.cta AS cta, count() AS clicks, count(DISTINCT distinct_id) AS unique_clickers FROM events WHERE event = '\''$autocapture'\'' AND properties.$host = '\''comunidade.maestrosdaia.com'\'' AND properties.cta IS NOT NULL AND timestamp > now() - interval 7 day GROUP BY cta ORDER BY clicks DESC"}}'
```

### 6.7 Checkout-click conversion rate

```bash
curl -s -X POST "https://us.posthog.com/api/projects/$PROJECT/query/" \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"query":{"kind":"HogQLQuery","query":"SELECT (SELECT count(DISTINCT distinct_id) FROM events WHERE event = '\''$pageview'\'' AND properties.$host = '\''comunidade.maestrosdaia.com'\'' AND timestamp > now() - interval 24 hour) AS visitors, (SELECT count(DISTINCT distinct_id) FROM events WHERE event = '\''$autocapture'\'' AND properties.$host = '\''comunidade.maestrosdaia.com'\'' AND properties.cta IN ('\''pricing_main_checkout'\'', '\''final_cta_checkout'\'') AND timestamp > now() - interval 24 hour) AS checkout_clickers"}}'
```

Rate = `checkout_clickers / visitors`. Compute client-side.

### 6.8 Hero → Checkout funnel (step counts, not rates)

```bash
curl -s -X POST "https://us.posthog.com/api/projects/$PROJECT/query/" \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"query":{"kind":"HogQLQuery","query":"SELECT (SELECT count(DISTINCT distinct_id) FROM events WHERE event = '\''section_viewed'\'' AND properties.section = '\''hero'\'' AND properties.$host = '\''comunidade.maestrosdaia.com'\'' AND timestamp > now() - interval 7 day) AS saw_hero, (SELECT count(DISTINCT distinct_id) FROM events WHERE event = '\''section_viewed'\'' AND properties.section = '\''pricing'\'' AND properties.$host = '\''comunidade.maestrosdaia.com'\'' AND timestamp > now() - interval 7 day) AS saw_pricing, (SELECT count(DISTINCT distinct_id) FROM events WHERE event = '\''$autocapture'\'' AND properties.cta IN ('\''pricing_main_checkout'\'', '\''final_cta_checkout'\'') AND properties.$host = '\''comunidade.maestrosdaia.com'\'' AND timestamp > now() - interval 7 day) AS clicked_checkout"}}'
```

For proper ordered-funnel conversion (same user across steps in sequence), use PostHog's `FunnelsQuery` node instead (see 6.13).

### 6.9 Section engagement — what visitors actually see

```bash
curl -s -X POST "https://us.posthog.com/api/projects/$PROJECT/query/" \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"query":{"kind":"HogQLQuery","query":"SELECT properties.section AS section, count() AS views, count(DISTINCT distinct_id) AS unique_viewers FROM events WHERE event = '\''section_viewed'\'' AND properties.$host = '\''comunidade.maestrosdaia.com'\'' AND timestamp > now() - interval 7 day GROUP BY section ORDER BY views DESC"}}'
```

### 6.10 Section dwell (attention per section)

```bash
curl -s -X POST "https://us.posthog.com/api/projects/$PROJECT/query/" \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"query":{"kind":"HogQLQuery","query":"SELECT properties.section AS section, avg(toFloat(properties.dwell_ms)) AS avg_ms, quantile(0.5)(toFloat(properties.dwell_ms)) AS median_ms FROM events WHERE event = '\''section_dwell'\'' AND properties.$host = '\''comunidade.maestrosdaia.com'\'' AND timestamp > now() - interval 7 day GROUP BY section ORDER BY avg_ms DESC"}}'
```

### 6.11 Device / browser / country breakdown

```bash
curl -s -X POST "https://us.posthog.com/api/projects/$PROJECT/query/" \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"query":{"kind":"HogQLQuery","query":"SELECT properties.$device_type AS device, count() AS pv, count(DISTINCT distinct_id) AS users FROM events WHERE event = '\''$pageview'\'' AND properties.$host = '\''comunidade.maestrosdaia.com'\'' AND timestamp > now() - interval 7 day GROUP BY device ORDER BY pv DESC"}}'
```

Swap the grouping property:
- `properties.$browser` — browser
- `properties.$os` — OS
- `properties.$geoip_country_name` — country
- `properties.$geoip_city_name` — city

### 6.12 Referrer breakdown (where direct traffic comes from)

```bash
curl -s -X POST "https://us.posthog.com/api/projects/$PROJECT/query/" \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"query":{"kind":"HogQLQuery","query":"SELECT coalesce(properties.$referring_domain, '\''(direct)'\'') AS ref, count() AS pv, count(DISTINCT distinct_id) AS users FROM events WHERE event = '\''$pageview'\'' AND properties.$host = '\''comunidade.maestrosdaia.com'\'' AND properties.utm_source IS NULL AND timestamp > now() - interval 24 hour GROUP BY ref ORDER BY pv DESC"}}'
```

### 6.13 Proper ordered funnel (PostHog FunnelsQuery — not HogQL)

```bash
curl -s -X POST "https://us.posthog.com/api/projects/$PROJECT/query/" \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{
    "query": {
      "kind": "InsightVizNode",
      "source": {
        "kind": "FunnelsQuery",
        "series": [
          {"kind":"EventsNode","event":"section_viewed","name":"Hero","properties":[{"key":"section","value":"hero","operator":"exact","type":"event"},{"key":"$host","value":"comunidade.maestrosdaia.com","operator":"exact","type":"event"}]},
          {"kind":"EventsNode","event":"$autocapture","name":"Checkout","properties":[{"key":"cta","value":["pricing_main_checkout","final_cta_checkout"],"operator":"exact","type":"event"},{"key":"$host","value":"comunidade.maestrosdaia.com","operator":"exact","type":"event"}]}
        ],
        "funnelsFilter": {"funnelVizType":"steps","funnelOrderType":"ordered"},
        "dateRange": {"date_from":"-7d"}
      }
    }
  }'
```

Returns step-by-step conversion numbers with `count` and `average_conversion_time`.

### 6.14 Bounce proxy (visitors with only one pageview per session)

```bash
curl -s -X POST "https://us.posthog.com/api/projects/$PROJECT/query/" \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"query":{"kind":"HogQLQuery","query":"SELECT total, bounces, round(bounces * 100.0 / total, 1) AS bounce_pct FROM (SELECT count(DISTINCT $session_id) AS total, countIf(pv_count = 1) AS bounces FROM (SELECT $session_id, count() AS pv_count FROM events WHERE event = '\''$pageview'\'' AND properties.$host = '\''comunidade.maestrosdaia.com'\'' AND timestamp > now() - interval 7 day GROUP BY $session_id))"}}'
```

### 6.15 Raw event stream (debug / manual spot-check)

```bash
curl -s -X POST "https://us.posthog.com/api/projects/$PROJECT/query/" \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"query":{"kind":"HogQLQuery","query":"SELECT timestamp, event, properties.$current_url, properties.cta, properties.section, distinct_id FROM events WHERE properties.$host = '\''comunidade.maestrosdaia.com'\'' ORDER BY timestamp DESC LIMIT 50"}}'
```

---

## 7. Parsing results in shell

PostHog returns `{"results": [[...], ...], "columns": [...], "types": [...]}`. Clean one-liner to table-ify:

```bash
... | python3 -c "
import sys, json
d = json.load(sys.stdin)
cols = d['columns']
print(' | '.join(cols))
print('-' * 60)
for r in d['results']:
    print(' | '.join(str(v) for v in r))
"
```

---

## 8. Cross-check against the live dashboard

Two independent sources should agree. If a number looks off, compare:

1. Dashboard API endpoint: `https://dash.maestrosdaia.com/api/metrics?range=<days>` → returns `totalVisits`, `totalCtaClicks`, `sections` (top pages by `$pathname`), `ctas` (leaderboard).
2. HogQL direct (recipes above).

If they disagree: the dashboard is cached server-side for 60s — wait a minute and re-fetch. If still off, check the `WHERE` clause in `dashboard-comunidade/app/api/metrics/route.ts` vs your query.

---

## 9. Known gotchas

### 9.1 Host scoping is mandatory
The project also ingests events from `comunidadeaberta.maestrosdaia.com` (free-community LP). Every query MUST include `properties.$host = 'comunidade.maestrosdaia.com'` or results will mix both sites.

### 9.2 UTM/fbclid duplication in URLs
`properties.$current_url` includes query string. Same path visited via IG, direct, and Facebook ad appears as 3 separate rows. Always group by `properties.$pathname` for page-level aggregation.

### 9.3 Tracking start date
Earliest event: **2026-04-20 14:10 UTC**. Any "all-time" number is actually "since this date." When computing conversion rate vs buyer counts, make sure the buyer count is from the same window (OnProfit may have pre-tracking history that would otherwise distort the ratio).

### 9.4 Timezone
`today()`, `toDate()`, and `toStartOfHour()` return project timezone (UTC by default). Brazil (UTC-3) users see "today" in their local feel but the data cutoff is UTC midnight. Shift explicitly if needed: `toStartOfDay(timestamp - interval 3 hour)`.

### 9.5 `$session_id` can be null on very-old events
Safe to `count(DISTINCT $session_id)` — nulls collapse into one bucket. For precise session counts, filter `AND $session_id IS NOT NULL`.

### 9.6 Custom events need `section_viewed` / `section_dwell` to fire
These rely on the `useTrackSection` hook in the LP. If the LP redeploys without them (or with a build that dead-code-eliminates them), section queries return empty. Sanity check with recipe 6.9; if empty for a period but pageviews are healthy, hook regressed.

### 9.7 `cta` property is opt-in
Only buttons/links with `data-ph-capture-attribute-cta="..."` set the `cta` property. For other clicks, use `properties.$el_text` or autocapture element-level filters.

### 9.8 Rate limits
PostHog free tier: 5 req/sec sustained. For batch analysis, space requests with `sleep 0.2` or cache results locally.

---

## 10. Supabase — Free Community Signups

### 10.1 Source

**Supabase project:** `arsfqjhvgphsglouwdsn` · Table: `community_signups` · Schema: `public`

This table records every signup to the free community (comunidade aberta). Each row has: `id` (uuid), `name`, `email`, `whatsapp`, `signup_date`, `status`, `verified_date`, `source`, `created_at`, `password`.

The `created_at` column (timestamptz, auto-set by Supabase) is used for day-by-day aggregation.

### 10.2 Credentials

Supabase service role key lives in:
`/Users/arthurendo/Desktop/AI COMPANY/_chiefs/cmo/head-of-automations/n8n-automation-engineer/.claude/keys.md` → section `## Supabase (Maestros da IA)`

Env vars on Netlify (server-only, never `NEXT_PUBLIC_`):
- `SUPABASE_URL` = `https://arsfqjhvgphsglouwdsn.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` = (JWT, starts with `eyJ...`)

### 10.3 Dashboard API endpoint

```
GET /api/signups?range=30
```

Returns:
```json
{
  "totalSignups": 71,
  "todaySignups": 12,
  "yesterdaySignups": 8,
  "series": [{"day":"2026-04-20","count":5}, ...],
  "range": 30,
  "fetchedAt": "2026-04-23T18:00:00.000Z"
}
```

### 10.4 Sample curl to query signups by day (direct Supabase)

```bash
KEY="<service_role_key>"
curl -s "https://arsfqjhvgphsglouwdsn.supabase.co/rest/v1/community_signups?select=created_at&order=created_at.asc" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
  | python3 -c "
import sys, json, collections
rows = json.load(sys.stdin)
by_day = collections.Counter(r['created_at'][:10] for r in rows)
for day, count in sorted(by_day.items()):
    print(f'{day}: {count}')
print(f'Total: {len(rows)}')
"
```

### 10.5 Differences from PostHog

| Aspect | PostHog (pageviews) | Supabase (signups) |
|---|---|---|
| What it measures | Anonymous page visits | Named form submissions |
| Timestamp timezone | UTC (project default) | UTC (Supabase default) |
| Deduplication | `distinct_id` (cookie-based) | `id` (uuid, one per signup) |
| Start date | 2026-04-20 14:10 UTC | Depends on when the form went live |
| Scoping filter | `properties.$host` | Not needed (table is single-purpose) |

### 10.6 Cross-check

To verify dashboard numbers match Supabase directly:
```bash
# Dashboard endpoint
curl -s 'https://dash.maestrosdaia.com/api/signups?range=30' | python3 -c 'import sys,json; d=json.load(sys.stdin); print("API total:", d["totalSignups"])'

# Direct Supabase count
curl -sI "https://arsfqjhvgphsglouwdsn.supabase.co/rest/v1/community_signups?select=id&limit=1" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Prefer: count=exact" \
  | grep -i content-range
```

Both should agree (API total is range-bounded, direct count is all-time — use matching filters).

---

## 10b. Supabase — Comunidade Purchases (Paid Community)

### 10b.1 Source

**Supabase project:** `arsfqjhvgphsglouwdsn` · Table: `comunidade_purchases` · Schema: `public`

This table records every purchase of the paid community (Comunidade Maestros da IA). Data is backfilled from OnProfit dashboard scrapes.

Key columns:
- `id` (uuid) — primary key
- `purchase_date` (timestamptz) — **the actual purchase date** (use for day-by-day grouping)
- `created_at` (timestamptz) — row insertion time (NOT useful for grouping — backfill rows share the same timestamp)
- `payment_status` (text) — filter by `approved` for completed purchases
- `product_name` (text) — e.g. "Comunidade Maestros da IA | Assinatura Mensal"
- `offer_name` (text) — e.g. "Assinatura Mensal"
- `price_reais` (numeric) — price in BRL
- `buyer_name`, `buyer_email`, `buyer_phone` — buyer PII
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term` — UTM fields (currently null for backfill data)
- `source` (text) — e.g. "onprofit_backfill"

### 10b.2 Credentials

Same Supabase service role key as section 10.2 (shared project `arsfqjhvgphsglouwdsn`).

### 10b.3 Dashboard API endpoint — Conversion Rate

```
GET /api/conversion?range=30
```

Returns:
```json
{
  "range": 30,
  "series": [
    {"day":"2026-04-20","visitors":33,"purchases":3,"conversion_pct":9.09},
    {"day":"2026-04-21","visitors":78,"purchases":2,"conversion_pct":2.56}
  ],
  "totals": {"visitors": 319, "purchases": 7, "conversion_pct": 2.19},
  "fetchedAt": "2026-04-23T21:16:06.742Z"
}
```

**How conversion rate is computed:**
1. PostHog HogQL: `count(DISTINCT distinct_id)` per day for `$pageview` events scoped to `comunidade.maestrosdaia.com` → daily unique visitors.
2. Supabase: `comunidade_purchases` rows with `payment_status = 'approved'`, grouped by `purchase_date` day → daily purchase count.
3. Join on day. `conversion_pct = (purchases / visitors) * 100`, rounded to 2 decimals.
4. `totals.visitors` is the sum of daily unique visitors (may exceed 30d deduplicated unique count due to cross-day overlap — this is expected).

### 10b.4 Sample curl to query purchases by day (direct Supabase)

```bash
KEY="<service_role_key>"
curl -s "https://arsfqjhvgphsglouwdsn.supabase.co/rest/v1/comunidade_purchases?select=purchase_date,payment_status&payment_status=eq.approved&order=purchase_date.asc" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
  | python3 -c "
import sys, json, collections
rows = json.load(sys.stdin)
by_day = collections.Counter(r['purchase_date'][:10] for r in rows)
for day, count in sorted(by_day.items()):
    print(f'{day}: {count}')
print(f'Total: {len(rows)}')
"
```

### 10b.5 Cross-check

```bash
# Dashboard endpoint
curl -s 'https://dash.maestrosdaia.com/api/conversion?range=30' | python3 -c 'import sys,json; d=json.load(sys.stdin); print("API:", d["totals"])'

# Direct Supabase count
curl -sI "https://arsfqjhvgphsglouwdsn.supabase.co/rest/v1/comunidade_purchases?select=id&payment_status=eq.approved&limit=1" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Prefer: count=exact" \
  | grep -i content-range
```

---

## 11. Related assets

| Asset | Location |
|---|---|
| LP repo | `lyraarteltda/lp-comunidade-maestros` (GitHub) |
| LP live | https://comunidade.maestrosdaia.com |
| Dashboard repo | `lyraarteltda/dashboard-comunidade` |
| Dashboard live | https://dash.maestrosdaia.com |
| Dashboard ops guide | `pipeline/dashboard-comunidade/DASHBOARD.md` |
| PostHog project dashboard | https://us.posthog.com/project/389613/dashboard/1488483 |
| PostHog Live Events (debug) | https://us.posthog.com/project/389613/activity/explore |
| PostHog HogQL docs | https://posthog.com/docs/hogql |
| PostHog Query API docs | https://posthog.com/docs/api/queries |

---

## 11. Quick-start for a Claude Code session

If you're a worker and the user asks anything about `comunidade.maestrosdaia.com` traffic, conversion, funnels, or UTM:

1. Read `.claude/keys.md` for the Personal API Key (look for `phx_...`). If the file doesn't exist in your scope, tell the user and stop — never prompt for the key in chat.
2. Set `KEY` and `PROJECT=389613`.
3. Match the user's question to a recipe from section 6 (visits / UTM / CTA / funnel / section / device / referrer / raw).
4. Adjust the time window in the HogQL `interval` clause.
5. Run curl + parse JSON per section 7.
6. **Always** include `properties.$host = 'comunidade.maestrosdaia.com'` unless explicitly told otherwise.
7. Present a table — and if it's a rate/funnel, also compute percentages client-side.
8. Cite the window and the tracking start date (2026-04-20 14:10 UTC) if the question implies "all-time."

If a query needs something not in section 6, construct the HogQL from scratch using section 5's property reference. If unsure, run recipe 6.15 to see raw events and discover property names.
