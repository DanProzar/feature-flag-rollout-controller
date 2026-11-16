import type { ReactNode } from "react";

/** A route's loading skeleton: busy for assistive technology, announced as "Loading…". */
export function LoadingRegion({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div aria-busy="true" aria-live="polite" className={className}>
      <span className="sr-only">Loading…</span>
      {children}
    </div>
  );
}
