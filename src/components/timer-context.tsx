"use client";

import { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// ── Context ───────────────────────────────────────────────────────────────────

interface TimerCtx {
  elapsed: number;
  running: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
  setElapsed: (s: number) => void;
}

const TimerContext = createContext<TimerCtx | null>(null);

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimer must be inside TimerProvider");
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [elapsed, setElapsedState] = useState(0);
  const [running, setRunning] = useState(false);
  const startRef = useRef<number | null>(null);
  const baseRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const tick = useCallback(() => {
    if (!startRef.current) return;
    const total = baseRef.current + Math.floor((Date.now() - startRef.current) / 1000);
    setElapsedState(total);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = useCallback(() => {
    if (running) return;
    startRef.current = Date.now();
    setRunning(true);
    rafRef.current = requestAnimationFrame(tick);
  }, [running, tick]);

  const stop = useCallback(() => {
    if (!running) return;
    if (startRef.current) {
      baseRef.current += Math.floor((Date.now() - startRef.current) / 1000);
      startRef.current = null;
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setRunning(false);
    setElapsedState(baseRef.current);
  }, [running]);

  const reset = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startRef.current = null;
    baseRef.current = 0;
    setRunning(false);
    setElapsedState(0);
  }, []);

  const setElapsed = useCallback((s: number) => {
    baseRef.current = s;
    setElapsedState(s);
  }, []);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  return (
    <TimerContext.Provider value={{ elapsed, running, start, stop, reset, setElapsed }}>
      {children}
    </TimerContext.Provider>
  );
}

// ── Floating timer badge ──────────────────────────────────────────────────────

export function FloatingTimer() {
  const { elapsed, running } = useTimer();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  useEffect(() => { setMounted(true); }, []);

  if (!mounted || (elapsed === 0 && !running) || pathname === "/" || pathname === "/login" || pathname.startsWith("/auth")) return null;

  const mins = Math.floor(elapsed / 60).toString().padStart(2, "0");
  const secs = (elapsed % 60).toString().padStart(2, "0");

  return (
    <Link href="/log"
      className="fixed right-4 z-50 flex items-center gap-2 rounded-full border px-3 py-1.5 shadow-md font-mono text-base md:px-4 md:py-2 md:text-lg transition-transform hover:-translate-y-0.5"
      style={{
        top: "calc(3rem + env(safe-area-inset-top) + 0.5rem)",
        background: "var(--bg-content)",
        borderColor: "var(--border-color)",
        color: running ? "var(--brand)" : "var(--fg-muted)",
      }}
      title="Go to practice log"
    >
      {running && (
        <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
      )}
      {mins}:{secs}
    </Link>
  );
}
