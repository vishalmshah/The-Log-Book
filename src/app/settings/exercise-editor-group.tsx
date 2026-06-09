"use client";

import { useId, useRef, useState } from "react";
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { saveExercises } from "@/lib/actions";
import { ExerciseEditor, type Category, type RowWithUid, type SaveStatus } from "./editor";

type CategoryKey = "spine" | "focus_1" | "focus_2" | "focus_3";
const CATEGORY_KEYS: CategoryKey[] = ["spine", "focus_1", "focus_2", "focus_3"];

function makeRows(c: Category): RowWithUid[] {
  return c.all_ex.map((ex, i) => ({
    ex,
    focused: c.focus_bool[i] ?? false,
    starred: c.starred_bool?.[i] ?? false,
    note: c.notes[i] ?? "",
    _uid: crypto.randomUUID(),
  }));
}

export function ExerciseEditorGroup({
  spine,
  focus_1,
  focus_2,
  focus_3,
}: {
  spine: Category;
  focus_1: Category;
  focus_2: Category;
  focus_3: Category;
}) {
  const categories: Record<CategoryKey, Category> = { spine, focus_1, focus_2, focus_3 };

  const [rowsByCategory, setRowsByCategory] = useState<Record<CategoryKey, RowWithUid[]>>(() => ({
    spine: makeRows(spine),
    focus_1: makeRows(focus_1),
    focus_2: makeRows(focus_2),
    focus_3: makeRows(focus_3),
  }));
  const rowsRef = useRef(rowsByCategory);
  rowsRef.current = rowsByCategory;

  const [statusByCategory, setStatusByCategory] = useState<Record<CategoryKey, SaveStatus>>({
    spine: "idle",
    focus_1: "idle",
    focus_2: "idle",
    focus_3: "idle",
  });

  const timersRef = useRef<Record<CategoryKey, ReturnType<typeof setTimeout> | undefined>>({
    spine: undefined,
    focus_1: undefined,
    focus_2: undefined,
    focus_3: undefined,
  });

  function triggerSave(key: CategoryKey) {
    setStatusByCategory((prev) => ({ ...prev, [key]: "saving" }));
    clearTimeout(timersRef.current[key]);
    timersRef.current[key] = setTimeout(async () => {
      try {
        await saveExercises(key, categories[key].name, rowsRef.current[key]);
        setStatusByCategory((prev) => ({ ...prev, [key]: "saved" }));
      } catch {
        setStatusByCategory((prev) => ({ ...prev, [key]: "error" }));
        setTimeout(
          () => setStatusByCategory((prev) => ({ ...prev, [key]: "idle" })),
          2000
        );
      }
    }, 800);
  }

  function handleRowsChange(key: CategoryKey, newRows: RowWithUid[]) {
    setRowsByCategory((prev) => ({ ...prev, [key]: newRows }));
    triggerSave(key);
  }

  function findCategory(uid: string): CategoryKey | null {
    for (const key of CATEGORY_KEYS) {
      if (rowsByCategory[key].some((r) => r._uid === uid)) return key;
    }
    return null;
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const dndId = useId();

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    if (active.id === over.id) return;

    const fromKey = findCategory(active.id as string);
    if (!fromKey) return;

    const overId = over.id as string;
    let toKey: CategoryKey;
    let toIndex: number;

    if ((CATEGORY_KEYS as string[]).includes(overId)) {
      // Hovered the container itself (empty list or bottom edge)
      toKey = overId as CategoryKey;
      toIndex = rowsByCategory[toKey].length;
    } else {
      const cat = findCategory(overId);
      if (!cat) return;
      toKey = cat;
      toIndex = rowsByCategory[toKey].findIndex((r) => r._uid === overId);
      if (toIndex === -1) return;
    }

    if (fromKey === toKey) {
      setRowsByCategory((prev) => {
        const fromIndex = prev[fromKey].findIndex((r) => r._uid === active.id);
        if (fromIndex === -1) return prev;
        return { ...prev, [fromKey]: arrayMove(prev[fromKey], fromIndex, toIndex) };
      });
      triggerSave(fromKey);
    } else {
      setRowsByCategory((prev) => {
        const fromRows = prev[fromKey];
        const fromIndex = fromRows.findIndex((r) => r._uid === active.id);
        if (fromIndex === -1) return prev;
        const moved = fromRows[fromIndex];
        const newFromRows = [...fromRows.slice(0, fromIndex), ...fromRows.slice(fromIndex + 1)];
        const toRows = prev[toKey];
        const newToRows = [...toRows.slice(0, toIndex), moved, ...toRows.slice(toIndex)];
        return { ...prev, [fromKey]: newFromRows, [toKey]: newToRows };
      });
      triggerSave(fromKey);
      triggerSave(toKey);
    }
  }

  const cardConfig: { key: CategoryKey; title: string; desc: string; showStarred: boolean }[] = [
    { key: "spine", title: "Spine Exercises", desc: "Done every session regardless of focus mode.", showStarred: false },
    { key: "focus_1", title: `${focus_1.name} Exercises`, desc: "Check up to 3 exercises to include in this focus mode.", showStarred: true },
    { key: "focus_2", title: `${focus_2.name} Exercises`, desc: "Check up to 3 exercises to include in this focus mode.", showStarred: true },
    { key: "focus_3", title: `${focus_3.name} Exercises`, desc: "Check up to 3 exercises to include in this focus mode.", showStarred: true },
  ];

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCorners}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        {cardConfig.map(({ key, title, desc, showStarred }) => (
          <Card key={key}>
            <CardHeader>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <ExerciseEditor
                rows={rowsByCategory[key]}
                onRowsChange={(newRows) => handleRowsChange(key, newRows)}
                fieldName={key}
                showStarred={showStarred}
                saveStatus={statusByCategory[key]}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </DndContext>
  );
}
