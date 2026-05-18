export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
];

/** Maps focus area names (in user-config order) to chart colors. */
export function buildFocusColorMap(focusNames: string[]): Record<string, string> {
  return Object.fromEntries(
    focusNames.map((name, i) => [name, CHART_COLORS[i % CHART_COLORS.length]])
  );
}

/**
 * Builds a date-string → CSS background map.
 * Single focus  → solid chart color.
 * Dual focus    → left/right split gradient.
 */
export function buildDayColors(
  sessions: { date: string; todays_focus: string }[],
  focusColorMap: Record<string, string>
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const s of sessions) {
    if (!s.todays_focus) continue;
    // Free (or legacy "Skipped") days get a neutral muted color
    if (s.todays_focus === "Free" || s.todays_focus === "Skipped") {
      map[s.date] = "var(--fg-muted)";
      continue;
    }
    const areas = s.todays_focus.split(" + ");
    if (areas.length === 1) {
      map[s.date] = focusColorMap[areas[0]] ?? "var(--brand)";
    } else {
      const c1 = focusColorMap[areas[0]] ?? CHART_COLORS[0];
      const c2 = focusColorMap[areas[1]] ?? CHART_COLORS[1];
      map[s.date] = `linear-gradient(to right, ${c1} 50%, ${c2} 50%)`;
    }
  }
  return map;
}
