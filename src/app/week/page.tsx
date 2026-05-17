import { createServerClient } from "@/lib/supabase";
import { redirect } from "next/navigation";
import { getISOWeek, parseDateParam, formatDateParam } from "@/lib/week";
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
  const { week, year } = getISOWeek(selectedDate);

  const [{ data: config }, { data: weekLog }] = await Promise.all([
    supabase.from("user_focus_and_exercises").select("weekly_focus").eq("user_id", user.id).single(),
    supabase.from("weekly_logs").select("focus_info").eq("user_id", user.id).eq("week_num", week).eq("year", year).maybeSingle(),
  ]);

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
      />
    </PageContainer>
  );
}
