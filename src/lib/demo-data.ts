import { getISOWeek } from "@/lib/week";

interface Session {
  date: string;
  todays_focus: string;
  week: number;
  year: number;
  completed: boolean;
  additional_notes: { practice_duration: string; mood_stars: number; focus_stars: number } | null;
}

export const DEMO_FOCUS_NAMES = ["Guitar", "Voice", "Creative"];

function hms(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

// [daysBack, focus, mins, mood_stars, focus_stars]
const RAW: [number, string, number, number, number][] = [
  // Current week
  [0,  "Guitar",            25, 4, 4],
  // Week -1
  [1,  "Voice",             30, 3, 4],
  [3,  "Guitar",            50, 4, 5],
  [5,  "Creative",          40, 4, 3],
  [7,  "Guitar",            60, 5, 5],
  // Week -2
  [9,  "Guitar",            45, 4, 4],
  [10, "Voice",             25, 4, 4],
  [11, "Free",              15, 3, 3],
  [12, "Guitar",            55, 5, 5],
  [14, "Creative",          35, 4, 4],
  // Week -3
  [15, "Guitar",            60, 4, 5],
  [17, "Voice + Creative",  45, 3, 4],
  [19, "Guitar",            40, 4, 4],
  [21, "Creative",          30, 4, 3],
  // Week -4
  [22, "Guitar",            55, 5, 5],
  [24, "Voice",             20, 3, 3],
  [26, "Guitar",            45, 4, 4],
  // Week -5
  [29, "Creative",          35, 4, 4],
  [30, "Guitar",            50, 4, 5],
  [32, "Voice",             25, 3, 4],
  [33, "Guitar + Creative", 45, 5, 4],
  // Week -6
  [36, "Guitar",            60, 4, 5],
  [38, "Voice",             30, 3, 3],
  [39, "Creative",          40, 4, 4],
  [40, "Guitar",            55, 5, 5],
  // Week -7
  [43, "Guitar",            45, 4, 4],
  [44, "Free",              20, 3, 3],
  [46, "Voice",             25, 4, 3],
  // Week -8
  [49, "Guitar",            60, 5, 5],
  [50, "Voice",             30, 4, 4],
  [51, "Creative",          35, 4, 4],
  [52, "Guitar",            50, 4, 5],
  [54, "Guitar + Voice",    45, 5, 4],
  // Week -9
  [57, "Guitar",            55, 4, 5],
  [58, "Creative",          30, 3, 4],
  [60, "Voice",             25, 4, 3],
  [61, "Guitar",            45, 5, 4],
  // Week -10
  [63, "Creative",          40, 4, 4],
  [65, "Guitar",            60, 5, 5],
  [66, "Voice",             20, 3, 3],
  [68, "Guitar",            50, 4, 5],
  // Week -11
  [71, "Guitar",            45, 4, 4],
  [72, "Voice + Creative",  35, 4, 4],
  [74, "Guitar",            55, 5, 5],
  // Week -12
  [77, "Creative",          30, 4, 3],
  [78, "Guitar",            60, 4, 5],
  [80, "Voice",             25, 3, 4],
  [82, "Guitar",            45, 4, 4],
  // Week -13
  [85, "Guitar",            50, 5, 5],
  [87, "Creative",          35, 4, 3],
  [89, "Voice",             20, 3, 3],
];

export const DEMO_SESSIONS: Session[] = RAW.map(([daysBack, focus, mins, mood, focusStar]) => {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const { week, year } = getISOWeek(d);
  return {
    date: dateStr,
    todays_focus: focus,
    week,
    year,
    completed: true,
    additional_notes: {
      practice_duration: hms(mins),
      mood_stars: mood,
      focus_stars: focusStar,
    },
  };
});
