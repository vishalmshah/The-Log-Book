"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { getStreak } from "@/lib/actions";
import { InfoDialog } from "@/components/info-dialog";

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/week": "Start Week",
  "/log": "Log Session",
  "/settings": "Settings",
};

export function Header() {
  const pathname = usePathname();
  const { setTheme, resolvedTheme } = useTheme();
  const [streak, setStreak] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (pathname === "/" || pathname === "/login" || pathname.startsWith("/auth")) return;
    getStreak().then(setStreak).catch(() => setStreak(null));
  }, [pathname]);

  const title = TITLES[pathname] ?? "";
  const isDark = resolvedTheme === "dark";

  if (pathname === "/" || pathname === "/login" || pathname.startsWith("/auth")) return null;

  return (
    <header
      className="sticky top-0 z-40 flex h-12 items-center border-b px-4 backdrop-blur-sm"
      style={{ background: "color-mix(in srgb, var(--bg-content) 85%, transparent)", borderColor: "var(--border-color)" }}
    >
      <div className="flex flex-1 items-center justify-between">
        {/* Left: app name — mobile only (sidebar shows it on desktop) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="The Log Book" className="md:hidden h-7 w-auto"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/logo.png"; }} />

        {/* Center: page title */}
        <span className="text-xs font-medium text-muted-foreground">{title}</span>

        {/* Right: streak + info + theme toggle */}
        <div className="flex items-center gap-3">
          {streak !== null && streak > 0 && (
            <span className="text-sm font-medium">🔥 {streak}</span>
          )}
          {mounted && <InfoDialog />}
          {mounted && (
            <button
              type="button"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
