import { createServerClient } from "@/lib/supabase";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ExerciseEditor, FocusNamesForm, WeeklyLabelsForm } from "./editor";
import { PageContainer } from "@/components/page-container";

export default async function SettingsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: config } = await supabase
    .from("user_focus_and_exercises").select("*").eq("user_id", user.id).single();

  if (!config) {
    const blank = { name: "", all_ex: [], focus_bool: [], notes: [], focus_ex: [] };
    await supabase.from("user_focus_and_exercises").insert({
      user_id: user.id,
      spine: { ...blank, name: "Spine" },
      focus_1: { ...blank, name: "Focus 1" },
      focus_2: { ...blank, name: "Focus 2" },
      focus_3: { ...blank, name: "Focus 3" },
      weekly_focus: { weekly_A: "", weekly_B: "", weekly_C: "" },
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
    </div>
    </PageContainer>
  );
}
