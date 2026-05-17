"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { saveWeekLog } from "@/lib/actions";
import { WeekStrip } from "@/components/week-strip";

interface Props {
  initialDate: string;
  weekNum: number;
  year: number;
  labels: { A: string; B: string; C: string };
  initialFocusInfo: Record<string, string>;
}

export function WeekForm({ initialDate, weekNum, year, labels, initialFocusInfo }: Props) {
  const router = useRouter();
  const [focusInfo, setFocusInfo] = useState(initialFocusInfo);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => { await saveWeekLog(weekNum, year, focusInfo); setSaved(true); });
  }

  const activeLabels = [labels.A, labels.B, labels.C].filter(Boolean);

  return (
    <div className="space-y-6">
      <WeekStrip
        selectedDate={initialDate}
        onDateChange={(d) => router.push(`/week?date=${d}`)}
      />

      <div className="space-y-5">
        <h2 className="text-base font-medium">This Week&apos;s Focus</h2>
        {activeLabels.map((label) => (
          <div key={label} className="space-y-1">
            <Label>{label}</Label>
            <Textarea rows={3} value={focusInfo[label] ?? ""}
              onChange={(e) => { setFocusInfo((prev) => ({ ...prev, [label]: e.target.value })); setSaved(false); }}
              placeholder={`What are you working on for ${label}?`} />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={isPending}>{isPending ? "Saving…" : "Save week"}</Button>
        {saved && <span className="text-sm text-muted-foreground">Saved</span>}
      </div>
    </div>
  );
}
