"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { type CohortOption, CohortEditor } from "@/components/cohort-editor";
import { ErrorAlert } from "@/components/error-alert";
import { PendingButton } from "@/components/pending-button";
import { showSuccessToast } from "@/components/success-toast";
import { TableCell, TableRow } from "@/components/ui/table";
import { setUserCohorts } from "@/lib/api-client";
import { userCohortsToast } from "@/lib/toast-messages";

export interface UserRowData {
  userId: string;
  name: string;
  cohorts: string[];
}

/** One user with an editable cohort list, saved via `PUT /api/users/:userId/cohorts`. */
export function UserCohortsRow({
  user,
  cohorts,
}: {
  user: UserRowData;
  cohorts: CohortOption[];
}) {
  const router = useRouter();
  const [value, setValue] = useState(user.cohorts);
  const [saving, setSaving] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const [failure, setFailure] = useState<string | null>(null);
  // Order does not matter: the same cohorts re-added in another order are no change.
  const changed =
    value.length !== user.cohorts.length ||
    value.some((cohort) => !user.cohorts.includes(cohort));
  const inputId = `user-cohorts-${user.userId}`;

  async function save() {
    setSaving(true);
    setFailure(null);
    const result = await setUserCohorts(user.userId, value);
    setSaving(false);
    if (!result.ok) {
      setFailure(result.error);
      return;
    }
    showSuccessToast(
      userCohortsToast(user.name, user.cohorts, result.user.cohorts),
    );
    startRefresh(() => router.refresh());
  }

  return (
    <TableRow className="align-top">
      <TableCell className="pt-3.5 font-medium">
        <label htmlFor={inputId}>{user.name}</label>
      </TableCell>
      <TableCell className="pt-3.5 font-mono text-xs text-muted-foreground">
        {user.userId}
      </TableCell>
      <TableCell className="whitespace-normal">
        <div className="space-y-2">
          <CohortEditor
            id={inputId}
            value={value}
            onChange={setValue}
            catalogue={cohorts}
            disabled={saving || refreshing}
          />
          {failure && (
            <ErrorAlert
              title={`Could not save cohorts for ${user.name}`}
              description={failure}
            />
          )}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <PendingButton
          size="sm"
          variant={changed ? "default" : "outline"}
          pending={saving || refreshing}
          disabled={!changed}
          onClick={() => void save()}
        >
          Save
        </PendingButton>
      </TableCell>
    </TableRow>
  );
}
