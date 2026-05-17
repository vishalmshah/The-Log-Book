import type { Metadata } from "next";
import { VT323, Karla } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { TimerProvider, FloatingTimer } from "@/components/timer-context";
import { NavBar } from "@/components/nav";
import { Header } from "@/components/header";
import "./globals.css";

const displayFont = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-vt323",
  display: "swap",
});

const bodyFont = Karla({
  subsets: ["latin"],
  variable: "--font-karla",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Music Practice",
  description: "Track your daily practice sessions",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full text-foreground">
        <TimerProvider>
          <ThemeProvider>
            <NavBar />
            <div className="flex flex-1 flex-col md:ml-52">
              <Header />
              <main className="flex-1 pb-16 md:pb-0">
                {children}
              </main>
            </div>
            <FloatingTimer />
          </ThemeProvider>
        </TimerProvider>
      </body>
    </html>
  );
}
