"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { TableRow } from "@/components/ui/table";

// Controls inside the row keep their own click behaviour.
const INTERACTIVE = "a, button, input, label, [role=switch]";

/**
 * A table row that opens `href` when clicked anywhere outside its controls. Keyboard users reach
 * the same page through the link in the row.
 */
export function LinkRow({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  const router = useRouter();

  return (
    <TableRow
      className="cursor-pointer"
      onClick={(event) => {
        const target = event.target as Element;
        // React bubbles events out of portals (e.g. a confirmation dialog) by component tree; only
        // clicks that really happened inside the row count.
        if (!event.currentTarget.contains(target)) return;
        if (target.closest(INTERACTIVE)) return;
        // Ending a drag-selection of text (e.g. copying a key) is not a click on the row.
        if (window.getSelection()?.toString()) return;
        router.push(href);
      }}
    >
      {children}
    </TableRow>
  );
}
