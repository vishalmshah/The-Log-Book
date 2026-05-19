"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";
import { ChevronUp } from "lucide-react";

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_S = 0.1;

export function Metronome({ onCollapseChange }: { onCollapseChange?: (collapsed: boolean) => void }) {
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(true);

  // Notify parent when collapsed state changes (skip initial mount)
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    onCollapseChange?.(collapsed);
  }, [collapsed, onCollapseChange]);
  const [running, setRunning] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(-1);

  // UI state — each has a matching ref so the scheduler never reads stale values
  const [bpm, setBpmState] = useState(100);
  const [beatsPerBar, setBeatsPerBarState] = useState(4);
  const [beatUnit, setBeatUnit] = useState<2 | 4 | 8>(4);
  const [accentPattern, setAccentPatternState] = useState<boolean[]>([true, true, true, true]);
  const [randomMode, setRandomModeState] = useState(false);

  const bpmRef = useRef(100);
  const beatsPerBarRef = useRef(4);
  const accentPatternRef = useRef<boolean[]>([true, true, true, true]);
  const randomModeRef = useRef(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextNoteTimeRef = useRef(0);
  const currentBeatRef = useRef(0);
  const schedulerIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const tapTimestampsRef = useRef<number[]>([]);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => () => {
    clearInterval(schedulerIntervalRef.current);
    audioCtxRef.current?.close();
  }, []);

  // Setters that keep ref and state in sync
  function setBpm(val: number) {
    const v = Math.min(240, Math.max(40, Math.round(val)));
    bpmRef.current = v;
    setBpmState(v);
  }

  function setBeatsPerBar(n: number) {
    const v = Math.min(9, Math.max(1, n));
    beatsPerBarRef.current = v;
    setBeatsPerBarState(v);
    setAccentPatternState((prev) => {
      const next = v <= prev.length
        ? prev.slice(0, v)
        : [...prev, ...Array(v - prev.length).fill(true)];
      accentPatternRef.current = next;
      return next;
    });
    if (running) currentBeatRef.current = 0;
  }

  function setRandomMode(val: boolean) {
    randomModeRef.current = val;
    setRandomModeState(val);
  }

  function toggleAccent(i: number) {
    if (i === 0) return; // beat 1 always accented
    setAccentPatternState((prev) => {
      const next = prev.map((v, j) => j === i ? !v : v);
      accentPatternRef.current = next;
      return next;
    });
  }

  // Sound scheduling — reads refs only, never state
  const scheduleNote = useCallback((beat: number, time: number) => {
    const ctx = audioCtxRef.current!;
    const isAccented = beat === 0
      ? true
      : randomModeRef.current
        ? Math.random() < 0.4
        : (accentPatternRef.current[beat] ?? false);

    if (isAccented) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = beat === 0 ? 1100 : 880;
      gain.gain.setValueAtTime(beat === 0 ? 0.8 : 0.6, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.045);
    }

    const visualDelay = Math.max(0, (time - ctx.currentTime) * 1000 - 10);
    setTimeout(() => setCurrentBeat(beat), visualDelay);
  }, []);

  const runScheduler = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    while (nextNoteTimeRef.current < ctx.currentTime + SCHEDULE_AHEAD_S) {
      scheduleNote(currentBeatRef.current, nextNoteTimeRef.current);
      nextNoteTimeRef.current += 60 / bpmRef.current;
      currentBeatRef.current = (currentBeatRef.current + 1) % beatsPerBarRef.current;
    }
  }, [scheduleNote]);

  function start() {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    } else if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    currentBeatRef.current = 0;
    nextNoteTimeRef.current = audioCtxRef.current.currentTime;
    setRunning(true);
    runScheduler();
    schedulerIntervalRef.current = setInterval(runScheduler, LOOKAHEAD_MS);
  }

  function stop() {
    clearInterval(schedulerIntervalRef.current);
    setRunning(false);
    setCurrentBeat(-1);
  }

  function handleTap() {
    const now = Date.now();
    const taps = tapTimestampsRef.current;
    if (taps.length && now - taps[taps.length - 1] > 2000) {
      tapTimestampsRef.current = [];
    }
    tapTimestampsRef.current.push(now);
    if (tapTimestampsRef.current.length > 8) tapTimestampsRef.current.shift();
    const t = tapTimestampsRef.current;
    if (t.length < 2) return;
    const avg = (t[t.length - 1] - t[0]) / (t.length - 1);
    setBpm(Math.round(60000 / avg));
  }

  const pathname = usePathname();
  if (!mounted || pathname === "/" || pathname === "/login" || pathname.startsWith("/auth")) return null;

  const beatUnitSymbol = beatUnit === 8 ? "♪" : "♩";

  return (
    <div className="fixed right-4 z-50 md:!bottom-6" style={{ bottom: "calc(5rem + env(safe-area-inset-bottom))" }}>
      {/* Expanded panel — floats above the pill */}
      {!collapsed && (
        <div
          className="mb-2 w-64 rounded-[var(--radius-lg)] border shadow-lg"
          style={{ background: "var(--bg-content)", borderColor: "var(--border-color)" }}
        >
          <div
            className="flex items-center justify-between border-b px-4 py-2.5"
            style={{ borderColor: "var(--border-color)" }}
          >
            <span className="font-display text-xl" style={{ color: "var(--brand)" }}>Metronome</span>
            <button
              onClick={() => setCollapsed(true)}
              className="rounded p-1 text-muted-foreground hover:bg-muted"
            >
              <ChevronUp className="h-4 w-4" style={{ transform: "rotate(180deg)" }} />
            </button>
          </div>

          <div className="space-y-4 p-4">
            {/* BPM */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setBpm(bpm - 1)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-base font-bold hover:bg-muted"
                  style={{ borderColor: "var(--border-color)" }}
                >−</button>
                <div className="flex flex-1 flex-col items-center">
                  <span className="font-display text-4xl leading-none" style={{ color: "var(--brand)" }}>
                    {bpm}
                  </span>
                  <span className="text-xs text-muted-foreground">BPM</span>
                </div>
                <button
                  onClick={() => setBpm(bpm + 1)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-base font-bold hover:bg-muted"
                  style={{ borderColor: "var(--border-color)" }}
                >+</button>
              </div>
              <button
                onClick={handleTap}
                className="w-full rounded-md border py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted active:scale-95"
                style={{ borderColor: "var(--border-color)" }}
              >TAP TEMPO</button>
            </div>

            {/* Time signature */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Time sig:</span>
              <input
                type="number" min={1} max={9} value={beatsPerBar}
                onChange={(e) => setBeatsPerBar(Number(e.target.value))}
                className="w-12 rounded border px-2 py-1 text-center text-sm"
                style={{ borderColor: "var(--border-color)", background: "var(--bg-card)" }}
              />
              <span className="text-muted-foreground">/</span>
              <select
                value={beatUnit}
                onChange={(e) => setBeatUnit(Number(e.target.value) as 2 | 4 | 8)}
                className="rounded border px-2 py-1 text-sm"
                style={{ borderColor: "var(--border-color)", background: "var(--bg-card)" }}
              >
                <option value={2}>2</option>
                <option value={4}>4</option>
                <option value={8}>8</option>
              </select>
            </div>

            {/* Accent pattern — hidden when only 1 beat per bar */}
            {beatsPerBar > 1 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Accents</span>
                  <button
                    onClick={() => setRandomMode(!randomMode)}
                    className="rounded-full px-2.5 py-0.5 text-xs font-medium transition"
                    style={{
                      background: randomMode ? "var(--brand)" : "transparent",
                      color: randomMode ? "#fff" : "var(--fg-muted)",
                      border: `1px solid ${randomMode ? "var(--brand)" : "var(--border-color)"}`,
                    }}
                  >RANDOM</button>
                </div>
                <div className="flex gap-1">
                  {accentPattern.map((accented, i) => (
                    <button
                      key={i}
                      onClick={() => toggleAccent(i)}
                      disabled={i === 0 || randomMode}
                      className="flex h-7 flex-1 items-center justify-center rounded text-xs font-bold"
                      style={{
                        background: accented ? "var(--brand)" : "var(--bg-card)",
                        color: accented ? "#fff" : "var(--fg-muted)",
                        border: `1px solid ${accented ? "var(--brand)" : "var(--border-color)"}`,
                        opacity: i > 0 && randomMode ? 0.4 : 1,
                      }}
                    >{i + 1}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Beat indicator dots */}
            <div className="flex justify-center gap-1.5">
              {accentPattern.map((_, i) => (
                <div
                  key={i}
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    background: currentBeat === i ? "var(--brand)" : "var(--border-color)",
                    transform: currentBeat === i ? "scale(1.4)" : "scale(1)",
                    transition: "transform 0.05s, background 0.05s",
                  }}
                />
              ))}
            </div>

            {/* Start / Stop */}
            <button
              onClick={running ? stop : start}
              className="w-full rounded-lg py-2 text-sm font-medium transition-transform hover:-translate-y-0.5"
              style={{ background: running ? "var(--fg-muted)" : "var(--brand)", color: "#fff" }}
            >{running ? "■ Stop" : "▶ Start"}</button>
          </div>
        </div>
      )}

      {/* Collapsed pill — always visible */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="flex items-center gap-2 rounded-full border px-4 py-2 font-mono shadow-md transition-transform hover:-translate-y-0.5"
        style={{
          background: "var(--bg-content)",
          borderColor: "var(--border-color)",
          color: running ? "var(--brand)" : "var(--fg-muted)",
        }}
      >
        {running && <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />}
        <span className="text-sm">{beatUnitSymbol} {bpm}</span>
        <ChevronUp
          className="h-3 w-3 transition-transform"
          style={{ transform: collapsed ? "rotate(0deg)" : "rotate(180deg)" }}
        />
      </button>
    </div>
  );
}
