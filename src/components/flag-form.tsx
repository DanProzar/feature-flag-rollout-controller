"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useState, useTransition } from "react";
import { type CohortOption, CohortEditor } from "@/components/cohort-editor";
import { ErrorAlert } from "@/components/error-alert";
import { PendingButton } from "@/components/pending-button";
import { showSuccessToast } from "@/components/success-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { putFlag } from "@/lib/api-client";
import {
  type FieldErrors,
  type FlagFormValues,
  formToPutBody,
  issuesToFieldErrors,
  USER_COHORT,
  validateFlagForm,
  withIncludeCohorts,
} from "@/lib/flag-form";
import { flagSavedToast } from "@/lib/toast-messages";

/** The control of each form field that can have errors, in form order: focus goes to the first. */
const FIELD_CONTROLS: [keyof FieldErrors, string][] = [
  ["key", "flag-key"],
  ["percentage", "flag-percentage"],
  ["includeCohorts", "flag-include"],
  ["excludeCohorts", "flag-exclude"],
];

function focusFirstError(errors: FieldErrors) {
  const first = FIELD_CONTROLS.find(([field]) => errors[field]);
  if (first) document.getElementById(first[1])?.focus();
}

/**
 * Creates or edits a flag through `PUT /api/flags/:key`. On edit the key is read-only and the kill
 * state is left to the kill switch: the form sends the stored `enabled` it is given, so flipping
 * the kill switch neither remounts the form (unsaved rule edits survive) nor gets undone by the
 * next save. On create the percentage follows the include cohorts (100%, or 0% once `user` is
 * included; see `withIncludeCohorts`) and saving returns to the list.
 */
export function FlagForm({
  mode,
  initial,
  enabled,
  existingKeys,
  cohorts,
}: {
  mode: "create" | "edit";
  initial: FlagFormValues;
  /** Edit only: the stored kill state, sent with the rules instead of `initial.enabled`. */
  enabled?: boolean;
  existingKeys: string[];
  cohorts: CohortOption[];
}) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Keeps the spinner up until the list (create) or the refreshed page (edit) has rendered.
  const [navigating, startNavigation] = useTransition();

  const { warnings } = validateFlagForm(values, existingKeys, mode);

  function set<F extends keyof FlagFormValues>(
    field: F,
    value: FlagFormValues[F],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFailure(null);
    const check = validateFlagForm(values, existingKeys, mode);
    setErrors(check.errors);
    if (!check.valid) {
      focusFirstError(check.errors);
      return;
    }

    setSaving(true);
    const sent = enabled === undefined ? values : { ...values, enabled };
    const result = await putFlag(values.key, formToPutBody(sent), null);
    setSaving(false);
    if (!result.ok) {
      const fieldErrors = issuesToFieldErrors(result.issues);
      setErrors(fieldErrors);
      setFailure(result.error);
      focusFirstError(fieldErrors);
      return;
    }
    showSuccessToast(
      flagSavedToast(
        mode === "create"
          ? null
          : { ...initial, enabled: enabled ?? initial.enabled },
        result.flag,
      ),
    );
    startNavigation(() => {
      if (mode === "create") router.push("/");
      else router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <Field id="flag-key" label="Key" errors={errors.key}>
        {(describedBy) => (
          <Input
            id="flag-key"
            aria-describedby={describedBy}
            value={values.key}
            readOnly={mode === "edit"}
            placeholder="e.g. new-checkout"
            autoComplete="off"
            aria-invalid={errors.key ? true : undefined}
            onChange={(event) => set("key", event.target.value)}
          />
        )}
      </Field>

      {mode === "create" && (
        <SwitchField
          id="flag-enabled"
          label="Live"
          hint="Off means the kill switch is on: every evaluation returns false."
          checked={values.enabled}
          onChange={(checked) => set("enabled", checked)}
        />
      )}

      <Field
        id="flag-percentage"
        label="Rollout percentage"
        errors={errors.percentage}
      >
        {(describedBy) => (
          <div className="flex items-center gap-4">
            <Slider
              aria-label="Rollout percentage"
              min={0}
              max={100}
              step={1}
              value={[
                Number.isFinite(values.percentage) ? values.percentage : 0,
              ]}
              onValueChange={(value) =>
                set("percentage", Array.isArray(value) ? value[0] : value)
              }
            />
            <Input
              id="flag-percentage"
              type="number"
              min={0}
              max={100}
              step={1}
              className="w-20 tabular-nums"
              value={Number.isNaN(values.percentage) ? "" : values.percentage}
              aria-invalid={errors.percentage ? true : undefined}
              aria-describedby={describedBy}
              onChange={(event) =>
                set("percentage", event.target.valueAsNumber)
              }
            />
          </div>
        )}
      </Field>

      <Field
        id="flag-include"
        label="Include cohorts"
        hint={
          mode === "create"
            ? `Forced on, bypassing the percentage. Including "${USER_COHORT}" starts a gradual rollout at 0%.`
            : "Forced on, bypassing the percentage."
        }
        errors={errors.includeCohorts}
      >
        {(describedBy) => (
          <CohortEditor
            id="flag-include"
            describedBy={describedBy}
            value={values.includeCohorts}
            onChange={(next) =>
              mode === "create"
                ? setValues((current) => withIncludeCohorts(current, next))
                : set("includeCohorts", next)
            }
            catalogue={cohorts}
            invalid={!!errors.includeCohorts}
          />
        )}
      </Field>

      <Field
        id="flag-exclude"
        label="Exclude cohorts"
        hint="Forced off; beats include."
        errors={errors.excludeCohorts}
        warnings={warnings.excludeCohorts}
      >
        {(describedBy) => (
          <CohortEditor
            id="flag-exclude"
            describedBy={describedBy}
            value={values.excludeCohorts}
            onChange={(next) => set("excludeCohorts", next)}
            catalogue={cohorts}
            invalid={!!errors.excludeCohorts}
          />
        )}
      </Field>

      <SwitchField
        id="flag-sticky"
        label="Sticky"
        hint="Store each user's first percentage result and reuse it. Existing assignments are kept when this changes."
        checked={values.sticky}
        onChange={(checked) => set("sticky", checked)}
      />

      {failure && (
        <ErrorAlert
          title={
            mode === "create"
              ? "Could not create flag"
              : `Could not save ${values.key}`
          }
          description={failure}
        />
      )}

      <PendingButton type="submit" pending={saving || navigating}>
        {mode === "create" ? "Create flag" : "Save"}
      </PendingButton>
    </form>
  );
}

/**
 * A labelled form field. Its hint, errors and warnings get ids, and `children` receives them as
 * the value for the control's `aria-describedby`; errors are announced as they appear.
 */
function Field({
  id,
  label,
  hint,
  errors,
  warnings,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  errors?: string[];
  warnings?: string[];
  children(describedBy: string | undefined): ReactNode;
}) {
  const describedBy =
    [
      hint && `${id}-hint`,
      errors?.length && `${id}-error`,
      warnings?.length && `${id}-warning`,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {children(describedBy)}
      {errors?.length ? (
        <div id={`${id}-error`} role="alert" className="space-y-1">
          {errors.map((message) => (
            <p key={message} className="text-sm text-destructive">
              {message}
            </p>
          ))}
        </div>
      ) : null}
      {warnings?.length ? (
        <div id={`${id}-warning`} className="space-y-1">
          {warnings.map((message) => (
            <p key={message} className="text-sm text-amber-700">
              {message}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SwitchField({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onChange(checked: boolean): void;
}) {
  return (
    <div className="flex items-start gap-3">
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        aria-describedby={`${id}-hint`}
      />
      <div className="space-y-1">
        <Label htmlFor={id}>{label}</Label>
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      </div>
    </div>
  );
}
