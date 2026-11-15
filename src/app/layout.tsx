import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Geist } from "next/font/google";
import Link from "next/link";
import { ActorSelect } from "@/components/actor-select";
import { getServices } from "@/server";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

// Every page reads MongoDB on each request; nothing is prerendered at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Feature-flag rollout controller",
  description:
    "Percentage rollouts, cohorts, kill switch and sticky assignments",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const users = await (await getServices()).catalog.users();

  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      {/* Browser extensions (e.g. Grammarly) inject attributes into <body> before hydration. */}
      <body suppressHydrationWarning className="min-h-svh bg-background">
        <header className="border-b">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <Link href="/" className="font-semibold tracking-tight">
              Feature flags
            </Link>
            <ActorSelect
              users={users.map(({ userId, name }) => ({ userId, name }))}
            />
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
