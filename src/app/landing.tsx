import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { FEATURES } from "@/lib/features";

const REPO = "https://github.com/vishalmshah/music-practice-app";

export function LandingPage({ loggedIn = false }: { loggedIn?: boolean }) {
  const ctaHref = loggedIn ? "/dashboard" : "/login";
  return (
    <div className="min-h-screen">
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-6 pb-16 pt-20 text-center">
        <Link
          href={REPO}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-6 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:bg-muted"
          style={{ borderColor: "var(--border-color)", color: "var(--fg-muted)" }}
        >
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
          Free &amp; open source
        </Link>

        <h1
          className="font-display text-7xl leading-none sm:text-8xl"
          style={{ color: "var(--brand)" }}
        >
          The Log Book
        </h1>

        <p className="mt-3 text-xl font-medium" style={{ color: "var(--fg-primary)" }}>
          An opinionated music practice tracker
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={ctaHref}
            className="rounded-lg px-6 py-2.5 text-sm font-medium text-white transition-transform hover:-translate-y-0.5"
            style={{ background: "var(--brand)" }}
          >
            Start tracking →
          </Link>
          <Link
            href="/demo"
            className="rounded-lg border px-6 py-2.5 text-sm font-medium transition-transform hover:-translate-y-0.5"
            style={{ borderColor: "var(--brand)", color: "var(--brand)" }}
          >
            Try the demo →
          </Link>
          <Link
            href={REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border px-6 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
            style={{ borderColor: "var(--border-color)", color: "var(--fg-primary)" }}
          >
            View on GitHub
          </Link>
        </div>
      </section>

      {/* ── Philosophy ───────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-6 pb-12">
        <div
          className="rounded-xl border p-6"
          style={{
            background: "var(--bg-content)",
            borderColor: "var(--border-color)",
            boxShadow: "0 6px 24px -6px color-mix(in srgb, var(--brand) 15%, transparent)",
          }}
        >
          <h2 className="font-display text-3xl" style={{ color: "var(--brand)" }}>
            The idea
          </h2>
          <p className="mt-3 leading-relaxed" style={{ color: "var(--fg-primary)" }}>
            When you are on a busy schedule, highly structured music practice can feel cumbersome and boring. At the same time, loose &ldquo;practice&rdquo; on an irregular schedule can make it hard to know what to do, leaving you unsatisfied with your progress.
          </p>
          <p className="mt-3 leading-relaxed" style={{ color: "var(--fg-primary)" }}>
            This is an opinionated music practice app, meaning that you can modify the routine to your goals, but the structure of this app follows a specific pre-defined method. The focus of this method is <strong>consistency</strong>. We believe in <em>frequency over volume</em>. You can run this program in under 15 minutes or until your fingers start bleeding.
          </p>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-6 pb-12">
        <h2 className="mb-5 font-display text-4xl" style={{ color: "var(--brand)" }}>
          How it works
        </h2>

        <div className="space-y-4">
          {FEATURES.map(({ title, symbol, paras, tip }) => (
            <div
              key={title}
              className="rounded-xl border p-5"
              style={{
                background: "var(--bg-content)",
                borderColor: "var(--border-color)",
                boxShadow: "0 4px 16px -4px color-mix(in srgb, var(--brand) 12%, transparent)",
              }}
            >
              <div className="flex items-start gap-4">
                <span className="mt-0.5 shrink-0 font-display text-4xl leading-none" style={{ color: "var(--brand)" }}>
                  {symbol}
                </span>
                <div className="space-y-2">
                  <h3 className="text-base font-semibold" style={{ color: "var(--fg-primary)" }}>
                    {title}
                  </h3>
                  {paras.map((para, i) => (
                    <p key={i} className="leading-relaxed" style={{ color: "var(--fg-primary)" }}>
                      {para}
                    </p>
                  ))}
                  {tip && (
                    <p className="leading-relaxed" style={{ color: "var(--fg-primary)" }}>
                      <strong>Tip:</strong> {tip}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final thoughts ───────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-6 pb-12">
        <div
          className="rounded-xl border p-6"
          style={{
            background: "var(--bg-content)",
            borderColor: "var(--border-color)",
            boxShadow: "0 6px 24px -6px color-mix(in srgb, var(--brand) 15%, transparent)",
          }}
        >
          <h2 className="font-display text-3xl" style={{ color: "var(--brand)" }}>
            Final thoughts
          </h2>
          <p className="mt-3 leading-relaxed" style={{ color: "var(--fg-primary)" }}>
            As you can might have noticed, there&rsquo;s a lot of flexibility in this routine, but there&rsquo;s enough structure to make sure that practices are worthwhile. Each exercise can be as structured (practice major triads up and down the guitar neck) or as unstructured (noodle on A minor blues and practice your guitar face) as you would like. Everyone has their own balance, and this app is adjustable to how much <em>you</em> want to put into practice at any given time.
          </p>
          <p className="mt-3 leading-relaxed" style={{ color: "var(--fg-primary)" }}>
            If you have any thoughts or suggestions, feel free to{" "}
            <Link href={REPO + "/issues"} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:opacity-70">
              raise a GitHub issue
            </Link>
            {" "}or contact me directly on{" "}
            <Link href="https://www.instagram.com/signal_path_sketches/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:opacity-70">
              Instagram
            </Link>
            {" "}or{" "}
            <Link href="https://www.linkedin.com/in/vishalmanishshah/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:opacity-70">
              LinkedIn
            </Link>.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={ctaHref}
              className="inline-block rounded-lg px-6 py-2.5 text-sm font-medium text-white transition-transform hover:-translate-y-0.5"
              style={{ background: "var(--brand)" }}
            >
              Get started →
            </Link>
            <Link
              href="/demo"
              className="inline-block rounded-lg border px-6 py-2.5 text-sm font-medium transition-transform hover:-translate-y-0.5"
              style={{ borderColor: "var(--brand)", color: "var(--brand)" }}
            >
              Try the demo →
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
