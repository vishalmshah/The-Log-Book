import { createServerClient } from "@/lib/supabase";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ExerciseEditor, FocusNamesForm, WeeklyLabelsForm, AccountPanel } from "./editor";
import { PageContainer } from "@/components/page-container";

export default async function SettingsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: config } = await supabase
    .from("user_focus_and_exercises").select("*").eq("user_id", user.id).single();

  if (!config) {
    function cat(name: string, exercises: { ex: string; focused: boolean; note: string }[]) {
      return {
        name,
        all_ex:    exercises.map((e) => e.ex),
        focus_bool: exercises.map((e) => e.focused),
        notes:     exercises.map((e) => e.note),
        focus_ex:  exercises.filter((e) => e.focused).map((e) => e.ex),
      };
    }

    await supabase.from("user_focus_and_exercises").insert({
      user_id: user.id,
      spine: cat("Spine", [
        { ex: "Technique warmup",  focused: true,  note: "Rote speed exercise with metronome — clean before fast" },
        { ex: "Fretboard Trainer", focused: true,  note: "Rotating string focus — currently weakest: D, G, B" },
        { ex: "Leavitt reading",   focused: true,  note: "One new exercise + previous review" },
        { ex: "Transcription",     focused: true,  note: "At least one phrase — sing it, notate it, play it" },
      ]),
      focus_1: cat("Guitar", [
        { ex: "Scale, saying notes",   focused: true,  note: "Week's scale in focus position, name notes aloud" },
        { ex: "Triad inversions",      focused: true,  note: "I, IV, V on one string set, all three inversions" },
        { ex: "1-2-3-4 chromatic",     focused: true,  note: "Across all strings, strict alternate picking" },
        { ex: "Spider exercise",       focused: false, note: "1-3-2-4 and other permutations" },
        { ex: "Scale-only improv",     focused: false, note: "Backing track in the week's key, scale position only" },
        { ex: "Chord-tone improv",     focused: false, note: "" },
        { ex: "Songwriting fragment",  focused: false, note: "4 bars, or capture an idea in a voice memo" },
      ]),
      focus_2: cat("Voice", [
        { ex: "Song work",             focused: true,  note: "Work small sections, record and listen back" },
        { ex: "Sing the transcription",focused: true,  note: "Week's phrase with dynamics and phrasing" },
        { ex: "Breath support",        focused: true,  note: "" },
        { ex: "Range work",            focused: false, note: "" },
        { ex: "Drone matching",        focused: false, note: "" },
      ]),
      focus_3: cat("Creative", [
        { ex: "Songwriting fragment",  focused: true,  note: "4 bars, or capture an idea in a voice memo" },
        { ex: "Scale-only improv",     focused: true,  note: "Backing track in the week's key" },
        { ex: "Sing-play trading",     focused: true,  note: "Trade sung lines with played lines" },
        { ex: "Chord-tone improv",     focused: false, note: "" },
        { ex: "Transcription deep dive",focused: false,note: "Pick a phrase, learn it fully by ear" },
        { ex: "Improvise then transcribe",focused: false,note: "" },
      ]),
      weekly_focus: { weekly_A: "Song", weekly_B: "Key", weekly_C: "" },
    });
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

      {[
        { category: spine,   fieldName: "spine",   title: "Spine Exercises",            desc: "Done every session regardless of focus mode." },
        { category: focus_1, fieldName: "focus_1", title: `${focus_1.name} Exercises`,  desc: "Check up to 3 exercises to include in this focus mode." },
        { category: focus_2, fieldName: "focus_2", title: `${focus_2.name} Exercises`,  desc: "Check up to 3 exercises to include in this focus mode." },
        { category: focus_3, fieldName: "focus_3", title: `${focus_3.name} Exercises`,  desc: "Check up to 3 exercises to include in this focus mode." },
      ].map(({ category, fieldName, title, desc }) => (
        <Card key={fieldName}>
          <CardHeader><CardTitle>{title}</CardTitle><CardDescription>{desc}</CardDescription></CardHeader>
          <CardContent><ExerciseEditor category={category} fieldName={fieldName} /></CardContent>
        </Card>
      ))}

      <Separator />

      <Card>
        <CardHeader><CardTitle>Weekly Focus Areas</CardTitle><CardDescription>Category names for your weekly planning (e.g. "Technique", "Theory").</CardDescription></CardHeader>
        <CardContent><WeeklyLabelsForm initial={weekly_focus} /></CardContent>
      </Card>

      <Separator />

      <AccountPanel email={user.email ?? ""} />
    </div>
    </PageContainer>
  );
}
