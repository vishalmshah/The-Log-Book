"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatDateParam } from "@/lib/week";

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function startOfWeek(date: Date): Date {
  // ISO Monday start: shift Sunday (0) to end
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun, 1=Mon …
  d.setDate(d.getDate() - ((day + 6) % 7)); // Monday
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

interface Props {
  selectedDate: string; // YYYY-MM-DD
  onDateChange: (date: string) => void;
  dayColors?: Record<string, string>; // date → CSS background (color or gradient)
}

export function WeekStrip({ selectedDate, onDateChange, dayColors }: Props) {
  const selected = new Date(selectedDate + "T12:00:00");
  const todayStr = formatDateParam(new Date());
  const monday = startOfWeek(selected);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(monday, i);
    return { date: d, str: formatDateParam(d), label: DAY_LABELS[d.getDay()] };
  });

  const monthLabel = monday.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  function prevWeek() { onDateChange(formatDateParam(addDays(monday, -7))); }
  function nextWeek() { onDateChange(formatDateParam(addDays(monday, 7))); }

  return (
    <div className="select-none space-y-2">
      <p className="text-sm font-medium text-muted-foreground">{monthLabel}</p>
      <div className="flex items-center gap-0.5">
        <button type="button" onClick={prevWeek}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full hover:bg-muted">
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex min-w-0 flex-1 justify-between">
          {days.map(({ date, str, label }) => {
            const isSelected = str === selectedDate;
            const isToday = str === todayStr;
            return (
              <button key={str} type="button" onClick={() => onDateChange(str)}
                className="flex flex-col items-center gap-0.5 rounded-lg px-0.5 py-1 transition-colors hover:bg-muted">
                <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors
                    ${isSelected ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""}
                    ${!dayColors?.[str] && isToday && !isSelected ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""}
                  `}
                  style={{
                    background: dayColors?.[str] ?? "transparent",
                    color: dayColors?.[str] ? "#fff" : "var(--fg-primary)",
                  }}
                >
                  {date.getDate()}
                </span>
              </button>
            );
          })}
        </div>

        <button type="button" onClick={nextWeek}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full hover:bg-muted">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
