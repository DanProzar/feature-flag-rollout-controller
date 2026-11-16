"use client";

import "./globals.css";
import { Geist } from "next/font/google";
import { ErrorPanel } from "@/components/error-panel";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

/**
 * Replaces the root layout when it fails, so it brings its own document, styles, font and title. The
 * light theme comes from `globals.css` (`color-scheme: light`).
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className="min-h-svh bg-background text-foreground">
        <title>Something went wrong · Feature flags</title>
        <main className="px-4 py-12">
          <ErrorPanel error={error} retry={retry} />
        </main>
      </body>
    </html>
  );
}
