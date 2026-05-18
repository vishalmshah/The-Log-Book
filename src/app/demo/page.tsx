import Link from "next/link";
import { DashboardClient } from "@/app/dashboard/dashboard-client";
import { PageContainer } from "@/components/page-container";
import { buildFocusColorMap } from "@/lib/focus-colors";
import { DEMO_SESSIONS, DEMO_FOCUS_NAMES } from "@/lib/demo-data";

export default function DemoPage() {
  const focusColorMap = buildFocusColorMap(DEMO_FOCUS_NAMES);
  return (
    <PageContainer wide>
      <div
        className="mb-4 flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm"
        style={{ background: "var(--brand-soft)", borderColor: "var(--brand)", color: "var(--brand)" }}
      >
        <span>You&apos;re viewing a demo with sample data.</span>
        <Link href="/login" className="font-medium underline">Sign up free →</Link>
      </div>
      <DashboardClient
        sessions={DEMO_SESSIONS}
        focusNames={DEMO_FOCUS_NAMES}
        focusColorMap={focusColorMap}
      />
    </PageContainer>
  );
}
