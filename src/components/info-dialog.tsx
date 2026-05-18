"use client";

import { useState, useEffect } from "react";
import { Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { FEATURES } from "@/lib/features";

const STORAGE_KEY = "logbook_info_seen";

export function InfoDialog() {
  const [open, setOpen] = useState(false);

  // Auto-open on first visit
  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setOpen(true);
    }
  }, []);

  function handleOpenChange(next: boolean) {
    if (!next) {
      localStorage.setItem(STORAGE_KEY, "true");
    }
    setOpen(next);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted"
        aria-label="How it works"
      >
        <Info className="h-4 w-4" style={{ color: "var(--fg-muted)" }} />
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-3xl" style={{ color: "var(--brand)" }}>
              How it works
            </DialogTitle>
          </DialogHeader>

          {/* Intro */}
          <div className="space-y-2 text-sm leading-relaxed" style={{ color: "var(--fg-primary)" }}>
            <p>
              When you are on a busy schedule, highly structured music practice can feel cumbersome and boring. At the same time, loose &ldquo;practice&rdquo; on an irregular schedule can make it hard to know what to do, and can also make you feel unsatisfied with your progress.
            </p>
            <p>
              This is an opinionated music practice app, meaning that you can modify the routine to your goals, but the structure of this app follows a specific pre-defined method. The focus of this method is <strong>consistency</strong>. We believe in <em>frequency over volume</em>. As a result, a program of this type can be run in very little time (&lt;15 mins) or until your fingers start bleeding.
            </p>
          </div>

          {/* Feature sections */}
          <div className="space-y-4">
            {FEATURES.map(({ title, symbol, paras, tip }) => (
              <div
                key={title}
                className="rounded-lg border p-4"
                style={{ borderColor: "var(--border-color)", background: "var(--bg-card)" }}
              >
                <div className="flex items-start gap-3">
                  <span className="shrink-0 font-display text-3xl leading-none" style={{ color: "var(--brand)" }}>
                    {symbol}
                  </span>
                  <div className="space-y-1.5 text-sm leading-relaxed" style={{ color: "var(--fg-primary)" }}>
                    <p className="font-semibold">{title}</p>
                    {paras.map((p, i) => <p key={i}>{p}</p>)}
                    {tip && (
                      <p>
                        <strong>Tip:</strong> {tip}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Final thoughts */}
          <div className="space-y-2 text-sm leading-relaxed" style={{ color: "var(--fg-primary)" }}>
            <p>
              As you can might have noticed, there&rsquo;s a lot of flexibility in this routine, but there&rsquo;s enough structure to make sure that practices are worthwhile. Each exercise can be as structured (practice major triads up and down the guitar neck) or as unstructured (noodle on A minor blues and practice your guitar face) as you would like. Everyone has their own balance, and this app is adjustable to how much <em>you</em> want to put into practice at any given time.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
