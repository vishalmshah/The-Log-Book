import { createServerClient } from "@/lib/supabase";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PageContainer } from "@/components/page-container";
import { DashboardClient } from "./dashboard-client";
import { buildFocusColorMap } from "@/lib/focus-colors";

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: sessions }, { data: config }] = await Promise.all([
    supabase
      .from("session_logs")
      .select("date, todays_focus, additional_notes, week, year, completed")
      .eq("user_id", user.id)
      .order("date", { ascending: false }),
    supabase
      .from("user_focus_and_exercises")
      .select("focus_1, focus_2, focus_3")
      .eq("user_id", user.id)
      .single(),
  ]);

  const focusNames = [config?.focus_1?.name, config?.focus_2?.name, config?.focus_3?.name]
    .filter(Boolean) as string[];
  const focusColorMap = buildFocusColorMap(focusNames);

  return (
    <PageContainer wide>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="font-display text-5xl" style={{ color: "var(--brand)" }}>Dashboard</h1>
          <div className="flex gap-2">
            <Link
              href="/settings"
              className="flex-1 rounded-md border px-3 py-2 text-center text-sm font-medium transition-colors hover:bg-muted sm:flex-none"
              style={{ borderColor: "var(--border-color)" }}
            >
              Focus areas
            </Link>
            <Link
              href="/log"
              className="flex-1 rounded-md px-3 py-2 text-center text-sm font-medium text-white transition-transform hover:-translate-y-0.5 sm:flex-none"
              style={{ background: "var(--brand)" }}
            >
              Start practice
            </Link>
          </div>
        </div>

        <DashboardClient sessions={sessions ?? []} focusNames={focusNames} focusColorMap={focusColorMap} />
      </div>
    </PageContainer>
  );
}
