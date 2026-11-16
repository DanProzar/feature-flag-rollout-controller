"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { usePageAlert } from "@/components/page-alert";
import { PendingContent } from "@/components/pending-button";
import { showSuccessToast } from "@/components/success-toast";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { Flag } from "@/domain";
import { putFlag } from "@/lib/api-client";
import { formToPutBody } from "@/lib/flag-form";
import { killSwitchToast } from "@/lib/toast-messages";

/**
 * The flag's kill switch: on = live, off = killed. Killing asks for confirmation; going live again
 * applies at once. Either way the whole current flag is PUT with only `enabled` changed. A failure
 * closes the dialog and shows the page-level Alert, as rows and headers have no room for one.
 */
export function KillSwitch({
  flag,
  showLabel = true,
}: {
  flag: Flag;
  showLabel?: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const pageAlert = usePageAlert();
  const id = `kill-switch-${flag.key}`;

  async function save(enabled: boolean) {
    setPending(true);
    pageAlert.clear();
    const result = await putFlag(
      flag.key,
      formToPutBody({ ...flag, enabled }),
      null,
    );
    setPending(false);
    setConfirming(false);
    if (!result.ok) {
      pageAlert.show({
        title: enabled
          ? `Could not turn ${flag.key} back on`
          : `Could not kill ${flag.key}`,
        description: result.error,
      });
      return;
    }
    showSuccessToast(killSwitchToast(flag.key, enabled));
    router.refresh();
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Switch
          id={id}
          checked={flag.enabled}
          disabled={pending}
          aria-label={showLabel ? undefined : `${flag.key} live`}
          onCheckedChange={(checked) => {
            if (checked) void save(true);
            else setConfirming(true);
          }}
        />
        {showLabel && (
          <Label htmlFor={id}>{flag.enabled ? "Live" : "Killed"}</Label>
        )}
      </div>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Kill <span className="font-mono">{flag.key}</span>?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Every evaluation will return false with reason KILL_SWITCH until
              the flag is turned back on. Sticky assignments are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="relative"
              disabled={pending}
              aria-busy={pending || undefined}
              onClick={() => void save(false)}
            >
              <PendingContent pending={pending}>Kill flag</PendingContent>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
