export interface WeekInfo {
  week: number;
  year: number;
  start: Date;
  end: Date;
}

export function getISOWeek(date: Date): WeekInfo {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // Shift to nearest Thursday to determine ISO year/week
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const week =
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7
    );
  const year = d.getFullYear();

  // Monday of the input date's week
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return { week, year, start, end };
}

export function formatDateParam(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateParam(param: string | undefined): Date {
  if (param) {
    const d = new Date(param + "T12:00:00"); // noon avoids TZ-shift issues
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

export function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
