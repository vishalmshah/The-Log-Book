"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getISOWeek, formatDateParam } from "@/lib/week";
import { buildDayColors } from "@/lib/focus-colors";
import { MonthCalendar, WeeklyStackedChart } from "./charts";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AdditionalNotes {
  practice_duration?: string;
  mood_stars?: number | null;
  focus_stars?: number | null;
}

export interface Session {
  date: string;
  todays_focus: string;
  week: number;
  year: number;
  completed: boolean;
  additional_notes: AdditionalNotes | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function parseMins(hms?: string | null): number {
  if (!hms) return 0;
  const [h, m, s] = hms.split(":").map(Number);
  return Math.round(((h || 0) * 3600 + (m || 0) * 60 + (s || 0)) / 60);
}

function formatDuration(mins: number): string {
  if (mins === 0) return "—";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// ── Main component ────────────────────────────────────────────────────────────

type Period = "week" | "month" | "alltime";

export function DashboardClient({
  sessions,
  focusNames,
  focusColorMap,
}: {
  sessions: Session[];
  focusNames: string[];
  focusColorMap: Record<string, string>;
}) {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("week");
  // referenceDate drives which week/month is displayed and filtered
  const [referenceDate, setReferenceDate] = useState(() => new Date());

  const now = new Date();
  const todayStr = formatDateParam(now);
  const { week: curWeek, year: curYear } = getISOWeek(now);
  const curMonth = now.getMonth();
  const curMonthYear = now.getFullYear();

  // Derived booleans for nav limits
  const refWeek = getISOWeek(referenceDate);
  const isCurrentWeek = refWeek.week === curWeek && refWeek.year === curYear;
  const isCurrentMonth =
    referenceDate.getMonth() === curMonth && referenceDate.getFullYear() === curMonthYear;

  // All sessions with any focus value — includes Free and legacy Skipped
  const allLogged = useMemo(
    () => sessions.filter((s) => !!s.todays_focus),
    [sessions]
  );

  // Focused sessions only (excludes Free + legacy Skipped) — used for stats
  const nonFree = useMemo(
    () => allLogged.filter((s) => s.todays_focus !== "Free" && s.todays_focus !== "Skipped"),
    [allLogged]
  );

  const practicedSet = useMemo(
    () => new Set(allLogged.map((s) => s.date)),
    [allLogged]
  );

  const dayColors = useMemo(
    () => buildDayColors(allLogged, focusColorMap),
    [allLogged, focusColorMap]
  );

  // Filter by the viewed week / month (all-time = everything) — stats use nonFree
  const filteredSessions = useMemo(() => {
    if (period === "week") {
      const { week, year } = getISOWeek(referenceDate);
      return nonFree.filter((s) => s.week === week && s.year === year);
    }
    if (period === "month") {
      const m = referenceDate.getMonth();
      const y = referenceDate.getFullYear();
      return nonFree.filter((s) => {
        const d = new Date(s.date + "T12:00:00");
        return d.getMonth() === m && d.getFullYear() === y;
      });
    }
    return nonFree;
  }, [nonFree, period, referenceDate]);

  const totalMins = useMemo(
    () => filteredSessions.reduce((sum, s) => sum + parseMins(s.additional_notes?.practice_duration), 0),
    [filteredSessions]
  );

  // Sessions list: all practiced sessions including Free (for the list below the stats)
  const sessionList = useMemo(() => {
    if (period === "alltime") return allLogged.slice(0, 10);
    // For week/month, show allLogged (including Free) filtered to the viewed period
    if (period === "week") {
      const { week, year } = getISOWeek(referenceDate);
      return allLogged.filter((s) => s.week === week && s.year === year).slice(0, 10);
    }
    const m = referenceDate.getMonth();
    const y = referenceDate.getFullYear();
    return allLogged.filter((s) => {
      const d = new Date(s.date + "T12:00:00");
      return d.getMonth() === m && d.getFullYear() === y;
    }).slice(0, 10);
  }, [allLogged, period, referenceDate]);

  // All-time stacked chart data — includes Free sessions as their own bar
  const stackedData = useMemo(() => {
    const byWeek: Record<string, Record<string, number | string>> = {};
    for (const s of allLogged) {
      const key = `${s.year}-W${String(s.week).padStart(2, "0")}`;
      if (!byWeek[key]) byWeek[key] = { _label: `W${s.week}` };
      const focus = s.todays_focus;
      if (focus === "Free" || focus === "Skipped") {
        byWeek[key]["Free"] = ((byWeek[key]["Free"] as number) ?? 0) + parseMins(s.additional_notes?.practice_duration);
      } else {
        const areas = focus.split(" + ");
        const mins = parseMins(s.additional_notes?.practice_duration) / areas.length;
        for (const area of areas) {
          byWeek[key][area] = ((byWeek[key][area] as number) ?? 0) + mins;
        }
      }
    }
    return Object.entries(byWeek)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  }, [allLogged]);

  // Include "Free" in chart legend only if there are Free sessions
  const hasFree = allLogged.some((s) => s.todays_focus === "Free" || s.todays_focus === "Skipped");
  const chartFocusNames = hasFree ? [...focusNames, "Free"] : focusNames;

  // Week view data derived from referenceDate — use local date to avoid UTC-shift
  const weekStart = startOfWeek(referenceDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    const str = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { d, str, label: DAY_LABELS[d.getDay()] };
  });

  // Stat card period label
  const periodLabel = (() => {
    if (period === "alltime") return "All time";
    if (period === "week") {
      if (isCurrentWeek) return "This week";
      return `Week of ${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    }
    if (isCurrentMonth) return "This month";
    return referenceDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  })();

  const sessionListLabel = period === "alltime"
    ? "Recent sessions"
    : period === "week"
      ? `Sessions — ${periodLabel.toLowerCase()}`
      : `Sessions — ${periodLabel.toLowerCase()}`;

  return (
    <div className="space-y-5">
      {/* Period tabs */}
      <div className="flex rounded-full border p-1 text-sm" style={{ borderColor: "var(--border-color)", background: "var(--bg-card)" }}>
        {(["week", "month", "alltime"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => { setPeriod(p); setReferenceDate(new Date()); }}
            className="flex-1 rounded-full py-1.5 font-medium transition-colors"
            style={{
              background: period === p ? "var(--brand)" : "transparent",
              color: period === p ? "#fff" : "var(--fg-muted)",
            }}
          >
            {p === "alltime" ? "All-time" : p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Week view ─────────────────────────────────────────────────────────── */}
      {period === "week" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {weekStart.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setReferenceDate(d => addDays(d, -7))}
                className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => !isCurrentWeek && setReferenceDate(d => addDays(d, 7))}
                disabled={isCurrentWeek}
                className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex justify-between gap-0.5">
            {weekDays.map(({ d, str, label }) => {
              const bg = dayColors[str];
              const isToday = str === todayStr;
              return (
                <button
                  key={str}
                  onClick={() => router.push(`/log?date=${str}`)}
                  className="flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 transition-colors hover:bg-muted"
                >
                  <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors
                      ${!bg && isToday ? "ring-2 ring-offset-1 ring-offset-background" : ""}
                    `}
                    style={{
                      background: bg ?? "transparent",
                      color: bg ? "#fff" : "var(--fg-primary)",
                      ["--tw-ring-color" as string]: "var(--brand)",
                    }}
                  >
                    {d.getDate()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Month view ────────────────────────────────────────────────────────── */}
      {period === "month" && (
        <MonthCalendar
          dayColors={dayColors}
          month={referenceDate}
          onMonthChange={setReferenceDate}
          disableFuture
        />
      )}

      {/* ── All-time view ─────────────────────────────────────────────────────── */}
      {period === "alltime" && (
        <WeeklyStackedChart data={stackedData} focusNames={chartFocusNames} />
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">{periodLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{filteredSessions.length}</p>
            <p className="text-xs text-muted-foreground">
              {filteredSessions.length === 1 ? "session" : "sessions"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Practice time</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatDuration(totalMins)}</p>
            <p className="text-xs text-muted-foreground">{periodLabel.toLowerCase()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Sessions list */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">{sessionListLabel}</h2>
        {sessionList.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sessions logged.</p>
        ) : (
          <div className="space-y-2">
            {sessionList.map((s) => {
              const mins = parseMins(s.additional_notes?.practice_duration);
              const mood = s.additional_notes?.mood_stars;
              const focus = s.additional_notes?.focus_stars;
              const dateLabel = new Date(s.date + "T12:00:00").toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              });
              return (
                <Link
                  key={s.date}
                  href={`/log?date=${s.date}`}
                  className="flex items-center justify-between rounded-lg border px-4 py-3 transition-colors hover:bg-muted"
                  style={{ borderColor: "var(--border-color)" }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{dateLabel}</p>
                    <p className="truncate text-xs text-muted-foreground">{s.todays_focus}</p>
                  </div>
                  <div className="ml-3 shrink-0 text-right">
                    <p className="text-sm font-medium">{formatDuration(mins)}</p>
                    {(mood || focus) ? (
                      <p className="text-xs text-muted-foreground">
                        {mood ? `♥ ${mood}` : ""}
                        {mood && focus ? "  " : ""}
                        {focus ? `◎ ${focus}` : ""}
                      </p>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
