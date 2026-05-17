"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveWeekLog } from "@/lib/actions";
import { WeekStrip } from "@/components/week-strip";
import Link from "next/link";

interface Props {
  initialDate: string;
  weekNum: number;
  year: number;
  labels: { A: string; B: string; C: string };
  initialFocusInfo: Record<string, string>;
  weekStartLabel: string;
  todayStr: string;
}

export function WeekForm({ initialDate, weekNum, year, labels, initialFocusInfo, weekStartLabel, todayStr }: Props) {
  const router = useRouter();
  const [focusInfo, setFocusInfo] = useState(initialFocusInfo);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const focusInfoRef = useRef(focusInfo);
  focusInfoRef.current = focusInfo;

  // Auto-save 800ms after the last change
  useEffect(() => {
    if (saveStatus === "idle") return; // skip on initial mount
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSaveStatus("saving");
      await saveWeekLog(weekNum, year, focusInfoRef.current);
      setSaveStatus("saved");
    }, 800);
    return () => clearTimeout(debounceRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusInfo]);

  function handleChange(label: string, value: string) {
    setFocusInfo((prev) => ({ ...prev, [label]: value }));
    setSaveStatus("saving"); // triggers the effect
  }

  const activeLabels = [labels.A, labels.B, labels.C].filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-5xl" style={{ color: "var(--brand)" }}>
          Week of {weekStartLabel}
        </h1>
        <Link href={`/log?date=${todayStr}`}
          className="shrink-0 rounded-md px-4 py-2 text-sm font-medium transition-transform hover:-translate-y-0.5"
          style={{ background: "var(--brand)", color: "#fff" }}>
          Log today&apos;s session
        </Link>
      </div>

      <WeekStrip
        selectedDate={initialDate}
        onDateChange={(d) => router.push(`/week?date=${d}`)}
      />

      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium">This Week&apos;s Focus</h2>
          {saveStatus === "saving" && <span className="text-xs text-muted-foreground">Saving…</span>}
          {saveStatus === "saved" && <span className="text-xs text-muted-foreground">Saved</span>}
        </div>
        {activeLabels.map((label) => (
          <div key={label} className="space-y-1">
            <Label>{label}</Label>
            <Textarea rows={3} value={focusInfo[label] ?? ""}
              onChange={(e) => handleChange(label, e.target.value)}
              placeholder={`What are you working on for ${label}?`} />
          </div>
        ))}
      </div>
    </div>
  );
}
