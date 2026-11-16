import { CircleAlert, RotateCcw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/** The content of the error pages: what happened, the digest for the server logs, Try again. */
export function ErrorPanel({
  error,
  retry,
}: {
  error: unknown;
  retry(): void;
}) {
  // Server errors reach the client without their message, only with a digest matching the logs.
  const digest =
    error instanceof Error &&
    "digest" in error &&
    typeof error.digest === "string"
      ? error.digest
      : null;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Alert variant="destructive">
        <CircleAlert />
        <AlertTitle>Something went wrong</AlertTitle>
        <AlertDescription>
          <p>
            The page could not be loaded. If MongoDB is unavailable, start it
            and try again.
          </p>
          {digest && (
            <p>
              Error digest: <code className="font-mono">{digest}</code>
            </p>
          )}
        </AlertDescription>
      </Alert>
      <Button onClick={() => retry()}>
        <RotateCcw />
        Try again
      </Button>
    </div>
  );
}
