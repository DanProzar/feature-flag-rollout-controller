import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Geist } from "next/font/google";
import Link from "next/link";
import { MainNav } from "@/components/main-nav";
import { PageAlert, PageAlertProvider } from "@/components/page-alert";
import { ResetButton } from "@/components/reset-button";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { testEndpointsEnabled } from "@/server";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

// Every page reads MongoDB on each request; nothing is prerendered at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  // Pages set their own `title`; `/` (the flags list) uses the default.
  title: { template: "%s · Feature flags", default: "Flags · Feature flags" },
  description:
    "Percentage rollouts, cohorts, kill switch and sticky assignments",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      {/* Browser extensions (e.g. Grammarly) inject attributes into <body> before hydration. */}
      <body suppressHydrationWarning className="min-h-svh bg-background">
        <PageAlertProvider>
          <header className="border-b">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-8 gap-y-3 px-4 py-3">
              <Link href="/" className="font-semibold tracking-tight">
                Feature flags
              </Link>
              <MainNav />
              {/* The reset is a dev-stack tool: only where the test endpoint is served. */}
              {testEndpointsEnabled() && (
                <div className="ml-auto">
                  <ResetButton />
                </div>
              )}
            </div>
          </header>
          <main className="mx-auto max-w-5xl px-4 py-6">
            <PageAlert />
            {children}
          </main>
        </PageAlertProvider>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
