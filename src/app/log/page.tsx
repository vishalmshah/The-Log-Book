import { createServerClient } from "@/lib/supabase";
import { redirect } from "next/navigation";
import { getISOWeek, parseDateParam, formatDateParam } from "@/lib/week";
import { buildFocusColorMap, buildDayColors } from "@/lib/focus-colors";
import { LogForm } from "./form";
import { PageContainer } from "@/components/page-container";

interface Props {
  searchParams: Promise<{ date?: string }>;
}

export default async function LogPage({ searchParams }: Props) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { date: dateParam } = await searchParams;
  const selectedDate = parseDateParam(dateParam);
  const dateStr = formatDateParam(selectedDate);
  const { week, year } = getISOWeek(selectedDate);

  const [{ data: config }, { data: weekLog }, { data: session }, { count: weekSessionCount }, { data: weekSessions }] = await Promise.all([
    supabase.from("user_info").select("spine, focus_1, focus_2, focus_3").eq("user_id", user.id).single(),
    supabase.from("weekly_logs").select("focus_info").eq("user_id", user.id).eq("week_num", week).eq("year", year).maybeSingle(),
    supabase.from("session_logs").select("todays_focus, exercises_finished, additional_notes, completed").eq("user_id", user.id).eq("date", dateStr).maybeSingle(),
    supabase.from("session_logs").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("week", week).eq("year", year),
    supabase.from("session_logs").select("date, todays_focus").eq("user_id", user.id).eq("week", week).eq("year", year),
  ]);

  if (!config) redirect("/settings");

  const focusNames = [config.focus_1?.name, config.focus_2?.name, config.focus_3?.name].filter(Boolean) as string[];
  const dayColors = buildDayColors(weekSessions ?? [], buildFocusColorMap(focusNames));

  // Show prompt only when: first session of the week AND weekly intentions not yet set
  const weekLogHasContent = weekLog !== null &&
    Object.values(weekLog.focus_info ?? {}).some((v) => v);
  const showWeeklyPrompt = (weekSessionCount ?? 0) === 0 && !session && !weekLogHasContent;

  function withNotes(raw: { name: string; all_ex: string[]; focus_ex: string[]; notes: string[] }) {
    const noteByEx = Object.fromEntries(raw.all_ex.map((ex, i) => [ex, raw.notes[i] ?? ""]));
    return { name: raw.name, focus_ex: raw.focus_ex, notes: raw.focus_ex.map((ex) => noteByEx[ex] ?? "") };
  }

  const focusInfo = weekLog?.focus_info ?? {};
  const weeklyFocus = Object.entries(focusInfo)
    .filter(([, notes]) => notes)
    .map(([label, notes]) => ({ label, notes: notes as string }));

  return (
    <PageContainer>
      <h1 className="mb-6 font-display text-5xl" style={{ color: "var(--brand)" }}>
        {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
      </h1>
      <LogForm
        key={dateStr}
        initialDate={dateStr}
        weeklyFocus={weeklyFocus}
        spine={withNotes(config.spine)}
        focus1={withNotes(config.focus_1)}
        focus2={withNotes(config.focus_2)}
        focus3={withNotes(config.focus_3)}
        existing={session}
        showWeeklyPrompt={showWeeklyPrompt}
        dayColors={dayColors}
      />
    </PageContainer>
  );
}
