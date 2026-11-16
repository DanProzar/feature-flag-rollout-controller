"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ErrorAlert } from "@/components/error-alert";
import { PendingContent } from "@/components/pending-button";
import { showSuccessToast } from "@/components/success-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteFlag } from "@/lib/api-client";
import { flagDeletedToast } from "@/lib/toast-messages";

/** A trash-bin button that deletes the flag after a confirmation, then refreshes the page. */
export function DeleteFlagButton({ flagKey }: { flagKey: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const [failure, setFailure] = useState<string | null>(null);
  const pending = deleting || refreshing;

  async function remove() {
    setDeleting(true);
    setFailure(null);
    const result = await deleteFlag(flagKey, null);
    setDeleting(false);
    if (!result.ok) {
      setFailure(result.error);
      return;
    }
    showSuccessToast(flagDeletedToast(flagKey));
    startRefresh(() => {
      setConfirming(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Delete ${flagKey}`}
        title="Delete flag"
        className="text-muted-foreground hover:text-destructive"
        onClick={() => {
          setFailure(null);
          setConfirming(true);
        }}
      >
        <Trash2 />
      </Button>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete <span className="font-mono">{flagKey}</span>?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The flag and its sticky assignments are removed, and every
              evaluation will return false with reason FLAG_NOT_FOUND. Its
              history is kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {failure && (
            <ErrorAlert
              title={`Could not delete ${flagKey}`}
              description={failure}
            />
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="relative"
              disabled={pending}
              aria-busy={pending || undefined}
              onClick={() => void remove()}
            >
              <PendingContent pending={pending}>Delete flag</PendingContent>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
