import { createServerClient } from "@/lib/supabase";
import { redirect } from "next/navigation";
import { getISOWeek } from "@/lib/week";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DurationChart, FocusChart, PracticeCalendar, type DayBar, type FocusBar } from "./charts";
import { PageContainer } from "@/components/page-container";
import Link from "next/link";

function parseDurationMinutes(hms: string | undefined): number {
  if (!hms) return 0;
  const [h, m, s] = hms.split(":").map(Number);
  return Math.round(((h || 0) * 3600 + (m || 0) * 60 + (s || 0)) / 60);
}

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

  // Fetch recent sessions for charts + all practiced dates for the calendar
  const [{ data: sessions }, { data: allDates }] = await Promise.all([
    supabase
      .from("session_logs")
      .select("date, todays_focus, additional_notes")
      .eq("user_id", user.id)
      .gte("date", thirtyDaysAgo.toISOString().slice(0, 10))
      .order("date", { ascending: true }),
    supabase
      .from("session_logs")
      .select("date, todays_focus")
      .eq("user_id", user.id)
      .order("date", { ascending: false }),
  ]);

  const rows = sessions ?? [];
  const { week, year } = getISOWeek(new Date());

  const thisWeekSessions = rows.filter((r) => {
    const w = getISOWeek(new Date(r.date + "T12:00:00"));
    return w.week === week && w.year === year && r.todays_focus !== "Skipped";
  });
  const thisWeekMinutes = thisWeekSessions.reduce(
    (sum, r) => sum + parseDurationMinutes(r.additional_notes?.practice_duration), 0
  );

  const barData: DayBar[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const session = rows.find((r) => r.date === dateStr);
    barData.push({
      date: d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" }),
      minutes: session ? parseDurationMinutes(session.additional_notes?.practice_duration) : 0,
    });
  }

  const focusCounts: Record<string, number> = {};
  for (const r of rows) {
    if (r.todays_focus && r.todays_focus !== "Skipped")
      focusCounts[r.todays_focus] = (focusCounts[r.todays_focus] ?? 0) + 1;
  }
  const focusData: FocusBar[] = Object.entries(focusCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, sessions]) => ({ name, sessions }));

  // Dates with actual practice (not Skipped) — passed to calendar as ISO strings
  const practicedDates = (allDates ?? [])
    .filter((r) => r.todays_focus !== "Skipped")
    .map((r) => r.date as string);

  return (
    <PageContainer wide>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-5xl" style={{ color: "var(--brand)" }}>Dashboard</h1>
        <div className="flex gap-2">
          <Link href="/settings"
            className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-muted">
            Set up focus areas
          </Link>
          <Link href="/log"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Start practice
          </Link>
        </div>
      </div>

      <PracticeCalendar practicedDates={practicedDates} />

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">This week</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{thisWeekSessions.length}</p>
            <p className="text-xs text-muted-foreground">{thisWeekSessions.length === 1 ? "session" : "sessions"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Time this week</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{thisWeekMinutes}</p>
            <p className="text-xs text-muted-foreground">minutes</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Practice duration — last 14 days</CardTitle>
        </CardHeader>
        <CardContent><DurationChart data={barData} /></CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Focus mode breakdown — last 30 days</CardTitle>
        </CardHeader>
        <CardContent><FocusChart data={focusData} /></CardContent>
      </Card>
    </div>
    </PageContainer>
  );
}
