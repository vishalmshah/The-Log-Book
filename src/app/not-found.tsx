import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="space-y-4 text-center">
        <h2 className="font-display text-5xl" style={{ color: "var(--brand)" }}>
          Page not found
        </h2>
        <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
          That page doesn&apos;t exist.
        </p>
        <Link
          href="/dashboard"
          className="inline-block rounded-lg px-5 py-2 text-sm font-medium text-white"
          style={{ background: "var(--brand)" }}
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
