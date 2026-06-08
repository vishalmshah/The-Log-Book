"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CalendarDays, Music2, Settings } from "lucide-react";

const tabs = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/week", icon: CalendarDays, label: "Start Week" },
  { href: "/log", icon: Music2, label: "Log Session" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function NavBar() {
  const pathname = usePathname();
  if (pathname === "/" || pathname === "/login" || pathname.startsWith("/auth")) return null;

  return (
    <>
      {/* ── Mobile: bottom tab bar ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex min-h-16 items-stretch border-t pb-[env(safe-area-inset-bottom)] md:hidden"
        style={{ background: "var(--bg-content)", borderColor: "var(--border-color)" }}>
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link key={href} href={href}
              className="flex flex-1 touch-manipulation flex-col items-center justify-center gap-1 pb-2 pt-3 text-xs transition-transform duration-100 active:scale-90"
              style={{
                color: active ? "var(--brand)" : "var(--fg-muted)",
                WebkitTapHighlightColor: "transparent",
              }}>
              <Icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : "stroke-[1.5]"}`} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ── Desktop: left sidebar ── */}
      <nav className="fixed left-0 top-0 z-50 hidden h-full w-52 flex-col gap-1 border-r px-3 pt-5 md:flex"
        style={{ background: "var(--bg-content)", borderColor: "var(--border-color)" }}>
        <p className="mb-4 px-3 font-display text-xl -rotate-1 text-center leading-tight" style={{ color: "var(--brand)" }}>
          The<br />Log<br />Book
        </p>
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link key={href} href={href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
              style={{
                background: active ? "var(--brand-soft)" : "transparent",
                color: active ? "var(--brand)" : "var(--fg-muted)",
                fontWeight: active ? 600 : 400,
              }}>
              <Icon className={`h-4 w-4 shrink-0 ${active ? "stroke-[2.5]" : "stroke-[1.5]"}`} />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
