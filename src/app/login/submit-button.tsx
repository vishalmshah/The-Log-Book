"use client";
import { useFormStatus } from "react-dom";

export function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md px-4 py-2.5 text-sm font-medium transition-transform hover:-translate-y-0.5 disabled:opacity-60"
      style={{ background: "var(--brand)", color: "#fff" }}
    >
      {pending ? "Sending…" : "Send magic link"}
    </button>
  );
}
