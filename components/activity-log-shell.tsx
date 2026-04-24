"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Search,
  Clock,
  Users,
  Zap,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { DonutChart } from "@tremor/react";
import { DateRangePicker } from "./date-range-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { NavHeader } from "./nav-header";

const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  ads:           { bg: "bg-blue-500/15",    text: "text-blue-400",    dot: "bg-blue-400" },
  video:         { bg: "bg-purple-500/15",  text: "text-purple-400",  dot: "bg-purple-400" },
  audio:         { bg: "bg-orange-500/15",  text: "text-orange-400",  dot: "bg-orange-400" },
  dev:           { bg: "bg-emerald-500/15", text: "text-emerald-400", dot: "bg-emerald-400" },
  automation:    { bg: "bg-cyan-500/15",    text: "text-cyan-400",    dot: "bg-cyan-400" },
  communication: { bg: "bg-pink-500/15",    text: "text-pink-400",    dot: "bg-pink-400" },
  research:      { bg: "bg-yellow-500/15",  text: "text-yellow-400",  dot: "bg-yellow-400" },
  design:        { bg: "bg-indigo-500/15",  text: "text-indigo-400",  dot: "bg-indigo-400" },
  other:         { bg: "bg-zinc-500/15",    text: "text-zinc-400",    dot: "bg-zinc-400" },
};

const CATEGORY_LABELS: Record<string, string> = {
  ads: "Ads",
  video: "Vídeo",
  audio: "Áudio",
  dev: "Dev",
  automation: "Automação",
  communication: "Comunicação",
  research: "Pesquisa",
  design: "Design",
  other: "Outro",
};

const TREMOR_CATEGORY_COLORS: Record<string, string> = {
  ads: "blue",
  video: "violet",
  audio: "orange",
  dev: "emerald",
  automation: "cyan",
  communication: "pink",
  research: "yellow",
  design: "indigo",
  other: "zinc",
};

interface SessionRow {
  id: string;
  created_at: string;
  task_summary: string;
  task_category: string;
  primary_tool: string;
  responsible_employee: string;
  agents_used: string[] | null;
  files_created: string[] | null;
  duration_seconds: number | null;
  status: string;
  trigger_prompt: string | null;
}

interface Stats {
  totalSessions: number;
  categoryBreakdown: Record<string, number>;
  mostActiveEmployee: string;
  totalHours: number;
}

interface ActivityData {
  rows: SessionRow[];
  totalCount: number;
  page: number;
  perPage: number;
  stats: Stats;
  availableEmployees: string[];
  availableTools: string[];
  fetchedAt: string;
}

function toParam(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function CategoryBadge({ category }: { category: string }) {
  const cat = category?.toLowerCase() || "other";
  const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS.other;
  const label = CATEGORY_LABELS[cat] || cat;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium ${colors.bg} ${colors.text}`}
    >
      <span className={`size-1.5 rounded-full ${colors.dot}`} />
      {label}
    </span>
  );
}

function ToolBadge({ tool }: { tool: string }) {
  if (!tool) return null;
  return (
    <span className="inline-flex items-center rounded-md bg-surface-3 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
      {tool}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "completed"
      ? "bg-positive"
      : status === "error"
        ? "bg-negative"
        : "bg-yellow-400";
  return <span className={`inline-block size-1.5 rounded-full ${color}`} />;
}

export function ActivityLogShell() {
  const [dateFrom, setDateFrom] = useState(() => subDays(new Date(), 7));
  const [dateTo, setDateTo] = useState(() => new Date());
  const [data, setData] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedTool, setSelectedTool] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const fetchData = useCallback(
    async (
      from: Date,
      to: Date,
      page: number,
      categories: string[],
      employee: string,
      tool: string,
      search: string
    ) => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          from: toParam(from),
          to: toParam(to),
          page: String(page),
        });
        if (categories.length > 0) params.set("category", categories.join(","));
        if (employee) params.set("employee", employee);
        if (tool) params.set("tool", tool);
        if (search) params.set("search", search);

        const res = await fetch(`/api/activity-log?${params}`);
        if (!res.ok) throw new Error("Falha ao carregar registro de atividades");
        setData(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchData(
      dateFrom,
      dateTo,
      currentPage,
      selectedCategories,
      selectedEmployee,
      selectedTool,
      searchQuery
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function refetch(
    from = dateFrom,
    to = dateTo,
    page = currentPage,
    categories = selectedCategories,
    employee = selectedEmployee,
    tool = selectedTool,
    search = searchQuery
  ) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(
      () => fetchData(from, to, page, categories, employee, tool, search),
      200
    );
  }

  function handleDateChange(from: Date, to: Date) {
    setDateFrom(from);
    setDateTo(to);
    setCurrentPage(1);
    refetch(from, to, 1);
  }

  function toggleCategory(cat: string) {
    const next = selectedCategories.includes(cat)
      ? selectedCategories.filter((c) => c !== cat)
      : [...selectedCategories, cat];
    setSelectedCategories(next);
    setCurrentPage(1);
    refetch(dateFrom, dateTo, 1, next);
  }

  function handleEmployeeChange(emp: string) {
    setSelectedEmployee(emp);
    setCurrentPage(1);
    refetch(dateFrom, dateTo, 1, selectedCategories, emp);
  }

  function handleToolChange(t: string) {
    setSelectedTool(t);
    setCurrentPage(1);
    refetch(dateFrom, dateTo, 1, selectedCategories, selectedEmployee, t);
  }

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setCurrentPage(1);
      fetchData(
        dateFrom,
        dateTo,
        1,
        selectedCategories,
        selectedEmployee,
        selectedTool,
        value
      );
    }, 400);
  }

  function clearFilters() {
    setSelectedCategories([]);
    setSelectedEmployee("");
    setSelectedTool("");
    setSearchQuery("");
    setCurrentPage(1);
    fetchData(dateFrom, dateTo, 1, [], "", "", "");
  }

  const hasFilters =
    selectedCategories.length > 0 ||
    selectedEmployee !== "" ||
    selectedTool !== "" ||
    searchQuery !== "";

  const groupedByDate = (data?.rows || []).reduce(
    (acc, row) => {
      const day = row.created_at.slice(0, 10);
      if (!acc[day]) acc[day] = [];
      acc[day].push(row);
      return acc;
    },
    {} as Record<string, SessionRow[]>
  );

  const sortedDates = Object.keys(groupedByDate).sort((a, b) =>
    b.localeCompare(a)
  );

  const totalPages = data ? Math.ceil(data.totalCount / data.perPage) : 1;

  const donutData = data?.stats
    ? Object.entries(data.stats.categoryBreakdown).map(([cat, count]) => ({
        name: CATEGORY_LABELS[cat] || cat,
        value: count,
      }))
    : [];

  const donutColors = data?.stats
    ? Object.keys(data.stats.categoryBreakdown).map(
        (cat) => TREMOR_CATEGORY_COLORS[cat] || "zinc"
      )
    : [];

  return (
    <div className="min-h-screen bg-surface-0">
      <NavHeader activePage="activity-log">
        <DateRangePicker
          from={dateFrom}
          to={dateTo}
          onChange={handleDateChange}
        />
      </NavHeader>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {error && (
          <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Stats Bar */}
        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-elevation-1)]"
              >
                <Skeleton className="h-3 w-20 mb-3" />
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        ) : data?.stats ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
            <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-elevation-1)]">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="size-3.5 text-primary" />
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Sessões
                </p>
              </div>
              <p className="font-mono text-3xl font-bold tabular-nums text-foreground">
                {data.stats.totalSessions.toLocaleString("pt-BR")}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-elevation-1)]">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="size-3.5 text-primary" />
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Horas
                </p>
              </div>
              <p className="font-mono text-3xl font-bold tabular-nums text-foreground">
                {data.stats.totalHours.toLocaleString("pt-BR")}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-elevation-1)]">
              <div className="flex items-center gap-2 mb-2">
                <Users className="size-3.5 text-primary" />
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Mais Ativo
                </p>
              </div>
              <p className="text-sm font-semibold text-foreground truncate">
                {data.stats.mostActiveEmployee || "—"}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-elevation-1)] flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="size-3.5 text-primary" />
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Categorias
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(data.stats.categoryBreakdown)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 4)
                    .map(([cat, count]) => (
                      <span
                        key={cat}
                        className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${(CATEGORY_COLORS[cat] || CATEGORY_COLORS.other).bg} ${(CATEGORY_COLORS[cat] || CATEGORY_COLORS.other).text}`}
                      >
                        {count}
                      </span>
                    ))}
                </div>
              </div>
              {donutData.length > 0 && (
                <DonutChart
                  data={donutData}
                  category="value"
                  index="name"
                  colors={donutColors}
                  className="size-16 shrink-0"
                  showLabel={false}
                  showAnimation
                  showTooltip
                />
              )}
            </div>
          </div>
        ) : null}

        {/* Filters */}
        <div className="mb-6 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Buscar em resumos e prompts..."
              className="h-9 w-full rounded-lg border border-border bg-surface-1 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Category chips */}
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
              const active = selectedCategories.includes(key);
              const colors = CATEGORY_COLORS[key] || CATEGORY_COLORS.other;
              return (
                <button
                  key={key}
                  onClick={() => toggleCategory(key)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                    active
                      ? `${colors.bg} ${colors.text} ring-1 ring-current/20`
                      : "bg-surface-2 text-muted-foreground hover:bg-surface-3 hover:text-foreground"
                  }`}
                >
                  <span
                    className={`size-1.5 rounded-full ${active ? colors.dot : "bg-muted-foreground/50"}`}
                  />
                  {label}
                </button>
              );
            })}

            <div className="h-5 w-px bg-border mx-1" />

            {/* Employee select */}
            <select
              value={selectedEmployee}
              onChange={(e) => handleEmployeeChange(e.target.value)}
              className="h-7 rounded-md border border-border bg-surface-1 px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Funcionário</option>
              {(data?.availableEmployees || []).map((emp) => (
                <option key={emp} value={emp}>
                  {emp}
                </option>
              ))}
            </select>

            {/* Tool select */}
            <select
              value={selectedTool}
              onChange={(e) => handleToolChange(e.target.value)}
              className="h-7 rounded-md border border-border bg-surface-1 px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Ferramenta</option>
              {(data?.availableTools || []).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors"
              >
                <X className="size-3" />
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Timeline */}
        {loading ? (
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i}>
                <Skeleton className="h-5 w-40 mb-4" />
                <div className="space-y-2">
                  {[...Array(4)].map((_, j) => (
                    <Skeleton key={j} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : sortedDates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Search className="size-10 mb-3 opacity-30" />
            <p className="text-sm">Nenhuma atividade encontrada</p>
            <p className="text-xs mt-1">Tente ajustar os filtros ou o período</p>
          </div>
        ) : (
          <div className="space-y-8">
            {sortedDates.map((dateKey) => {
              const entries = groupedByDate[dateKey];
              const dateObj = new Date(dateKey + "T12:00:00");
              return (
                <section key={dateKey}>
                  <div className="sticky top-14 z-10 flex items-center gap-3 bg-surface-0/95 backdrop-blur-sm py-2 mb-3">
                    <h2 className="text-sm font-semibold text-foreground">
                      {format(dateObj, "EEEE, d 'de' MMMM", { locale: ptBR })}
                    </h2>
                    <span className="inline-flex items-center rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {entries.length}{" "}
                      {entries.length === 1 ? "ação" : "ações"}
                    </span>
                  </div>

                  <div className="relative ml-3 border-l border-border pl-5 space-y-1">
                    {entries.map((row) => {
                      const time = format(
                        new Date(row.created_at),
                        "HH:mm"
                      );
                      return (
                        <div
                          key={row.id}
                          className="group relative rounded-lg border border-transparent bg-card p-3.5 transition-colors hover:border-border hover:bg-surface-2/50"
                        >
                          {/* Timeline dot */}
                          <div className="absolute -left-[29px] top-4 size-2.5 rounded-full border-2 border-surface-0 bg-surface-4 group-hover:bg-primary transition-colors" />

                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
                            {/* Time */}
                            <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                              {time}
                            </span>

                            {/* Badges */}
                            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                              <StatusDot status={row.status} />
                              <CategoryBadge category={row.task_category} />
                              <ToolBadge tool={row.primary_tool} />
                            </div>

                            {/* Summary */}
                            <p className="flex-1 text-sm text-foreground leading-relaxed min-w-0">
                              {row.task_summary || (
                                <span className="text-muted-foreground italic">
                                  Sem resumo
                                </span>
                              )}
                            </p>

                            {/* Employee + Duration */}
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                                {row.responsible_employee || "—"}
                              </span>
                              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                                {formatDuration(row.duration_seconds)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              onClick={() => {
                const p = currentPage - 1;
                setCurrentPage(p);
                refetch(
                  dateFrom,
                  dateTo,
                  p,
                  selectedCategories,
                  selectedEmployee,
                  selectedTool,
                  searchQuery
                );
              }}
              disabled={currentPage <= 1}
              className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-3 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="size-3.5" />
              Anterior
            </button>
            <span className="text-xs text-muted-foreground tabular-nums">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => {
                const p = currentPage + 1;
                setCurrentPage(p);
                refetch(
                  dateFrom,
                  dateTo,
                  p,
                  selectedCategories,
                  selectedEmployee,
                  selectedTool,
                  searchQuery
                );
              }}
              disabled={currentPage >= totalPages}
              className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-3 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Próximo
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        )}

        {/* Footer */}
        {data?.fetchedAt && (
          <p className="mt-8 text-center text-xs text-muted-foreground">
            Dados atualizados em{" "}
            {new Date(data.fetchedAt).toLocaleString("pt-BR")}
          </p>
        )}
      </main>
    </div>
  );
}
