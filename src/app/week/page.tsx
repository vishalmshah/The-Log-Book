import { createServerClient } from "@/lib/supabase";
import { redirect } from "next/navigation";
import { getISOWeek, parseDateParam, formatDateParam } from "@/lib/week";
import { buildFocusColorMap, buildDayColors } from "@/lib/focus-colors";
import { WeekForm } from "./form";
import { PageContainer } from "@/components/page-container";

interface Props {
  searchParams: Promise<{ date?: string }>;
}

export default async function WeekPage({ searchParams }: Props) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { date: dateParam } = await searchParams;
  const selectedDate = parseDateParam(dateParam);
  const { week, year, start } = getISOWeek(selectedDate);
  const weekStartLabel = start.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const todayStr = formatDateParam(new Date());

  const [{ data: config }, { data: weekLog }, { data: weekSessions }] = await Promise.all([
    supabase.from("user_focus_and_exercises").select("weekly_focus, focus_1, focus_2, focus_3").eq("user_id", user.id).single(),
    supabase.from("weekly_logs").select("focus_info").eq("user_id", user.id).eq("week_num", week).eq("year", year).maybeSingle(),
    supabase.from("session_logs").select("date, todays_focus").eq("user_id", user.id).eq("week", week).eq("year", year),
  ]);

  const focusNames = [config?.focus_1?.name, config?.focus_2?.name, config?.focus_3?.name].filter(Boolean) as string[];
  const dayColors = buildDayColors(weekSessions ?? [], buildFocusColorMap(focusNames));

  const labels = config?.weekly_focus ?? { weekly_A: "", weekly_B: "", weekly_C: "" };
  const focusInfo = weekLog?.focus_info ?? {};
  const initialFocusInfo: Record<string, string> = {};
  if (labels.weekly_A) initialFocusInfo[labels.weekly_A] = focusInfo[labels.weekly_A] ?? "";
  if (labels.weekly_B) initialFocusInfo[labels.weekly_B] = focusInfo[labels.weekly_B] ?? "";
  if (labels.weekly_C) initialFocusInfo[labels.weekly_C] = focusInfo[labels.weekly_C] ?? "";

  return (
    <PageContainer>
      <WeekForm
        key={`${week}-${year}`}
        initialDate={formatDateParam(selectedDate)}
        weekNum={week}
        year={year}
        labels={{ A: labels.weekly_A, B: labels.weekly_B, C: labels.weekly_C }}
        initialFocusInfo={initialFocusInfo}
        weekStartLabel={weekStartLabel}
        todayStr={todayStr}
        dayColors={dayColors}
      />
    </PageContainer>
  );
}
