"use client";

import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { usePageAlert } from "@/components/page-alert";
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
// The clock module directly: the domain index also pulls in `node:zlib`, which browsers lack.
import { systemClock } from "@/domain/clock";
import { resetData } from "@/lib/api-client";
import { resetToast } from "@/lib/toast-messages";

/**
 * Dev-stack tool: deletes every flag and sticky assignment through `POST /api/test/reset` after a
 * confirmation, then shows the empty flags list. Rendered only when test endpoints are enabled.
 */
export function ResetButton() {
  const router = useRouter();
  const pageAlert = usePageAlert();
  const [confirming, setConfirming] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [navigating, startNavigation] = useTransition();
  const pending = resetting || navigating;

  async function reset() {
    setResetting(true);
    pageAlert.clear();
    const result = await resetData(systemClock.now());
    setResetting(false);
    if (!result.ok) {
      setConfirming(false);
      pageAlert.show({ title: "Could not reset", description: result.error });
      return;
    }
    showSuccessToast(resetToast(result.now));
    startNavigation(() => {
      setConfirming(false);
      router.push("/");
      router.refresh();
    });
  }

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setConfirming(true)}
      >
        <RotateCcw />
        Reset
      </Button>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset all flags?</AlertDialogTitle>
            <AlertDialogDescription>
              Every flag and sticky assignment is deleted. Audit history, users
              and cohorts are kept. Seed flags return on the next{" "}
              <code className="font-mono">npm run seed</code>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="relative"
              disabled={pending}
              aria-busy={pending || undefined}
              onClick={() => void reset()}
            >
              <PendingContent pending={pending}>Reset</PendingContent>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
