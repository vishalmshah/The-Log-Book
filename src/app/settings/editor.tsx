"use client";

import { useState, useRef, useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { saveExercises, saveFocusNames, saveWeeklyLabels, saveWeeklyGoal, signOut, deleteAccount, exportSessionsCSV, type ExerciseRow } from "@/lib/actions";
import { Trash2, Plus, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ── Shared debounce hook ──────────────────────────────────────────────────────

type SaveStatus = "idle" | "saving" | "saved" | "error";

function useDebounce(fn: () => Promise<void>, delay = 800) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [status, setStatus] = useState<SaveStatus>("idle");

  function trigger() {
    setStatus("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        await fn();
        setStatus("saved");
      } catch {
        setStatus("error");
        setTimeout(() => setStatus("idle"), 2000);
      }
    }, delay);
  }

  return { trigger, status };
}

function SaveStatus({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;
  if (status === "error") return <span className="text-xs text-destructive">Error saving</span>;
  return (
    <span className="text-xs text-muted-foreground">
      {status === "saving" ? "Saving…" : "Saved"}
    </span>
  );
}

// ── Focus names ───────────────────────────────────────────────────────────────

interface FocusNamesProps {
  initial: { focus1: string; focus2: string; focus3: string };
}

export function FocusNamesForm({ initial }: FocusNamesProps) {
  const [names, setNames] = useState(initial);
  const namesRef = useRef(names);
  namesRef.current = names;

  const { trigger, status } = useDebounce(() => saveFocusNames(namesRef.current));

  function handleChange(field: keyof typeof names, value: string) {
    setNames((prev) => ({ ...prev, [field]: value }));
    trigger();
  }

  return (
    <div className="space-y-4">
      {(["focus1", "focus2", "focus3"] as const).map((field, i) => (
        <div key={field} className="space-y-1">
          <Label htmlFor={field}>Focus {i + 1}</Label>
          <Input id={field} value={names[field]} onChange={(e) => handleChange(field, e.target.value)} />
        </div>
      ))}
      <SaveStatus status={status} />
    </div>
  );
}

// ── Weekly labels ─────────────────────────────────────────────────────────────

interface WeeklyLabelsProps {
  initial: { weekly_A: string; weekly_B: string; weekly_C: string };
}

export function WeeklyLabelsForm({ initial }: WeeklyLabelsProps) {
  const [labels, setLabels] = useState(initial);
  const labelsRef = useRef(labels);
  labelsRef.current = labels;

  const { trigger, status } = useDebounce(() => saveWeeklyLabels(labelsRef.current));

  function handleChange(field: keyof typeof labels, value: string) {
    setLabels((prev) => ({ ...prev, [field]: value }));
    trigger();
  }

  return (
    <div className="space-y-4">
      {(["weekly_A", "weekly_B", "weekly_C"] as const).map((field, i) => (
        <div key={field} className="space-y-1">
          <Label htmlFor={field}>Area {i + 1}</Label>
          <Input id={field} value={labels[field]} onChange={(e) => handleChange(field, e.target.value)} />
        </div>
      ))}
      <SaveStatus status={status} />
    </div>
  );
}

// ── Weekly goal ───────────────────────────────────────────────────────────────

export function WeeklyGoalForm({ initial }: { initial: number }) {
  const [hours, setHours] = useState(initial);
  const hoursRef = useRef(hours);
  hoursRef.current = hours;

  const { trigger, status } = useDebounce(() => saveWeeklyGoal(hoursRef.current));

  function handleChange(value: string) {
    const h = Math.max(0, Number(value) || 0);
    setHours(h);
    trigger();
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="weekly-goal">Hours per week</Label>
        <Input
          id="weekly-goal"
          type="number"
          step="0.5"
          min="0"
          value={hours}
          onChange={(e) => handleChange(e.target.value)}
        />
      </div>
      <SaveStatus status={status} />
    </div>
  );
}

// ── Account panel ─────────────────────────────────────────────────────────────

export function AccountPanel({ email }: { email: string }) {
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPendingLogout, startLogout] = useTransition();
  const [isPendingDelete, startDelete] = useTransition();
  const [isPendingExport, startExport] = useTransition();

  function handleExport() {
    startExport(async () => {
      try {
        const csv = await exportSessionsCSV();
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "practice_sessions.csv";
        a.click();
        URL.revokeObjectURL(url);
      } catch {
        alert("Export failed. Please try again.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Signed in as <span className="font-medium text-foreground">{email}</span>
      </p>

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={handleExport} disabled={isPendingExport}>
          {isPendingExport ? "Exporting…" : "Export data (CSV)"}
        </Button>
        <Button variant="outline" onClick={() => setLogoutOpen(true)}>
          Log out
        </Button>
        <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
          Delete account
        </Button>
      </div>

      {/* Log out confirmation */}
      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log out?</DialogTitle>
            <DialogDescription>You&apos;ll need a magic link to sign back in.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-2">
            <Button
              onClick={() => startLogout(() => signOut())}
              disabled={isPendingLogout}
            >
              {isPendingLogout ? "Logging out…" : "Log out"}
            </Button>
            <Button variant="ghost" onClick={() => setLogoutOpen(false)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete account confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete account?</DialogTitle>
            <DialogDescription>
              This permanently deletes your account and all practice data. There&apos;s no undo.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-2">
            <Button
              variant="destructive"
              onClick={() => startDelete(() => deleteAccount())}
              disabled={isPendingDelete}
            >
              {isPendingDelete ? "Deleting…" : "Yes, delete everything"}
            </Button>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Exercise editor ───────────────────────────────────────────────────────────

interface Category {
  name: string;
  all_ex: string[];
  focus_bool: boolean[];
  notes: string[];
}

type RowWithUid = ExerciseRow & { _uid: string };

function SortableExerciseRow({
  row,
  onChange,
  onRemove,
}: {
  row: RowWithUid;
  onChange: (patch: Partial<ExerciseRow>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row._uid });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}
      className="grid grid-cols-[1.25rem_2rem_1fr_1fr_2rem] items-center gap-2">
      <button type="button" {...attributes} {...listeners}
        className="flex cursor-grab touch-none items-center justify-center text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label="Reorder exercise">
        <GripVertical className="h-4 w-4" />
      </button>
      <Checkbox checked={row.focused} onCheckedChange={(v) => onChange({ focused: !!v })} />
      <Input value={row.ex} onChange={(e) => onChange({ ex: e.target.value })} placeholder="Exercise name" />
      <Input value={row.note} onChange={(e) => onChange({ note: e.target.value })} placeholder="Note" />
      <button type="button" onClick={onRemove}
        className="flex items-center justify-center text-muted-foreground hover:text-destructive">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ExerciseEditor({ category, fieldName }: { category: Category; fieldName: string }) {
  const [rows, setRows] = useState<RowWithUid[]>(() =>
    category.all_ex.map((ex, i) => ({
      ex,
      focused: category.focus_bool[i] ?? false,
      note: category.notes[i] ?? "",
      _uid: crypto.randomUUID(),
    }))
  );
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const { trigger, status } = useDebounce(() =>
    saveExercises(fieldName, category.name, rowsRef.current)
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function update(i: number, patch: Partial<ExerciseRow>) {
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));
    trigger();
  }

  function addRow() {
    setRows((prev) => [...prev, { ex: "", focused: false, note: "", _uid: crypto.randomUUID() }]);
    trigger();
  }

  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, j) => j !== i));
    trigger();
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setRows((prev) => {
      const oldIndex = prev.findIndex((r) => r._uid === active.id);
      const newIndex = prev.findIndex((r) => r._uid === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
    trigger();
  }

  return (
    <div className="space-y-2">
      <div className="hidden grid-cols-[1.25rem_2rem_1fr_1fr_2rem] gap-2 px-1 text-xs text-muted-foreground sm:grid">
        <span /><span>On</span><span>Exercise</span><span>Note</span><span />
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={rows.map((r) => r._uid)} strategy={verticalListSortingStrategy}>
          {rows.map((row, i) => (
            <SortableExerciseRow
              key={row._uid}
              row={row}
              onChange={(patch) => update(i, patch)}
              onRemove={() => removeRow(i)}
            />
          ))}
        </SortableContext>
      </DndContext>
      <div className="flex items-center justify-between pt-1">
        <button type="button" onClick={addRow}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <Plus className="h-4 w-4" />Add exercise
        </button>
        <SaveStatus status={status} />
      </div>
    </div>
  );
}
