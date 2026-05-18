"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { Card, CardContent } from "@/components/ui/card";

// ── Helpers ───────────────────────────────────────────────────────────────────

function localStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ── Custom month calendar ─────────────────────────────────────────────────────

const WEEK_HEADERS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function MonthCalendar({
  dayColors,
  month,
  onMonthChange,
  disableFuture,
}: {
  dayColors?: Record<string, string>;
  month?: Date;
  onMonthChange?: (month: Date) => void;
  disableFuture?: boolean;
}) {
  const router = useRouter();
  const [viewDate, setViewDate] = useState(() => month ?? new Date());
  useEffect(() => { if (month) setViewDate(month); }, [month]);

  const year = viewDate.getFullYear();
  const m = viewDate.getMonth();

  // Monday-aligned grid start
  const firstOfMonth = new Date(year, m, 1);
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(1 - ((firstOfMonth.getDay() + 6) % 7));

  // 6 rows × 7 cols
  const cells: Date[] = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });

  const todayStr = localStr(new Date());
  const now = new Date();
  const atStartOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const isCurrentMonth = (d: Date) => d.getMonth() === m && d.getFullYear() === year;
  const isFuture = (d: Date) => d > atStartOfToday;

  function prevMonth() {
    const d = new Date(year, m - 1, 1);
    setViewDate(d);
    onMonthChange?.(d);
  }

  function nextMonth() {
    const d = new Date(year, m + 1, 1);
    if (disableFuture && d > atStartOfToday) return;
    setViewDate(d);
    onMonthChange?.(d);
  }

  const canGoNext = !disableFuture || new Date(year, m + 1, 1) <= atStartOfToday;
  const monthLabel = firstOfMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <Card>
      <CardContent className="p-3">
        {/* Header */}
        <div className="mb-2 flex items-center justify-between">
          <button
            onClick={prevMonth}
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium">{monthLabel}</span>
          <button
            onClick={nextMonth}
            disabled={!canGoNext}
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Day-of-week headers */}
        <div className="mb-1 grid grid-cols-7">
          {WEEK_HEADERS.map((h) => (
            <div key={h} className="text-center text-[10px] font-medium text-muted-foreground">
              {h}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-y-0.5">
          {cells.map((d, i) => {
            const str = localStr(d);
            const bg = dayColors?.[str];
            const inMonth = isCurrentMonth(d);
            const isToday = str === todayStr;
            const disabled = !inMonth || (disableFuture && isFuture(d));

            return (
              <button
                key={i}
                onClick={() => !disabled && router.push(`/log?date=${str}`)}
                disabled={disabled}
                className="flex h-7 w-full items-center justify-center rounded-full text-xs font-medium transition-colors hover:bg-muted disabled:pointer-events-none"
                style={{
                  background: bg ?? "transparent",
                  color: bg ? "#fff" : inMonth ? "var(--fg-primary)" : "transparent",
                  outline: isToday && !bg ? "2px solid var(--brand)" : undefined,
                  outlineOffset: "-1px",
                  opacity: !inMonth ? 0 : 1,
                }}
              >
                {d.getDate()}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── All-time stacked bar chart ────────────────────────────────────────────────

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
];

const tooltipStyle = {
  background: "var(--bg-content)",
  border: "1px solid var(--border-color)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--fg-primary)",
};

export function WeeklyStackedChart({
  data,
  focusNames,
}: {
  data: Record<string, string | number>[];
  focusNames: string[];
}) {
  if (data.length === 0 || focusNames.length === 0)
    return <p className="text-sm text-muted-foreground">No sessions logged yet.</p>;

  const interval = Math.max(0, Math.ceil(data.length / 8) - 1);

  // "Free" gets the muted color; focused areas get chart colors by position
  const focusedNames = focusNames.filter((n) => n !== "Free");
  const bars = focusNames.map((name) => ({
    name,
    color: name === "Free" ? "var(--fg-muted)" : CHART_COLORS[focusedNames.indexOf(name) % CHART_COLORS.length],
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <XAxis
          dataKey="_label"
          tick={{ fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          interval={interval}
        />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} unit="m" />
        <CartesianGrid strokeDasharray="2 4" stroke="var(--border-color)" vertical={false} />
        <Tooltip
          formatter={(v, name) => [`${Math.round(Number(v))} min`, name]}
          cursor={{ fill: "var(--brand-soft)" }}
          contentStyle={tooltipStyle}
        />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        {bars.map(({ name, color }, i) => (
          <Bar
            key={name}
            dataKey={name}
            stackId="a"
            fill={color}
            radius={i === bars.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
