import { createServerClient } from "@/lib/supabase";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FocusNamesForm, WeeklyLabelsForm, WeeklyGoalForm, AccountPanel } from "./editor";
import { ExerciseEditorGroup } from "./exercise-editor-group";
import { PageContainer } from "@/components/page-container";

export default async function SettingsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: config } = await supabase
    .from("user_info").select("*").eq("user_id", user.id).single();

  if (!config) {
    function cat(name: string, exercises: { ex: string; focused: boolean; starred: boolean; note: string }[]) {
      return {
        name,
        all_ex:       exercises.map((e) => e.ex),
        focus_bool:   exercises.map((e) => e.focused),
        starred_bool: exercises.map((e) => e.starred),
        notes:        exercises.map((e) => e.note),
        focus_ex:     exercises.filter((e) => e.focused).map((e) => e.ex),
        starred_ex:   exercises.filter((e) => e.starred).map((e) => e.ex),
      };
    }

    const { error: insertError } = await supabase.from("user_info").insert({
      user_id: user.id,
      spine: cat("Spine", [
        { ex: "Technique warmup",  focused: true, starred: false, note: "Rote speed exercise with metronome — clean before fast" },
        { ex: "Fretboard Trainer", focused: true, starred: false, note: "Rotating string focus — currently weakest: D, G, B" },
        { ex: "Leavitt reading",   focused: true, starred: false, note: "One new exercise + previous review" },
        { ex: "Transcription",     focused: true, starred: false, note: "At least one phrase — sing it, notate it, play it" },
      ]),
      focus_1: cat("Guitar", [
        { ex: "Scale, saying notes",   focused: true, starred: false, note: "Week's scale in focus position, name notes aloud" },
        { ex: "Triad inversions",      focused: true, starred: false, note: "I, IV, V on one string set, all three inversions" },
        { ex: "1-2-3-4 chromatic",     focused: true, starred: false, note: "Across all strings, strict alternate picking" },
        { ex: "Spider exercise",       focused: false, starred: false, note: "1-3-2-4 and other permutations" },
        { ex: "Scale-only improv",     focused: false, starred: false, note: "Backing track in the week's key, scale position only" },
        { ex: "Chord-tone improv",     focused: false, starred: false, note: "" },
        { ex: "Songwriting fragment",  focused: false, starred: false, note: "4 bars, or capture an idea in a voice memo" },
      ]),
      focus_2: cat("Voice", [
        { ex: "Song work",             focused: true, starred: false, note: "Work small sections, record and listen back" },
        { ex: "Sing the transcription",focused: true, starred: false, note: "Week's phrase with dynamics and phrasing" },
        { ex: "Breath support",        focused: true, starred: false, note: "" },
        { ex: "Range work",            focused: false, starred: false, note: "" },
        { ex: "Drone matching",        focused: false, starred: false, note: "" },
      ]),
      focus_3: cat("Creative", [
        { ex: "Songwriting fragment",  focused: true, starred: false, note: "4 bars, or capture an idea in a voice memo" },
        { ex: "Scale-only improv",     focused: true, starred: false, note: "Backing track in the week's key" },
        { ex: "Sing-play trading",     focused: true, starred: false, note: "Trade sung lines with played lines" },
        { ex: "Chord-tone improv",     focused: false, starred: false, note: "" },
        { ex: "Transcription deep dive",focused: false, starred: false, note: "Pick a phrase, learn it fully by ear" },
        { ex: "Improvise then transcribe",focused: false, starred: false, note: "" },
      ]),
      weekly_focus: { weekly_A: "Song", weekly_B: "Key", weekly_C: "" },
      weekly_goal_hours: 3,
    });
    if (insertError) redirect("/login?error=Failed+to+initialize+account");
    redirect("/settings");
  }

  const { spine, focus_1, focus_2, focus_3, weekly_focus } = config;

  return (
    <PageContainer>
    <div className="space-y-8">
      <h1 className="font-display text-5xl" style={{ color: "var(--brand)" }}>Settings</h1>

      <Card>
        <CardHeader><CardTitle>Session Focus Areas</CardTitle><CardDescription>Names for your three focus modes.</CardDescription></CardHeader>
        <CardContent>
          <FocusNamesForm initial={{ focus1: focus_1.name, focus2: focus_2.name, focus3: focus_3.name }} />
        </CardContent>
      </Card>

      <Separator />

      <ExerciseEditorGroup spine={spine} focus_1={focus_1} focus_2={focus_2} focus_3={focus_3} />

      <Separator />

      <Card>
        <CardHeader><CardTitle>Weekly Focus Areas</CardTitle><CardDescription>Category names for your weekly planning (e.g. "Technique", "Theory").</CardDescription></CardHeader>
        <CardContent><WeeklyLabelsForm initial={weekly_focus} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Weekly Practice Goal</CardTitle><CardDescription>Hours of practice per week to complete your ring.</CardDescription></CardHeader>
        <CardContent><WeeklyGoalForm initial={config.weekly_goal_hours ?? 3} /></CardContent>
      </Card>

      <Separator />

      <AccountPanel email={user.email ?? ""} />
    </div>
    </PageContainer>
  );
}
