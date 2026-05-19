"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="space-y-4 text-center">
        <h2 className="font-display text-5xl" style={{ color: "var(--brand)" }}>
          Something went wrong
        </h2>
        <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
          An unexpected error occurred.
        </p>
        <button
          onClick={reset}
          className="rounded-lg px-5 py-2 text-sm font-medium text-white"
          style={{ background: "var(--brand)" }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
