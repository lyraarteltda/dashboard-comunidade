"use client";

import { useState } from "react";
import { format, subDays, startOfDay, startOfMonth } from "date-fns";
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
  { label: "Hoje", getRange: () => ({ from: startOfDay(new Date()), to: new Date() }) },
  { label: "Ontem", getRange: () => ({ from: startOfDay(subDays(new Date(), 1)), to: startOfDay(new Date()) }) },
  { label: "Últimos 7 dias", getRange: () => ({ from: startOfDay(subDays(new Date(), 7)), to: new Date() }) },
  { label: "Últimos 30 dias", getRange: () => ({ from: startOfDay(subDays(new Date(), 30)), to: new Date() }) },
  { label: "Este mês", getRange: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
] as const;

export function DateRangePicker({ from, to, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<DateRange | undefined>({
    from,
    to,
  });

  function applyRange(newFrom: Date, newTo: Date) {
    setSelected({ from: newFrom, to: newTo });
    onChange(newFrom, newTo);
    setOpen(false);
  }

  function handleSelect(range: DateRange | undefined) {
    if (!range) return;
    setSelected(range);
    if (range.from && range.to) {
      onChange(range.from, range.to);
      setOpen(false);
    }
  }

  const label =
    from && to
      ? `${format(from, "dd MMM", { locale: ptBR })} — ${format(to, "dd MMM yyyy", { locale: ptBR })}`
      : "Selecionar período";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className="h-8 gap-2 px-3 text-xs font-medium text-foreground border-border bg-surface-1 hover:bg-surface-2"
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
        <div className="flex flex-col sm:flex-row">
          <div className="border-b border-border p-3 sm:border-b-0 sm:border-r sm:w-36">
            <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Atalhos
            </p>
            <div className="flex flex-row flex-wrap gap-1 sm:flex-col">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => {
                    const r = preset.getRange();
                    applyRange(r.from, r.to);
                  }}
                  className="rounded-md px-2.5 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
          <div className="p-3">
            <Calendar
              mode="range"
              selected={selected}
              onSelect={handleSelect}
              numberOfMonths={2}
              locale={ptBR}
              disabled={{ after: new Date() }}
              defaultMonth={subDays(new Date(), 30)}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
