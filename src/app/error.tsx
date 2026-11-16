"use client";

import { ErrorPanel } from "@/components/error-panel";

/**
 * A page that failed to render (e.g. MongoDB unreachable). The header stays, as the root layout is
 * above this boundary; Try again calls `retry()`, which re-fetches and re-renders the segment.
 */
export default function ErrorPage({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return <ErrorPanel error={error} retry={retry} />;
}
