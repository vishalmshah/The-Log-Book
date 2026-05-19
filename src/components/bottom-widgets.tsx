"use client";

import { useState } from "react";
import { FloatingTimer } from "@/components/timer-context";
import { Metronome } from "@/components/metronome";

export function BottomWidgets() {
  const [metronomeCollapsed, setMetronomeCollapsed] = useState(true);
  return (
    <>
      <FloatingTimer metronomeCollapsed={metronomeCollapsed} />
      <Metronome onCollapseChange={setMetronomeCollapsed} />
    </>
  );
}
