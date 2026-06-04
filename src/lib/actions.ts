"use server";

import { createServerClient } from "@/lib/supabase";
import { getISOWeek } from "@/lib/week";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

async function getUser() {
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not authenticated");
  return { supabase, user };
}

// ── Streak ───────────────────────────────────────────────────────────────────

export async function getStreak(todayStr?: string): Promise<number> {
  const { supabase, user } = await getUser();

  const today = todayStr ? new Date(todayStr + "T12:00:00") : new Date();
  const earliest = new Date(today);
  earliest.setDate(earliest.getDate() - 90 * 7);
  const earliestStr = `${earliest.getFullYear()}-${String(earliest.getMonth() + 1).padStart(2, "0")}-${String(earliest.getDate()).padStart(2, "0")}`;

  const [{ data: cfg }, { data: sessions }] = await Promise.all([
    supabase.from("user_info").select("weekly_goal_hours").eq("user_id", user.id).single(),
    supabase
      .from("session_logs")
      .select("week, year, todays_focus, additional_notes")
      .eq("user_id", user.id)
      .gte("date", earliestStr),
  ]);

  const goalMins = (cfg?.weekly_goal_hours ?? 3) * 60;

  const byWeek = new Map<string, number>();
  for (const s of sessions ?? []) {
    if (s.todays_focus === "Free" || s.todays_focus === "Skipped") continue;
    const an = s.additional_notes as { practice_duration?: string } | null;
    const hms = an?.practice_duration;
    if (!hms) continue;
    const [h, m, sec] = hms.split(":").map(Number);
    const mins = ((h || 0) * 3600 + (m || 0) * 60 + (sec || 0)) / 60;
    const key = `${s.year}-${String(s.week).padStart(2, "0")}`;
    byWeek.set(key, (byWeek.get(key) ?? 0) + mins);
  }

  let streak = 0;
  const cursor = new Date(today);
  for (let i = 0; i <= 90; i++) {
    const { week, year } = getISOWeek(cursor);
    const key = `${year}-${String(week).padStart(2, "0")}`;
    const mins = byWeek.get(key) ?? 0;
    if (mins >= goalMins) {
      streak++;
    } else if (i > 0) {
      break; // allow current week to be not-yet-complete without breaking streak
    }
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function signOut() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function deleteAccount() {
  const { supabase } = await getUser();
  const { error } = await supabase.rpc("delete_account");
  if (error) throw new Error(error.message);
  redirect("/login");
}

export async function sendMagicLink(formData: FormData) {
  const email = formData.get("email") as string;
  const reqHeaders = await headers();
  const host = reqHeaders.get("x-forwarded-host") ?? reqHeaders.get("host") ?? "thelogbook.studio";
  const origin = `${host.includes("localhost") ? "http" : "https"}://${host}`;
  const supabase = await createServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect("/login?message=Check+your+email+for+the+login+link");
}

// ── Session log ───────────────────────────────────────────────────────────────

export interface ExerciseEntry {
  exercise: string;
  sessionNotes: string;
  audioUrl?: string;
}

export interface SessionPayload {
  date: string;
  todaysFocus: string;
  spineEntries: ExerciseEntry[];
  primaryEntries: ExerciseEntry[];
  secondaryEntries: ExerciseEntry[];
  moodStars: number | null;
  focusStars: number | null;
  additionalNotes: string;
  practiceDuration: string; // "HH:MM:SS"
  completed: boolean;
}

export async function saveSession(payload: SessionPayload) {
  const { supabase, user } = await getUser();
  const { week, year } = getISOWeek(new Date(payload.date + "T12:00:00"));

  const { error: saveError } = await supabase.from("session_logs").upsert(
    {
      user_id: user.id,
      date: payload.date,
      week,
      year,
      todays_focus: payload.todaysFocus,
      completed: payload.completed,
      exercises_finished: {
        spine: payload.spineEntries,
        primary: payload.primaryEntries,
        secondary: payload.secondaryEntries,
      },
      additional_notes: {
        additional_notes: payload.additionalNotes,
        mood_stars: payload.moodStars,
        focus_stars: payload.focusStars,
        practice_duration: payload.practiceDuration,
      },
    },
    { onConflict: "user_id,date" }
  );
  if (saveError) console.error("[saveSession]", saveError.message);

  revalidatePath("/log");
  revalidatePath("/dashboard");
}

export async function deleteSession(date: string) {
  const { supabase, user } = await getUser();
  const { error } = await supabase.from("session_logs").delete().eq("user_id", user.id).eq("date", date);
  if (error) throw new Error(error.message);
  revalidatePath("/log");
  revalidatePath("/dashboard");
}

export async function getExerciseHistory(exercise: string): Promise<{ date: string; notes: string; audioUrl?: string }[]> {
  const { supabase, user } = await getUser();
  const { data } = await supabase
    .from("session_logs")
    .select("date, exercises_finished")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(50);

  const results: { date: string; notes: string; audioUrl?: string }[] = [];
  for (const row of data ?? []) {
    const ef = row.exercises_finished as Record<string, ExerciseEntry[]>;
    const allEntries = [...(ef?.spine ?? []), ...(ef?.primary ?? []), ...(ef?.secondary ?? [])];
    const match = allEntries.find((e) => e.exercise === exercise);
    if (match?.sessionNotes || match?.audioUrl) {
      results.push({ date: row.date, notes: match.sessionNotes ?? "", audioUrl: match.audioUrl });
    }
  }
  return results;
}

// ── Weekly log ────────────────────────────────────────────────────────────────

export async function saveWeekLog(weekNum: number, year: number, focusInfo: Record<string, string>) {
  const { supabase, user } = await getUser();
  await supabase.from("weekly_logs").upsert(
    { user_id: user.id, week_num: weekNum, year, focus_info: focusInfo },
    { onConflict: "user_id,week_num,year" }
  );
  revalidatePath("/week");
}

// ── CSV export ───────────────────────────────────────────────────────────────

function csvCell(val: string | number | boolean | null | undefined): string {
  if (val === null || val === undefined) return "";
  const s = String(val);
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

function hmsToDurationMin(hms?: string | null): string {
  if (!hms) return "";
  const [h, m, s] = hms.split(":").map(Number);
  const totalSeconds = (h || 0) * 3600 + (m || 0) * 60 + (s || 0);
  return String(Math.round(totalSeconds / 60 * 10) / 10); // one decimal place
}

export async function exportSessionsCSV(): Promise<string> {
  const { supabase, user } = await getUser();
  const { data } = await supabase
    .from("session_logs")
    .select("date, todays_focus, week, year, completed, additional_notes, exercises_finished")
    .eq("user_id", user.id)
    .order("date", { ascending: true });

  const headers = [
    "date", "focus", "week", "year", "completed",
    "duration_min", "mood_stars", "focus_stars", "notes",
    "spine_exercises", "primary_exercises", "secondary_exercises",
  ];

  const joinEx = (arr?: { exercise: string }[]) =>
    (arr ?? []).map((e) => e.exercise).join(";");

  const rows = (data ?? []).map((s) => {
    const an = s.additional_notes as Record<string, unknown> | null;
    const ef = s.exercises_finished as Record<string, { exercise: string }[]> | null;

    return [
      csvCell(s.date),
      csvCell(s.todays_focus),
      csvCell(s.week),
      csvCell(s.year),
      csvCell(s.completed),
      csvCell(hmsToDurationMin(an?.practice_duration as string | null)),
      csvCell(an?.mood_stars as number | null),
      csvCell(an?.focus_stars as number | null),
      csvCell(an?.additional_notes as string | null),
      csvCell(joinEx(ef?.spine)),
      csvCell(joinEx(ef?.primary)),
      csvCell(joinEx(ef?.secondary)),
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

// ── Settings ──────────────────────────────────────────────────────────────────

export async function saveFocusNames(names: { focus1: string; focus2: string; focus3: string }) {
  const { supabase, user } = await getUser();
  const { data } = await supabase
    .from("user_info")
    .select("focus_1, focus_2, focus_3")
    .eq("user_id", user.id)
    .single();
  if (!data) throw new Error("No config — visit /settings first");

  await supabase
    .from("user_info")
    .update({
      focus_1: { ...data.focus_1, name: names.focus1 },
      focus_2: { ...data.focus_2, name: names.focus2 },
      focus_3: { ...data.focus_3, name: names.focus3 },
    })
    .eq("user_id", user.id);
  revalidatePath("/settings");
}

export interface ExerciseRow {
  ex: string;
  focused: boolean;
  note: string;
}

export async function saveExercises(fieldName: string, categoryName: string, rows: ExerciseRow[]) {
  const { supabase, user } = await getUser();
  await supabase.from("user_info").upsert(
    {
      user_id: user.id,
      [fieldName]: {
        name: categoryName,
        all_ex: rows.map((r) => r.ex),
        focus_bool: rows.map((r) => r.focused),
        notes: rows.map((r) => r.note),
        focus_ex: rows.filter((r) => r.focused).map((r) => r.ex),
      },
    },
    { onConflict: "user_id" }
  );
  revalidatePath("/settings");
}

export async function saveWeeklyLabels(labels: { weekly_A: string; weekly_B: string; weekly_C: string }) {
  const { supabase, user } = await getUser();
  await supabase.from("user_info").upsert(
    {
      user_id: user.id,
      weekly_focus: {
        weekly_A: labels.weekly_A,
        weekly_B: labels.weekly_B,
        weekly_C: labels.weekly_C,
      },
    },
    { onConflict: "user_id" }
  );
  revalidatePath("/settings");
}

export async function saveWeeklyGoal(hours: number) {
  const { supabase, user } = await getUser();
  await supabase
    .from("user_info")
    .update({ weekly_goal_hours: hours })
    .eq("user_id", user.id);
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}
