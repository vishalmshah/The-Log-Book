"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Star, X, Plus, Clock, Mic, Square } from "lucide-react";
import { saveSession, getExerciseHistory, type ExerciseEntry } from "@/lib/actions";
import { WeekStrip } from "@/components/week-strip";
import { useTimer } from "@/components/timer-context";
import { createClient } from "@/lib/supabase-browser";

// ── Timer ─────────────────────────────────────────────────────────────────────

function formatSecs(total: number) {
  return `${Math.floor(total / 60).toString().padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`;
}
function parseTimerInput(raw: string): number {
  const parts = raw.split(":").map((p) => parseInt(p, 10) || 0);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] * 60;
}

function PracticeTimer({ readOnly }: { readOnly?: boolean }) {
  const { elapsed, running, start, stop, reset, setElapsed } = useTimer();
  const [inputVal, setInputVal] = useState(formatSecs(elapsed));

  useEffect(() => { setInputVal(formatSecs(elapsed)); }, [elapsed]);

  function handleBlur() {
    const secs = parseTimerInput(inputVal);
    setElapsed(secs);
  }

  return (
    <div className="space-y-3">
      <input type="text" value={inputVal} readOnly={running || readOnly}
        onChange={(e) => setInputVal(e.target.value)} onBlur={handleBlur}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
        className={`w-28 bg-transparent font-mono text-4xl font-semibold tabular-nums outline-none ${(running || readOnly) ? "cursor-default" : "cursor-text rounded border border-transparent focus:border-input focus:px-1"}`}
      />
      {!readOnly && (
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={start} disabled={running}>Start</Button>
          <Button type="button" variant="outline" size="sm" onClick={stop} disabled={!running}>Stop</Button>
          <Button type="button" variant="ghost" size="sm" onClick={reset}>Reset</Button>
        </div>
      )}
    </div>
  );
}

// ── Stars ─────────────────────────────────────────────────────────────────────

function StarRating({ value, onChange, readOnly }: { value: number | null; onChange: (v: number) => void; readOnly?: boolean }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const display = (readOnly ? null : hovered) ?? value ?? 0;
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} type="button"
          onClick={readOnly ? undefined : () => onChange(star)}
          onMouseEnter={readOnly ? undefined : () => setHovered(star)}
          onMouseLeave={readOnly ? undefined : () => setHovered(null)}
          className={readOnly ? "cursor-default" : "text-muted-foreground transition-colors hover:text-yellow-400"}>
          <Star className={`h-6 w-6 ${display >= star ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
        </button>
      ))}
    </div>
  );
}

// ── Audio recorder ────────────────────────────────────────────────────────────

function AudioRecorder({
  audioUrl, onAudioSaved, filePath, readOnly,
}: {
  audioUrl?: string;
  onAudioSaved: (url: string) => void;
  filePath: string;
  readOnly?: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "";
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
        setUploading(true);
        try {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          const ext = mimeType === "audio/mp4" ? "m4a" : "webm";
          const path = `${user.id}/${filePath}.${ext}`;
          const { error } = await supabase.storage.from("session-audio")
            .upload(path, blob, { contentType: mimeType || "audio/webm", upsert: true });
          if (!error) {
            const { data: { publicUrl } } = supabase.storage.from("session-audio").getPublicUrl(path);
            onAudioSaved(publicUrl);
          }
        } finally {
          setUploading(false);
        }
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch {
      // Permission denied or not supported
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  if (!audioUrl && readOnly) return null;

  return (
    <div className="flex items-center gap-3 pt-0.5">
      {!readOnly && !recording && !uploading && (
        <button type="button" onClick={startRecording}
          className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
          <Mic className="h-3.5 w-3.5" />
          {audioUrl ? "Re-record" : "Record"}
        </button>
      )}
      {recording && (
        <button type="button" onClick={stopRecording}
          className="flex items-center gap-1.5 text-xs text-destructive transition-colors hover:text-destructive/80">
          <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
          <Square className="h-3 w-3 fill-current" />
          Stop
        </button>
      )}
      {uploading && <span className="text-xs text-muted-foreground">Uploading…</span>}
      {audioUrl && !uploading && (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <audio controls src={audioUrl} className="h-7" style={{ maxWidth: "200px" }} />
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function durationToSeconds(hms: string) {
  const [h, m, s] = hms.split(":").map(Number);
  return (h || 0) * 3600 + (m || 0) * 60 + (s || 0);
}
function secondsToDuration(total: number) {
  return [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60]
    .map((v) => v.toString().padStart(2, "0")).join(":");
}

function initSpineEntries(focusEx: string[], ef: Record<string, unknown>): ExerciseEntry[] {
  const saved = (ef?.spine ?? []) as ExerciseEntry[];
  return focusEx.map((ex) => {
    const match = saved.find((e) => e.exercise === ex);
    return { exercise: ex, sessionNotes: match?.sessionNotes ?? "", audioUrl: match?.audioUrl };
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ExerciseCategory { name: string; focus_ex: string[]; notes: string[]; }
interface WeeklyFocusEntry { label: string; notes: string; }
interface ExistingSession {
  todays_focus: string;
  exercises_finished: Record<string, unknown>;
  additional_notes: { mood_stars: number | null; focus_stars: number | null; additional_notes: string; practice_duration: string; };
  completed?: boolean;
}
interface Props {
  initialDate: string;
  weeklyFocus: WeeklyFocusEntry[];
  spine: ExerciseCategory;
  focus1: ExerciseCategory;
  focus2: ExerciseCategory;
  focus3: ExerciseCategory;
  existing: ExistingSession | null;
  showWeeklyPrompt: boolean;
}

// ── History dialog ────────────────────────────────────────────────────────────

function HistoryDialog({ exercise, open, onClose }: { exercise: string; open: boolean; onClose: () => void }) {
  const [history, setHistory] = useState<{ date: string; notes: string; audioUrl?: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !exercise) return;
    setLoading(true);
    getExerciseHistory(exercise).then(setHistory).finally(() => setLoading(false));
  }, [open, exercise]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{exercise}</DialogTitle>
          <DialogDescription>Past session notes</DialogDescription>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notes recorded for this exercise yet.</p>
        ) : (
          <div className="max-h-80 space-y-4 overflow-y-auto">
            {history.map(({ date, notes, audioUrl }) => (
              <div key={date} className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                </p>
                {notes && <p className="text-sm">{notes}</p>}
                {audioUrl && (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <audio controls src={audioUrl} className="h-8 w-full" />
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Exercise row ──────────────────────────────────────────────────────────────

function ExerciseRow({
  exercise, settingsNote, sessionNotes, onSessionNotesChange,
  availableExercises, onExerciseChange, onRemove, readOnly,
  date, audioUrl, onAudioSaved,
}: {
  exercise: string;
  settingsNote: string;
  sessionNotes: string;
  onSessionNotesChange: (v: string) => void;
  availableExercises?: string[];
  onExerciseChange?: (v: string) => void;
  onRemove?: () => void;
  readOnly?: boolean;
  date: string;
  audioUrl?: string;
  onAudioSaved?: (url: string) => void;
}) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const slug = exercise.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <div className="flex items-center gap-2">
        {(!readOnly && availableExercises) ? (
          <Select value={exercise} onValueChange={(v) => { if (v) onExerciseChange?.(v); }}>
            <SelectTrigger className="h-8 flex-1 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {availableExercises.map((ex) => <SelectItem key={ex} value={ex}>{ex}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : (
          <span className="flex-1 text-sm font-medium">{exercise}</span>
        )}
        <button type="button" onClick={() => setHistoryOpen(true)}
          className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
          title="View past notes">
          <Clock className="h-4 w-4" />
        </button>
        {!readOnly && onRemove && (
          <button type="button" onClick={onRemove}
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-destructive">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {settingsNote && <p className="text-xs text-muted-foreground">↳ {settingsNote}</p>}

      {readOnly ? (
        sessionNotes
          ? <p className="text-sm">{sessionNotes}</p>
          : <p className="text-xs text-muted-foreground italic">No notes</p>
      ) : (
        <Textarea placeholder="Notes for this exercise…" rows={2}
          value={sessionNotes} onChange={(e) => onSessionNotesChange(e.target.value)} />
      )}

      <AudioRecorder
        audioUrl={audioUrl}
        onAudioSaved={(url) => onAudioSaved?.(url)}
        filePath={`${date}/${slug}`}
        readOnly={readOnly}
      />

      <HistoryDialog exercise={exercise} open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </div>
  );
}

// ── Focus section (add-on-demand) ─────────────────────────────────────────────

function FocusSection({ category, entries, onChange, readOnly, date }: {
  category: ExerciseCategory;
  entries: ExerciseEntry[];
  onChange: (entries: ExerciseEntry[]) => void;
  readOnly?: boolean;
  date: string;
}) {
  const noteByEx = Object.fromEntries(category.focus_ex.map((ex, i) => [ex, category.notes[i] ?? ""]));

  function addedByOthers(currentIdx: number) {
    return new Set(entries.filter((_, j) => j !== currentIdx).map((e) => e.exercise));
  }

  function availableForRow(i: number) {
    const others = addedByOthers(i);
    return category.focus_ex.filter((ex) => !others.has(ex));
  }

  const totalAdded = new Set(entries.map((e) => e.exercise));
  const canAdd = category.focus_ex.some((ex) => !totalAdded.has(ex));

  function addExercise() {
    const next = category.focus_ex.find((ex) => !totalAdded.has(ex));
    if (next) onChange([...entries, { exercise: next, sessionNotes: "" }]);
  }

  function update(i: number, patch: Partial<ExerciseEntry>) {
    onChange(entries.map((e, j) => j === i ? { ...e, ...patch } : e));
  }

  if (category.focus_ex.length === 0)
    return <p className="text-sm text-muted-foreground">No exercises configured for this focus yet.</p>;

  return (
    <div className="space-y-3">
      {entries.map((entry, i) => (
        <ExerciseRow key={i}
          exercise={entry.exercise}
          settingsNote={noteByEx[entry.exercise] ?? ""}
          sessionNotes={entry.sessionNotes}
          onSessionNotesChange={(v) => update(i, { sessionNotes: v })}
          availableExercises={readOnly ? undefined : availableForRow(i)}
          onExerciseChange={(v) => { if (v) update(i, { exercise: v, sessionNotes: entries[i].sessionNotes }); }}
          onRemove={readOnly ? undefined : () => onChange(entries.filter((_, j) => j !== i))}
          readOnly={readOnly}
          date={date}
          audioUrl={entry.audioUrl}
          onAudioSaved={(url) => update(i, { audioUrl: url })}
        />
      ))}
      {!readOnly && canAdd && (
        <button type="button" onClick={addExercise}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <Plus className="h-4 w-4" />Add exercise
        </button>
      )}
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────

export function LogForm({ initialDate, weeklyFocus, spine, focus1, focus2, focus3, existing, showWeeklyPrompt }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [, setSaved] = useState(false);
  const [weekPromptOpen, setWeekPromptOpen] = useState(showWeeklyPrompt);
  const ef = (existing?.exercises_finished ?? {}) as Record<string, unknown>;

  const savedFocuses = existing?.todays_focus?.split(" + ") ?? [];
  const initPrimary = savedFocuses[0] ?? focus1.name;
  const initSecond = savedFocuses[1] ?? null;

  const [primary, setPrimary] = useState(initPrimary);
  const [second, setSecond] = useState<string | null>(initSecond);

  const [spineEntries, setSpineEntries] = useState<ExerciseEntry[]>(() => initSpineEntries(spine.focus_ex, ef));
  const [primaryEntries, setPrimaryEntries] = useState<ExerciseEntry[]>(() => (ef?.primary ?? []) as ExerciseEntry[]);
  const [secondaryEntries, setSecondaryEntries] = useState<ExerciseEntry[]>(() => (ef?.secondary ?? []) as ExerciseEntry[]);

  const [moodStars, setMoodStars] = useState<number | null>(existing?.additional_notes?.mood_stars ?? null);
  const [focusStars, setFocusStars] = useState<number | null>(existing?.additional_notes?.focus_stars ?? null);
  const [additionalNotes, setAdditionalNotes] = useState(existing?.additional_notes?.additional_notes ?? "");
  const [practiceStarted, setPracticeStarted] = useState(!!existing);
  const [completed, setCompleted] = useState(existing?.completed ?? false);
  const completedRef = useRef(existing?.completed ?? false);
  useEffect(() => { completedRef.current = completed; }, [completed]);
  const { elapsed, start: startTimer, stop: stopTimer, setElapsed } = useTimer();
  const elapsedRef = useRef(elapsed);
  useEffect(() => { elapsedRef.current = elapsed; }, [elapsed]);

  // Sync timer to the selected day's saved duration on mount
  useEffect(() => {
    const savedDuration = existing?.additional_notes?.practice_duration;
    setElapsed(savedDuration ? durationToSeconds(savedDuration) : 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save 2s after any exercise/notes change (only when practice has started)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (!practiceStarted) return;
    clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      if (completedRef.current) return;
      const todaysFocus = second ? `${primary} + ${second}` : primary;
      await saveSession({
        date: initialDate, todaysFocus,
        spineEntries, primaryEntries, secondaryEntries,
        moodStars, focusStars, additionalNotes,
        practiceDuration: secondsToDuration(elapsedRef.current),
        completed: false,
      });
    }, 2000);
    return () => clearTimeout(autoSaveTimerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spineEntries, primaryEntries, secondaryEntries, moodStars, focusStars, additionalNotes, primary, second]);

  const focusCategoryMap: Record<string, ExerciseCategory> = {
    [focus1.name]: focus1, [focus2.name]: focus2, [focus3.name]: focus3,
  };
  const allFocusNames = [focus1.name, focus2.name, focus3.name].filter(Boolean);
  const primaryCategory = focusCategoryMap[primary];
  const secondCategory = second ? focusCategoryMap[second] : null;

  function handlePrimaryChange(val: string) {
    setPrimary(val);
    if (val === second) setSecond(null);
    setPrimaryEntries([]);
  }

  function handleSave() {
    const todaysFocus = second ? `${primary} + ${second}` : primary;
    startTransition(async () => {
      await saveSession({
        date: initialDate, todaysFocus,
        spineEntries, primaryEntries, secondaryEntries,
        moodStars, focusStars, additionalNotes,
        practiceDuration: secondsToDuration(elapsed),
        completed: true,
      });
      setSaved(true);
      setCompleted(true);
    });
  }

  return (
    <div className="space-y-6">
      {/* Week intentions prompt */}
      <Dialog open={weekPromptOpen} onOpenChange={setWeekPromptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New week — set your intentions first</DialogTitle>
            <DialogDescription>
              This is your first session of the week. Take a moment to write down your focus goals before you dive in.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-2">
            <a href={`/week?date=${initialDate}`}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Go to Week Log
            </a>
            <button onClick={() => setWeekPromptOpen(false)}
              className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-muted">
              Continue anyway
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Week strip date nav */}
      <WeekStrip selectedDate={initialDate} onDateChange={(d) => { stopTimer(); router.push(`/log?date=${d}`); }} />

      {/* Weekly focus summary */}
      {weeklyFocus.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">This week&apos;s focus</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {weeklyFocus.map(({ label, notes }) => (
              <div key={label}><span className="text-sm font-medium">{label}</span>{notes && <span className="text-sm text-muted-foreground"> — {notes}</span>}</div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Focus selector */}
      <div className="space-y-2">
        <Label>Today&apos;s focus</Label>
        {completed ? (
          <p className="text-sm font-medium">
            {primary}{second ? ` + ${second}` : ""}
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Select value={primary} onValueChange={(v) => { if (v) handlePrimaryChange(v); }}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {allFocusNames.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                <SelectItem value="Skipped">Skipped</SelectItem>
              </SelectContent>
            </Select>
            {second !== null ? (
              <>
                <span className="text-sm text-muted-foreground">+</span>
                <Select value={second} onValueChange={(v) => { if (v) { setSecond(v); setSecondaryEntries([]); } }}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {allFocusNames.filter((n) => n !== primary).map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
                <button type="button" onClick={() => { setSecond(null); setSecondaryEntries([]); }}
                  className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              </>
            ) : (
              primary !== "Skipped" && allFocusNames.filter((n) => n !== primary).length > 0 && (
                <button type="button" onClick={() => setSecond(allFocusNames.find((n) => n !== primary) ?? null)}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                  <Plus className="h-4 w-4" />Add second focus
                </button>
              )
            )}
          </div>
        )}
      </div>

      {/* Timer */}
      <div className="space-y-2">
        <Label>Practice timer{!completed && <span className="text-xs font-normal text-muted-foreground"> (click to edit when stopped)</span>}</Label>
        <PracticeTimer readOnly={completed} />
      </div>

      {/* Start practice button — only for new sessions */}
      {!practiceStarted && (
        <button
          type="button"
          onClick={() => { setPracticeStarted(true); startTimer(); }}
          className="w-full rounded-lg py-3 text-sm font-medium transition-transform hover:-translate-y-0.5"
          style={{ background: "var(--brand)", color: "#fff" }}
        >
          Start practice
        </button>
      )}

      {/* Session complete banner */}
      {completed && (
        <div className="flex items-center justify-between rounded-lg px-4 py-3 text-sm"
          style={{ background: "color-mix(in srgb, var(--success) 15%, var(--bg-content))", border: "1px solid var(--success)" }}>
          <span className="font-medium" style={{ color: "var(--success)" }}>Session saved ✓</span>
          <button type="button" onClick={() => setCompleted(false)}
            className="text-muted-foreground hover:text-foreground">
            Edit
          </button>
        </div>
      )}

      {practiceStarted && (
        <div className="space-y-6">
          <Separator />

          {/* Spine — all active exercises */}
          <div className="space-y-3">
            <h2 className="text-base font-semibold">Spine</h2>
            {spine.focus_ex.length === 0 ? (
              <p className="text-sm text-muted-foreground">No spine exercises configured yet.</p>
            ) : (
              spineEntries.map((entry, i) => (
                <ExerciseRow key={entry.exercise}
                  exercise={entry.exercise}
                  settingsNote={spine.notes[spine.focus_ex.indexOf(entry.exercise)] ?? ""}
                  sessionNotes={entry.sessionNotes}
                  onSessionNotesChange={(v) => setSpineEntries((prev) => prev.map((e, j) => j === i ? { ...e, sessionNotes: v } : e))}
                  readOnly={completed}
                  date={initialDate}
                  audioUrl={entry.audioUrl}
                  onAudioSaved={(url) => setSpineEntries((prev) => prev.map((e, j) => j === i ? { ...e, audioUrl: url } : e))}
                />
              ))
            )}
          </div>

          <Separator />

          {/* Primary focus */}
          {primary === "Skipped" ? (
            <p className="text-sm text-muted-foreground">No worries — try to get some practice in later this week.</p>
          ) : primaryCategory ? (
            <div className="space-y-3">
              <h2 className="text-base font-semibold">{primary}</h2>
              <FocusSection category={primaryCategory} entries={primaryEntries} onChange={setPrimaryEntries} readOnly={completed} date={initialDate} />
            </div>
          ) : null}

          {/* Secondary focus */}
          {secondCategory && (
            <>
              <Separator />
              <div className="space-y-3">
                <h2 className="text-base font-semibold">{second}</h2>
                <FocusSection category={secondCategory} entries={secondaryEntries} onChange={setSecondaryEntries} readOnly={completed} date={initialDate} />
              </div>
            </>
          )}

          <Separator />

          {/* Session notes */}
          <div className="space-y-5">
            <h2 className="text-base font-semibold">Session notes</h2>
            <div className="space-y-1"><Label>Mood</Label><StarRating value={moodStars} onChange={setMoodStars} readOnly={completed} /></div>
            <div className="space-y-1"><Label>Focus</Label><StarRating value={focusStars} onChange={setFocusStars} readOnly={completed} /></div>
            <div className="space-y-1">
              <Label>Additional notes</Label>
              {completed
                ? additionalNotes
                  ? <p className="text-sm">{additionalNotes}</p>
                  : <p className="text-xs text-muted-foreground italic">No notes</p>
                : <Textarea placeholder="Anything else worth noting?" rows={3} value={additionalNotes} onChange={(e) => setAdditionalNotes(e.target.value)} />
              }
            </div>
          </div>

          {!completed && (
            <div className="flex items-center gap-3 pb-4">
              <Button onClick={handleSave} disabled={isPending}>{isPending ? "Saving…" : "Save session"}</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
