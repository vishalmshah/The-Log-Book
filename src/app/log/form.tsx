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
import { Star, X, Plus, Clock } from "lucide-react";
import { saveSession, getExerciseHistory, type ExerciseEntry } from "@/lib/actions";
import { WeekStrip } from "@/components/week-strip";

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

function PracticeTimer({ initialElapsed, onElapsedChange }: { initialElapsed: number; onElapsedChange: (s: number) => void }) {
  const [running, setRunning] = useState(false);
  const [inputVal, setInputVal] = useState(formatSecs(initialElapsed));
  const startRef = useRef<number | null>(null);
  const baseRef = useRef(initialElapsed);
  const rafRef = useRef<number | null>(null);

  function tick() {
    if (!startRef.current) return;
    const total = baseRef.current + Math.floor((Date.now() - startRef.current) / 1000);
    setInputVal(formatSecs(total)); onElapsedChange(total);
    rafRef.current = requestAnimationFrame(tick);
  }
  function start() {
    if (running) return;
    startRef.current = Date.now(); setRunning(true); rafRef.current = requestAnimationFrame(tick);
  }
  function stop() {
    if (!running) return;
    if (startRef.current) { baseRef.current += Math.floor((Date.now() - startRef.current) / 1000); startRef.current = null; }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setRunning(false); setInputVal(formatSecs(baseRef.current)); onElapsedChange(baseRef.current);
  }
  function reset() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startRef.current = null; baseRef.current = 0; setRunning(false); setInputVal("00:00"); onElapsedChange(0);
  }
  function handleBlur() {
    const secs = parseTimerInput(inputVal);
    baseRef.current = secs; setInputVal(formatSecs(secs)); onElapsedChange(secs);
  }
  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  return (
    <div className="space-y-3">
      <input type="text" value={inputVal} readOnly={running}
        onChange={(e) => setInputVal(e.target.value)} onBlur={handleBlur}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
        className={`w-28 bg-transparent font-mono text-4xl font-semibold tabular-nums outline-none ${running ? "cursor-default" : "cursor-text rounded border border-transparent focus:border-input focus:px-1"}`}
      />
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={start} disabled={running}>Start</Button>
        <Button type="button" variant="outline" size="sm" onClick={stop} disabled={!running}>Stop</Button>
        <Button type="button" variant="ghost" size="sm" onClick={reset}>Reset</Button>
      </div>
    </div>
  );
}

// ── Stars ─────────────────────────────────────────────────────────────────────

function StarRating({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const display = hovered ?? value ?? 0;
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} type="button" onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)} onMouseLeave={() => setHovered(null)}
          className="text-muted-foreground transition-colors hover:text-yellow-400">
          <Star className={`h-6 w-6 ${display >= star ? "fill-yellow-400 text-yellow-400" : ""}`} />
        </button>
      ))}
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
  return focusEx.map((ex) => ({
    exercise: ex,
    sessionNotes: saved.find((e) => e.exercise === ex)?.sessionNotes ?? "",
  }));
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ExerciseCategory { name: string; focus_ex: string[]; notes: string[]; }
interface WeeklyFocusEntry { label: string; notes: string; }
interface ExistingSession {
  todays_focus: string;
  exercises_finished: Record<string, unknown>;
  additional_notes: { mood_stars: number | null; focus_stars: number | null; additional_notes: string; practice_duration: string; };
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
  const [history, setHistory] = useState<{ date: string; notes: string }[]>([]);
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
            {history.map(({ date, notes }) => (
              <div key={date} className="space-y-0.5">
                <p className="text-xs font-medium text-muted-foreground">
                  {new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                </p>
                <p className="text-sm">{notes}</p>
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
  availableExercises, onExerciseChange, onRemove,
}: {
  exercise: string;
  settingsNote: string;
  sessionNotes: string;
  onSessionNotesChange: (v: string) => void;
  availableExercises?: string[];   // present = focus row with dropdown; absent = spine row (static)
  onExerciseChange?: (v: string) => void;
  onRemove?: () => void;
}) {
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <div className="flex items-center gap-2">
        {availableExercises ? (
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
        {onRemove && (
          <button type="button" onClick={onRemove}
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-destructive">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {settingsNote && <p className="text-xs text-muted-foreground">↳ {settingsNote}</p>}

      <Textarea placeholder="Notes for this exercise…" rows={2}
        value={sessionNotes} onChange={(e) => onSessionNotesChange(e.target.value)} />

      <HistoryDialog exercise={exercise} open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </div>
  );
}

// ── Focus section (add-on-demand) ─────────────────────────────────────────────

function FocusSection({ category, entries, onChange }: {
  category: ExerciseCategory;
  entries: ExerciseEntry[];
  onChange: (entries: ExerciseEntry[]) => void;
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
          availableExercises={availableForRow(i)}
          onExerciseChange={(v) => { if (v) update(i, { exercise: v, sessionNotes: entries[i].sessionNotes }); }}
          onRemove={() => onChange(entries.filter((_, j) => j !== i))}
        />
      ))}
      {canAdd && (
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
  const [saved, setSaved] = useState(false);
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
  const [timerElapsed, setTimerElapsed] = useState(() =>
    existing?.additional_notes?.practice_duration ? durationToSeconds(existing.additional_notes.practice_duration) : 0
  );

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
        practiceDuration: secondsToDuration(timerElapsed),
      });
      setSaved(true);
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
      <WeekStrip selectedDate={initialDate} onDateChange={(d) => router.push(`/log?date=${d}`)} />

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
      </div>

      {/* Timer */}
      <div className="space-y-2">
        <Label>Practice timer <span className="text-xs font-normal text-muted-foreground">(click to edit when stopped)</span></Label>
        <PracticeTimer initialElapsed={timerElapsed} onElapsedChange={setTimerElapsed} />
      </div>

      <Separator />

      {/* Spine — all active exercises, always shown */}
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
          <FocusSection category={primaryCategory} entries={primaryEntries} onChange={setPrimaryEntries} />
        </div>
      ) : null}

      {/* Secondary focus */}
      {secondCategory && (
        <>
          <Separator />
          <div className="space-y-3">
            <h2 className="text-base font-semibold">{second}</h2>
            <FocusSection category={secondCategory} entries={secondaryEntries} onChange={setSecondaryEntries} />
          </div>
        </>
      )}

      <Separator />

      {/* Session notes */}
      <div className="space-y-5">
        <h2 className="text-base font-semibold">Session notes</h2>
        <div className="space-y-1"><Label>Mood</Label><StarRating value={moodStars} onChange={setMoodStars} /></div>
        <div className="space-y-1"><Label>Focus</Label><StarRating value={focusStars} onChange={setFocusStars} /></div>
        <div className="space-y-1">
          <Label>Additional notes</Label>
          <Textarea placeholder="Anything else worth noting?" rows={3} value={additionalNotes} onChange={(e) => setAdditionalNotes(e.target.value)} />
        </div>
      </div>

      <div className="flex items-center gap-3 pb-4">
        <Button onClick={handleSave} disabled={isPending}>{isPending ? "Saving…" : "Save session"}</Button>
        {saved && <span className="text-sm text-muted-foreground">Saved ✓</span>}
      </div>
    </div>
  );
}
