import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

/**
 * A button's label that swaps to a spinner while `pending`. The label stays in place, only hidden,
 * so the button keeps its width; the parent button needs `relative`.
 */
export function PendingContent({
  pending,
  children,
}: {
  pending: boolean;
  children: ReactNode;
}) {
  return (
    <>
      <span
        className={cn(
          "inline-flex items-center gap-[inherit]",
          pending && "invisible",
        )}
      >
        {children}
      </span>
      {pending && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner />
        </span>
      )}
    </>
  );
}

/** A `Button` that is disabled and shows a spinner, at its usual width, while `pending`. */
export function PendingButton({
  pending,
  disabled,
  className,
  children,
  ...props
}: ComponentProps<typeof Button> & { pending: boolean }) {
  return (
    <Button
      {...props}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={cn("relative", className)}
    >
      <PendingContent pending={pending}>{children}</PendingContent>
    </Button>
  );
}
