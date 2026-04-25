import { NextResponse } from "next/server";
import { parseDateRangeForSupabase } from "@/lib/date-params";

export const dynamic = "force-dynamic";

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
    filters += `&task_category=in.(${cats.join(",")})`;
  }
  if (employee) {
    filters += `&responsible_employee=eq.${encodeURIComponent(employee)}`;
  }
  if (tool) {
    filters += `&primary_tool=eq.${encodeURIComponent(tool)}`;
  }
  if (search) {
    filters += `&or=(task_summary.ilike.*${encodeURIComponent(search)}*,trigger_prompt.ilike.*${encodeURIComponent(search)}*)`;
  }

  try {
    const [dataRes, countRes] = await Promise.all([
      fetch(
        `${SUPABASE_URL}/rest/v1/session_logs?select=id,created_at,task_summary,task_category,primary_tool,responsible_employee,agents_used,files_created,duration_seconds,status,trigger_prompt&${filters}&order=created_at.desc&limit=${perPage}&offset=${offset}`,
        {
          headers: {
            apikey: KEY,
            Authorization: `Bearer ${KEY}`,
          },
        }
      ),
      fetch(
        `${SUPABASE_URL}/rest/v1/session_logs?select=id&${filters}`,
        {
          headers: {
            apikey: KEY,
            Authorization: `Bearer ${KEY}`,
            Prefer: "count=exact",
            Range: "0-0",
          },
        }
      ),
    ]);

    if (!dataRes.ok) {
      const body = await dataRes.text();
      console.error("Supabase error:", dataRes.status, body);
      return NextResponse.json({ error: "upstream" }, { status: 502 });
    }

    const rows = await dataRes.json();
    const contentRange = countRes.headers.get("content-range");
    const totalCount = contentRange
      ? parseInt(contentRange.split("/")[1] || "0", 10)
      : rows.length;

    const statsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/session_logs?select=task_category,responsible_employee,duration_seconds&${filters}&limit=10000`,
      {
        headers: {
          apikey: KEY,
          Authorization: `Bearer ${KEY}`,
        },
      }
    );

    let stats = {
      totalSessions: totalCount,
      categoryBreakdown: {} as Record<string, number>,
      mostActiveEmployee: "",
      totalHours: 0,
    };

    if (statsRes.ok) {
      const statsRows: {
        task_category: string;
        responsible_employee: string;
        duration_seconds: number | null;
      }[] = await statsRes.json();

      const catCounts: Record<string, number> = {};
      const empCounts: Record<string, number> = {};
      let totalSec = 0;

      for (const r of statsRows) {
        const cat = r.task_category || "other";
        catCounts[cat] = (catCounts[cat] ?? 0) + 1;
        const emp = r.responsible_employee || "Desconhecido";
        empCounts[emp] = (empCounts[emp] ?? 0) + 1;
        totalSec += r.duration_seconds ?? 0;
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
        totalHours: Math.round((totalSec / 3600) * 10) / 10,
      };
    }

    const filtersRes = await fetch(
      `${SUPABASE_URL}/rest/v1/session_logs?select=responsible_employee,primary_tool&${`created_at=gte.${since}&created_at=lt.${until}`}&limit=10000`,
      {
        headers: {
          apikey: KEY,
          Authorization: `Bearer ${KEY}`,
        },
      }
    );

    let availableEmployees: string[] = [];
    let availableTools: string[] = [];

    if (filtersRes.ok) {
      const filterRows: {
        responsible_employee: string;
        primary_tool: string;
      }[] = await filtersRes.json();
      availableEmployees = [
        ...new Set(
          filterRows
            .map((r) => r.responsible_employee)
            .filter(Boolean)
            .sort()
        ),
      ];
      availableTools = [
        ...new Set(
          filterRows
            .map((r) => r.primary_tool)
            .filter(Boolean)
            .sort()
        ),
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
