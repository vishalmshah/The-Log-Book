"use client";

import { usePathname } from "next/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Only apply sidebar offset on app routes (not landing, login, or auth)
  const hasSidebar = pathname !== "/"
    && !pathname.startsWith("/login")
    && !pathname.startsWith("/auth");
  return (
    <div className={`flex flex-1 flex-col ${hasSidebar ? "md:ml-52" : ""}`}>
      {children}
    </div>
  );
}
