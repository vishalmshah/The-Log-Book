"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";

export interface DayBar { date: string; minutes: number; }
export interface FocusBar { name: string; sessions: number; }

export function DurationChart({ data }: { data: DayBar[] }) {
  if (data.every((d) => d.minutes === 0))
    return <p className="text-sm text-muted-foreground">No sessions logged yet.</p>;

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} unit="m" />
        <CartesianGrid strokeDasharray="2 4" stroke="var(--border-color)" vertical={false} />
        <Tooltip
          formatter={(v) => [`${v ?? 0} min`, "Duration"]}
          cursor={{ fill: "var(--brand-soft)" }}
          contentStyle={{ background: "var(--bg-content)", border: "1px solid var(--border-color)", borderRadius: 8, fontSize: 12, color: "var(--fg-primary)" }}
        />
        <Bar dataKey="minutes" radius={[6, 6, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.minutes > 0 ? "var(--brand)" : "var(--brand-soft)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PracticeCalendar({ practicedDates }: { practicedDates: string[] }) {
  const practiced = practicedDates.map((d) => new Date(d + "T12:00:00"));
  return (
    <Card>
      <CardContent className="flex justify-center pt-2 pb-2">
        <Calendar
          mode="multiple"
          selected={practiced}
          onSelect={() => {}}
          defaultMonth={new Date()}
        />
      </CardContent>
    </Card>
  );
}

export function FocusChart({ data }: { data: FocusBar[] }) {
  if (data.length === 0 || data.every((d) => d.sessions === 0))
    return <p className="text-sm text-muted-foreground">No sessions logged yet.</p>;

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 4 }}>
        <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={80} />
        <Tooltip
          formatter={(v) => [`${v ?? 0}`, "Sessions"]}
          cursor={{ fill: "var(--brand-soft)" }}
          contentStyle={{ background: "var(--bg-content)", border: "1px solid var(--border-color)", borderRadius: 8, fontSize: 12, color: "var(--fg-primary)" }}
        />
        <Bar dataKey="sessions" fill="var(--brand)" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
