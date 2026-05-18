import { sendMagicLink } from "@/lib/actions";
import { SiteFooter } from "@/components/site-footer";

interface Props {
  searchParams: Promise<{ message?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const { message, error } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Centered form area */}
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm space-y-8">

          {/* App name */}
          <div className="space-y-2 text-center">
            <h1 className="-rotate-1 inline-block font-display text-7xl"
              style={{ color: "var(--brand)" }}>
              The Log Book
            </h1>
            <p className="text-base" style={{ color: "var(--fg-muted)" }}>
              An opinionated music practice tracker
            </p>
          </div>

          {/* Card */}
          <div className="rounded-[var(--radius-lg)] border p-6 space-y-4"
            style={{
              background: "var(--bg-content)",
              borderColor: "var(--border-color)",
              boxShadow: "0 8px 32px -8px color-mix(in srgb, var(--brand) 20%, transparent)",
            }}>
            <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
              Enter your email to receive a sign-in link.
            </p>

            <form action={sendMagicLink} className="space-y-3">
              <input
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
                style={{
                  background: "var(--bg-card)",
                  borderColor: "var(--border-color)",
                  color: "var(--fg-primary)",
                }}
              />
              <button
                type="submit"
                className="w-full rounded-md px-4 py-2.5 text-sm font-medium transition-transform hover:-translate-y-0.5"
                style={{ background: "var(--brand)", color: "#fff" }}
              >
                Send magic link
              </button>
            </form>

            {message && <p className="text-center text-sm" style={{ color: "var(--fg-muted)" }}>{message}</p>}
            {error && <p className="text-center text-sm text-destructive">{error}</p>}
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
