# Dashboard Comunidade — Access & Modification Guide

**Purpose:** this is a procedural guide — *how* to reach the dashboard, *how* to change it, *where* credentials and configs live. It is NOT a state snapshot (URLs/IDs are stable, but queries, UI, data sources will evolve).

---

## 1. Access

| URL | When to use |
|---|---|
| **https://dash.maestrosdaia.com** | Primary. Use everywhere. Fresh subdomain with no DNS cache history. |
| https://dashboardcomunidade.maestrosdaia.com | Legacy alias. May have stale NXDOMAIN in some resolvers for up to 1h after negative-cache expiry. |
| https://dashboard-comunidade-maestros.netlify.app | Netlify default. Always works. Share internally if custom domain fails. |

**Auth**: none. Public.

---

## 2. Where the code lives

| Thing | Location |
|---|---|
| GitHub repo | `lyraarteltda/dashboard-comunidade` |
| Local clone | `head-of-landing-pages/github-frontend-editor/pipeline/dashboard-comunidade/` |
| Netlify site name | `dashboard-comunidade-maestros` |
| Netlify site ID | stored in `.claude/keys.md` → `## Dashboard Comunidade` |
| Netlify DNS zone ID | stored in `.claude/keys.md` → same section (zone is shared with all *.maestrosdaia.com) |

---

## 3. Tech stack (fixed decisions — change only with a migration plan)

- **Next.js 16** — App Router, **SSR runtime** (NOT static export — we need server-side API routes for PostHog key).
- **Tailwind v4** + shadcn/ui.
- **Tremor** — installed; use when you want out-of-the-box chart types (BarChart, DonutChart, AreaChart). Falls back to shadcn + recharts if more control needed.
- **PostHog HogQL** — server-side only (`/api/metrics/route.ts`). Personal API key never touches the client bundle.

Deploy pattern: `git push origin main` → Netlify rebuilds → live in ~20-30s.

---

## 4. Credentials & secrets

**Do not hard-code. Never commit to git.** All secrets live in two places:

### 4.1 Local: `github-frontend-editor/.claude/keys.md`
Sections relevant to the dashboard:
- `## Netlify` — auth token for the Netlify API/CLI.
- `## GitHub` — `gh` CLI is authenticated as `lyraarteltda` via macOS keychain.
- `## PostHog Cloud` — Project API Key (`phc_...`, client-safe), Personal API Key (`phx_...`, server-only), Project ID, Host.
- `## Dashboard Comunidade` — site ID, netlify default URL, repo URL, (legacy) admin password — now unused.

### 4.2 Netlify environment variables (Site settings → Env vars)
Set via `netlify env:set <KEY> <VAL> --site dashboard-comunidade-maestros --context production` or the UI.

| Env var | Scope | Purpose |
|---|---|---|
| `POSTHOG_PERSONAL_API_KEY` | server-only | HogQL queries. NEVER prefix with `NEXT_PUBLIC_`. |
| `POSTHOG_PROJECT_ID` | server-only | Project scope for the API URL. |

**To rotate the PostHog key**: generate a new Personal API Key at https://us.posthog.com/settings/user-api-keys → `netlify env:set POSTHOG_PERSONAL_API_KEY phx_NEW --site dashboard-comunidade-maestros` → trigger redeploy.

---

## 5. How to modify the dashboard

### 5.1 Add a new metric card
1. Open `app/api/metrics/route.ts` → add a HogQL query (see existing ones for the pattern) → return the result in the JSON response.
2. Open `app/page.tsx` → add a `<Card>` in the metrics grid consuming the new field.
3. Commit + push.

### 5.2 Add a new chart
- **Simple (Tremor)**: `import { BarChart, DonutChart } from "@tremor/react"`. One-line chart.
- **Custom (shadcn + recharts)**: use `recharts` primitives + shadcn chart wrapper. More flexible.

### 5.3 Change an existing query
1. Edit the HogQL string in `app/api/metrics/route.ts`.
2. Sanity-test: `curl -X POST 'https://us.posthog.com/api/projects/$ID/query/' -H "Authorization: Bearer $KEY" -d '{"query":{"kind":"HogQLQuery","query":"<your-sql>"}}'`.
3. Push. Verify on the live dashboard.

### 5.4 Plug in a new data source (leads / buyers / members / ads)

Placeholder cards in `app/page.tsx` show "Conector em desenvolvimento". To make them live:

| Source | API | Where credentials live |
|---|---|---|
| **Leads** (RD Station) | `api.rd.services` (OAuth2) | `head-of-paid-media/tracking-engineer/.claude/keys.md` |
| **Buyers** (OnProfit) | OnProfit API or Supabase table fed by webhook → n8n. Simpler: read Supabase. | OnProfit login in `tracking-engineer/.claude/keys.md`; Supabase key in `head-of-automations/n8n-automation-engineer/.claude/keys.md` |
| **Community members** (ManyChat) | `api.manychat.com` | `head-of-automations/manychat-expert/.claude/keys.md` |
| **WhatsApp messages** | Supabase table `Arthur_Whatsapp_Log` | `head-of-automations/n8n-automation-engineer/.claude/resources/whatsapp-log.md` |
| **Ad spend / ROAS** | Meta Graph API | `head-of-paid-media/facebook-ads-manager/.claude/keys.md` |

Pattern for each:
1. Create `app/api/<source>/route.ts` — fetch from source API with server-side key.
2. Replace the placeholder card in `app/page.tsx` with a real component that calls your new route.
3. Add the source's env vars to Netlify.

Architecture note: for anything hit multiple times per page, cache the response with a `revalidate` value, OR preferably pipe source data into Supabase nightly via n8n and query Supabase from the dashboard (fast + joinable with other sources).

### 5.5 Re-enable auth (if ever needed)
All removed files are in git history of commits between `18fa77e` (initial scaffold with auth) and `0f68f9c` (auth removed). To restore:
1. `git show 18fa77e:middleware.ts > middleware.ts`
2. Restore `app/login/`, `app/api/auth/`, `lib/session.ts`.
3. `pnpm add iron-session`.
4. Re-set Netlify env vars `DASHBOARD_PASSWORD` and `DASHBOARD_SESSION_SECRET` if removed.

### 5.6 Change the subdomain

```bash
TOKEN=$(grep -oE 'nfp_[A-Za-z0-9]+' .claude/keys.md | head -1)
SITE=$(grep 'Netlify Site ID' .claude/keys.md | grep -oE '[0-9a-f\-]{36}')
ZONE=$(grep 'DNS zone' .claude/keys.md | head -1 | grep -oE '[0-9a-f]{24}')

# 1. Add DNS record (type NETLIFY — same pattern as all other *.maestrosdaia.com)
curl -s -X POST "https://api.netlify.com/api/v1/dns_zones/$ZONE/dns_records" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"NETLIFY","hostname":"NEW-SUBDOMAIN.maestrosdaia.com","value":"dashboard-comunidade-maestros.netlify.app"}'

# 2. Attach as alias on the Netlify site
curl -s -X PATCH "https://api.netlify.com/api/v1/sites/$SITE" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"domain_aliases":["NEW-SUBDOMAIN.maestrosdaia.com"]}'
```

SSL provisions automatically in ~30s.

### 5.7 Local development
```bash
cd pipeline/dashboard-comunidade
cp .env.example .env.local    # fill in POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID from keys.md
pnpm install
pnpm dev                       # http://localhost:3000
```

---

## 6. Deploy workflow

```bash
# From pipeline/dashboard-comunidade/
git checkout -b feat/<short-name>
# edit files
pnpm dev                       # verify locally
git commit -m "feat(dashboard): <what>"
git push origin feat/<short-name>

# Either open a PR or merge to main directly:
git checkout main && git merge feat/<short-name> && git push origin main
```

Netlify builds automatically on `main`. Watch the deploy:
```bash
TOKEN=$(grep -oE 'nfp_[A-Za-z0-9]+' .claude/keys.md | head -1)
curl -s "https://api.netlify.com/api/v1/sites/$SITE/deploys?per_page=1" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -40
```

---

## 7. Verification after every change

1. `curl -sI https://dash.maestrosdaia.com` → expect HTTP/2 200.
2. `curl -s https://dash.maestrosdaia.com/api/metrics?range=7` → expect JSON with real numbers (not zeros, not `null`).
3. Open `https://dash.maestrosdaia.com` in a browser → check 0 console errors, 0 failed network requests.
4. Cross-check dashboard numbers against direct HogQL API (copy query from `/api/metrics/route.ts` and run via curl to `https://us.posthog.com/api/projects/$ID/query/`). They should match exactly.

---

## 8. Common issues

### "The domain shows empty"
- Test globally: `dig @8.8.8.8 dash.maestrosdaia.com +short`. If returns an IP → DNS is fine globally.
- Local-only failure → Mac resolver cached NXDOMAIN. Fix:
  ```
  sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder
  ```
  Close and reopen the browser (Chrome/Safari have their own DNS cache).
- Global failure → DNS record missing. See §5.6 to re-add.

### "Netlify build fails"
- Check build logs in the Netlify UI.
- Most common causes: env var missing, TypeScript error from a new query, dependency conflict after `pnpm add`.

### "PostHog queries return empty arrays"
- Check the PostHog key in Netlify env hasn't expired.
- Check the LP (`comunidade.maestrosdaia.com`) is actually sending events — open PostHog Live Events.
- Run the query directly via curl against PostHog to isolate the dashboard vs the data.

### "Numbers on the dashboard differ from PostHog UI"
- Check the date range filter. Dashboard defaults to 7d.
- Check the HogQL query isn't including events from the dashboard's own usage (filter `properties.host != 'dash.maestrosdaia.com'` if needed).
- Check for UTM-query-param duplication: group by `properties.$pathname` not `properties.$current_url`.

---

## 9. Structure reference (where to edit what)

```
pipeline/dashboard-comunidade/
├── app/
│   ├── api/
│   │   └── metrics/route.ts       ← HogQL queries, server-only
│   ├── page.tsx                   ← main dashboard UI
│   ├── layout.tsx                 ← fonts, body wrapper
│   └── globals.css                ← OKLCH tokens, Tailwind v4 @theme
├── components/
│   └── ui/                        ← shadcn primitives
├── lib/
│   └── posthog-query.ts           ← thin HogQL wrapper
├── next.config.ts                 ← Next config (SSR — NOT `output: "export"`)
├── tailwind.config.ts
├── package.json
└── DASHBOARD.md                   ← this file
```

---

## 10. References

- PostHog HogQL: https://posthog.com/docs/hogql
- PostHog Query API: https://posthog.com/docs/api/queries
- Netlify DNS API: https://docs.netlify.com/api/get-started/#dns
- Netlify Next.js runtime: https://docs.netlify.com/frameworks/next-js/overview/
- Tremor: https://tremor.so/docs/getting-started/installation
- shadcn: https://ui.shadcn.com

---

## 11. Where to find this document

- **In repo**: `lyraarteltda/dashboard-comunidade/DASHBOARD.md` (canonical, committed).
- **Referenced from**:
  - `head-of-landing-pages/.claude/CLAUDE.md` (head's routing notes for dashboard tasks).
  - `github-frontend-editor/.claude/CLAUDE.md` (worker's references).
- **Update this file when**: deploy process changes, new data source is added, subdomain changes, auth is re-enabled, or any procedure above drifts. Avoid committing credentials or temporary state here — those belong in `.claude/keys.md` which is never pushed.
