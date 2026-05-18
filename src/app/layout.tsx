import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Karla } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { TimerProvider, FloatingTimer } from "@/components/timer-context";
import { Metronome } from "@/components/metronome";
import { NavBar } from "@/components/nav";
import { Header } from "@/components/header";
import { SWRegister } from "@/components/sw-register";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

const displayFont = localFont({
  src: "../../public/fonts/Thwack.ttf",
  variable: "--font-vt323",
  display: "swap",
});

const bodyFont = Karla({
  subsets: ["latin"],
  variable: "--font-karla",
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Log Book",
  description: "Track your daily music practice sessions",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "The Log Book" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#9B2D20" },
    { media: "(prefers-color-scheme: dark)",  color: "#C04535" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full text-foreground">
        <TimerProvider>
          <ThemeProvider>
            <SWRegister />
            <NavBar />
            <AppShell>
              <Header />
              <main className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
                {children}
              </main>
            </AppShell>
            <FloatingTimer />
            <Metronome />
          </ThemeProvider>
        </TimerProvider>
      </body>
    </html>
  );
}
