import { CircleAlert, X } from "lucide-react";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/** A destructive Alert explaining a failed action; dismissible when `onDismiss` is given. */
export function ErrorAlert({
  title,
  description,
  onDismiss,
  className,
}: {
  title: string;
  description?: string;
  onDismiss?(): void;
  className?: string;
}) {
  return (
    <Alert variant="destructive" className={className}>
      <CircleAlert />
      <AlertTitle>{title}</AlertTitle>
      {description && <AlertDescription>{description}</AlertDescription>}
      {onDismiss && (
        <AlertAction>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Dismiss"
            onClick={onDismiss}
          >
            <X />
          </Button>
        </AlertAction>
      )}
    </Alert>
  );
}
