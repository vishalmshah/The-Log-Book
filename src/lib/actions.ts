"use server";

import { createServerClient } from "@/lib/supabase";
import { getISOWeek } from "@/lib/week";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function getUser() {
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not authenticated");
  return { supabase, user };
}

// ── Streak ───────────────────────────────────────────────────────────────────

export async function getStreak(): Promise<number> {
  const { supabase, user } = await getUser();
  const { data } = await supabase
    .from("session_logs")
    .select("date, todays_focus")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(90);

  const practiced = new Set(
    (data ?? []).filter((r) => r.todays_focus !== "Skipped").map((r) => r.date as string)
  );

  const today = new Date();
  let streak = 0;
  for (let i = 0; i <= 90; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (practiced.has(key)) {
      streak++;
    } else if (i > 0) {
      break; // allow today to be not-yet-practiced without breaking streak
    }
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
  await supabase.rpc("delete_account");
  redirect("/login");
}

export async function sendMagicLink(formData: FormData) {
  const email = formData.get("email") as string;
  const supabase = await createServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
    },
  });
  if (error) redirect("/login?error=Could+not+send+magic+link");
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

// ── Settings ──────────────────────────────────────────────────────────────────

export async function saveFocusNames(names: { focus1: string; focus2: string; focus3: string }) {
  const { supabase, user } = await getUser();
  const { data } = await supabase
    .from("user_focus_and_exercises")
    .select("focus_1, focus_2, focus_3")
    .eq("user_id", user.id)
    .single();
  if (!data) throw new Error("No config — visit /settings first");

  await supabase
    .from("user_focus_and_exercises")
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
  await supabase.from("user_focus_and_exercises").upsert(
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
  await supabase.from("user_focus_and_exercises").upsert(
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
