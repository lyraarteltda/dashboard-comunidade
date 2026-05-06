"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  format,
  subDays,
  startOfDay,
  startOfMonth,
  endOfMonth,
  isBefore,
  isSameDay,
  isAfter,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface DateRangePickerProps {
  from: Date;
  to: Date;
  onChange: (from: Date, to: Date) => void;
}

const presets = [
  {
    label: "Hoje",
    getRange: () => ({ from: startOfDay(new Date()), to: new Date() }),
  },
  {
    label: "Ontem",
    getRange: () => {
      const y = subDays(new Date(), 1);
      return { from: startOfDay(y), to: startOfDay(new Date()) };
    },
  },
  {
    label: "Últimos 7 dias",
    getRange: () => ({
      from: startOfDay(subDays(new Date(), 7)),
      to: new Date(),
    }),
  },
  {
    label: "Últimos 30 dias",
    getRange: () => ({
      from: startOfDay(subDays(new Date(), 30)),
      to: new Date(),
    }),
  },
  {
    label: "Este mês",
    getRange: () => ({ from: startOfMonth(new Date()), to: new Date() }),
  },
  {
    label: "Mês passado",
    getRange: () => {
      const lastMonth = subDays(startOfMonth(new Date()), 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    },
  },
] as const;

export function DateRangePicker({ from, to, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [selected, setSelected] = useState<DateRange | undefined>({
    from,
    to,
  });
  const [hoveredDay, setHoveredDay] = useState<Date | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelected({ from, to });
    setRangeStart(null);
    setHoveredDay(null);
  }, [from, to]);

  useEffect(() => {
    if (!open) {
      setRangeStart(null);
      setHoveredDay(null);
    }
  }, [open]);

  const detectActivePreset = useCallback(() => {
    for (const p of presets) {
      const r = p.getRange();
      if (isSameDay(from, r.from) && isSameDay(to, r.to)) return p.label;
    }
    return null;
  }, [from, to]);

  useEffect(() => {
    setActivePreset(detectActivePreset());
  }, [detectActivePreset]);

  function applyRange(newFrom: Date, newTo: Date) {
    setSelected({ from: newFrom, to: newTo });
    setRangeStart(null);
    setHoveredDay(null);
    onChange(newFrom, newTo);
    setOpen(false);
  }

  function handleSelect(range: DateRange | undefined) {
    if (!range?.from) return;

    if (!rangeStart) {
      setRangeStart(range.from);
      setSelected({ from: range.from, to: undefined });
      return;
    }

    const clickedDay = range.from && range.to ? range.to : range.from;

    if (isBefore(clickedDay, rangeStart)) {
      setRangeStart(clickedDay);
      setSelected({ from: clickedDay, to: undefined });
      return;
    }

    applyRange(rangeStart, clickedDay);
  }

  const displayRange: DateRange | undefined = rangeStart
    ? hoveredDay && isAfter(hoveredDay, rangeStart)
      ? { from: rangeStart, to: hoveredDay }
      : { from: rangeStart, to: rangeStart }
    : selected;

  const label =
    from && to
      ? isSameDay(from, to) || isSameDay(to, startOfDay(to))
        ? `${format(from, "dd MMM yyyy", { locale: ptBR })}`
        : `${format(from, "dd MMM", { locale: ptBR })} — ${format(to, "dd MMM yyyy", { locale: ptBR })}`
      : "Selecionar período";

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      if (rangeStart) {
        setRangeStart(null);
        setSelected({ from, to });
        e.stopPropagation();
      } else {
        setOpen(false);
      }
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className="h-8 gap-2 px-3 text-xs font-medium text-foreground border-border bg-surface-1 hover:bg-surface-2"
            aria-label="Selecionar período de datas"
          />
        }
      >
        <CalendarIcon className="size-3.5 text-muted-foreground" />
        <span>{label}</span>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-auto p-0 bg-surface-1 border-border"
      >
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
        <div
          ref={containerRef}
          className="flex flex-col sm:flex-row"
          onKeyDown={handleKeyDown}
        >
          <div className="border-b border-border p-3 sm:border-b-0 sm:border-r sm:w-40">
            <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Atalhos
            </p>
            <div
              className="flex flex-row flex-wrap gap-1 sm:flex-col"
              role="listbox"
              aria-label="Atalhos de período"
            >
              {presets.map((preset) => {
                const isActive = activePreset === preset.label;
                return (
                  <button
                    key={preset.label}
                    role="option"
                    aria-selected={isActive}
                    onClick={() => {
                      const r = preset.getRange();
                      setActivePreset(preset.label);
                      applyRange(r.from, r.to);
                    }}
                    className={`rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-surface-3 hover:text-foreground"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {rangeStart && (
              <div className="mt-3 rounded-md bg-primary/5 px-2.5 py-2 text-xs text-muted-foreground">
                <span className="font-medium text-primary">
                  {format(rangeStart, "dd MMM", { locale: ptBR })}
                </span>
                {" → selecione o fim"}
              </div>
            )}
          </div>

          <div className="p-3">
            <Calendar
              mode="range"
              selected={displayRange}
              onSelect={handleSelect}
              numberOfMonths={2}
              locale={ptBR}
              disabled={{ after: new Date() }}
              defaultMonth={subDays(new Date(), 30)}
              onDayPointerEnter={(day) => {
                if (rangeStart) setHoveredDay(day);
              }}
              onDayPointerLeave={() => setHoveredDay(null)}
              modifiers={{
                rangeAnchor: rangeStart ? [rangeStart] : [],
              }}
              modifiersClassNames={{
                rangeAnchor: "ring-2 ring-primary ring-offset-1 ring-offset-background rounded-md",
              }}
            />

            <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
              <p className="text-[10px] text-muted-foreground">
                {rangeStart
                  ? "Clique em outra data para finalizar"
                  : "Clique em uma data para iniciar o intervalo"}
              </p>
              {rangeStart && (
                <button
                  onClick={() => {
                    setRangeStart(null);
                    setSelected({ from, to });
                  }}
                  className="text-[10px] text-muted-foreground underline hover:text-foreground"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
