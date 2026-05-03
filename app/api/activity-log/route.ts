import { NextResponse } from "next/server";
import { parseDateRangeForSupabase } from "@/lib/date-params";

export const dynamic = "force-dynamic";

// Reads from `funnel_changes` (strict conversion-impact log).
// Fields are mapped to the legacy SessionRow shape so the existing UI works:
//   summary              -> task_summary
//   surface              -> task_category
//   agent_chief          -> primary_tool
//   responsible_employee -> responsible_employee
//   (status is always "completed"; agents_used/files_created/duration_seconds/trigger_prompt are unused)

interface FunnelChangeRow {
  id: string;
  created_at: string;
  surface: string;
  summary: string;
  live_url: string | null;
  flow_or_space_id: string | null;
  responsible_employee: string | null;
  agent_chief: string | null;
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
  const { since, until } = parseDateRangeForSupabase(searchParams);

  const category = searchParams.get("category");
  const employee = searchParams.get("employee");
  const tool = searchParams.get("tool");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const perPage = Math.min(parseInt(searchParams.get("perPage") || "200", 10), 10000);
  const offset = (page - 1) * perPage;

  let filters = `created_at=gte.${since}&created_at=lt.${until}`;

  if (category) {
    const cats = category.split(",").map((c) => c.trim());
    filters += `&surface=in.(${cats.join(",")})`;
  }
  if (employee) {
    filters += `&responsible_employee=eq.${encodeURIComponent(employee)}`;
  }
  if (tool) {
    filters += `&agent_chief=eq.${encodeURIComponent(tool)}`;
  }
  if (search) {
    filters += `&summary=ilike.*${encodeURIComponent(search)}*`;
  }

  try {
    const [dataRes, countRes] = await Promise.all([
      fetch(
        `${SUPABASE_URL}/rest/v1/funnel_changes?select=id,created_at,surface,summary,live_url,flow_or_space_id,responsible_employee,agent_chief&${filters}&order=created_at.desc&limit=${perPage}&offset=${offset}`,
        {
          headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
        }
      ),
      fetch(`${SUPABASE_URL}/rest/v1/funnel_changes?select=id&${filters}`, {
        headers: {
          apikey: KEY,
          Authorization: `Bearer ${KEY}`,
          Prefer: "count=exact",
          Range: "0-0",
        },
      }),
    ]);

    if (!dataRes.ok) {
      const body = await dataRes.text();
      console.error("Supabase error:", dataRes.status, body);
      return NextResponse.json({ error: "upstream" }, { status: 502 });
    }

    const raw: FunnelChangeRow[] = await dataRes.json();
    const rows = raw.map((r) => ({
      id: r.id,
      created_at: r.created_at,
      task_summary: r.live_url
        ? `${r.summary} — ${r.live_url}`
        : r.summary,
      task_category: r.surface,
      primary_tool: r.agent_chief ?? "",
      responsible_employee: r.responsible_employee ?? "",
      agents_used: [] as string[],
      files_created: [] as string[],
      duration_seconds: 0,
      status: "completed",
      trigger_prompt: "",
    }));

    const contentRange = countRes.headers.get("content-range");
    const totalCount = contentRange
      ? parseInt(contentRange.split("/")[1] || "0", 10)
      : rows.length;

    const statsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/funnel_changes?select=surface,responsible_employee&${filters}&limit=10000`,
      {
        headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
      }
    );

    let stats = {
      totalSessions: totalCount,
      categoryBreakdown: {} as Record<string, number>,
      mostActiveEmployee: "",
      totalHours: 0,
    };

    if (statsRes.ok) {
      const statsRows: { surface: string; responsible_employee: string }[] =
        await statsRes.json();
      const catCounts: Record<string, number> = {};
      const empCounts: Record<string, number> = {};
      for (const r of statsRows) {
        const cat = r.surface || "other";
        catCounts[cat] = (catCounts[cat] ?? 0) + 1;
        const emp = r.responsible_employee || "Desconhecido";
        empCounts[emp] = (empCounts[emp] ?? 0) + 1;
      }
      let maxEmp = "";
      let maxCount = 0;
      for (const [emp, count] of Object.entries(empCounts)) {
        if (count > maxCount) {
          maxCount = count;
          maxEmp = emp;
        }
      }
      stats = {
        totalSessions: totalCount,
        categoryBreakdown: catCounts,
        mostActiveEmployee: maxEmp,
        totalHours: 0,
      };
    }

    const filtersRes = await fetch(
      `${SUPABASE_URL}/rest/v1/funnel_changes?select=responsible_employee,agent_chief&created_at=gte.${since}&created_at=lt.${until}&limit=10000`,
      {
        headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
      }
    );

    let availableEmployees: string[] = [];
    let availableTools: string[] = [];
    if (filtersRes.ok) {
      const filterRows: {
        responsible_employee: string;
        agent_chief: string;
      }[] = await filtersRes.json();
      availableEmployees = [
        ...new Set(
          filterRows.map((r) => r.responsible_employee).filter(Boolean).sort()
        ),
      ];
      availableTools = [
        ...new Set(filterRows.map((r) => r.agent_chief).filter(Boolean).sort()),
      ];
    }

    return NextResponse.json({
      rows,
      totalCount,
      page,
      perPage,
      stats,
      availableEmployees,
      availableTools,
      from: since,
      to: until,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Activity log fetch error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch activity log",
      },
      { status: 500 }
    );
  }
}
