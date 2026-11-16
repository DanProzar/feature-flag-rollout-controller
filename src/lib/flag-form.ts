import type { Flag } from "../domain";
import { FlagKeySchema, type PutFlagBody } from "../server/schemas";

// Pure helpers behind the create/edit flag form: mapping between flags, form values and PUT bodies,
// client-side validation, and mapping a 400's `issues` back onto the form's fields.

/** What the flag form edits: every flag field, the key included. */
export type FlagFormValues = Flag;

export type FlagFormField = keyof FlagFormValues;

/** Messages per form field; fields without messages are absent. */
export type FieldErrors = Partial<Record<FlagFormField, string[]>>;

export interface FlagFormCheck {
  /** `true` when there are no errors; warnings never block saving. */
  valid: boolean;
  errors: FieldErrors;
  warnings: FieldErrors;
}

const FIELDS: readonly FlagFormField[] = [
  "key",
  "enabled",
  "percentage",
  "includeCohorts",
  "excludeCohorts",
  "sticky",
];

/**
 * The catalogue's cohort of regular customers. Including it in a new flag marks a gradual rollout,
 * so the create form drops the percentage to 0% (see `withIncludeCohorts`).
 */
export const USER_COHORT = "user";

/** A new flag: live, 100%, non-sticky, no cohorts. */
export function emptyFlagForm(): FlagFormValues {
  return {
    key: "",
    enabled: true,
    percentage: 100,
    includeCohorts: [],
    excludeCohorts: [],
    sticky: false,
  };
}

export function flagToForm(flag: Flag): FlagFormValues {
  return {
    ...flag,
    includeCohorts: [...flag.includeCohorts],
    excludeCohorts: [...flag.excludeCohorts],
  };
}

/**
 * `values` with new include cohorts, as the create form applies them: adding `USER_COHORT` sets the
 * percentage to 0 (to roll out gradually from there), removing it sets 100; other changes keep it.
 */
export function withIncludeCohorts(
  values: FlagFormValues,
  includeCohorts: string[],
): FlagFormValues {
  const had = values.includeCohorts.includes(USER_COHORT);
  const has = includeCohorts.includes(USER_COHORT);
  const percentage = had === has ? values.percentage : has ? 0 : 100;
  return { ...values, includeCohorts, percentage };
}

/** The PUT body for the form; the key goes in the URL. */
export function formToPutBody(values: FlagFormValues): PutFlagBody {
  return {
    enabled: values.enabled,
    percentage: values.percentage,
    includeCohorts: [...values.includeCohorts],
    excludeCohorts: [...values.excludeCohorts],
    sticky: values.sticky,
  };
}

/**
 * Checks the form before it is sent. On create the key must not exist yet, since a PUT would
 * silently replace that flag. A cohort both included and excluded is only a warning: exclude wins.
 */
export function validateFlagForm(
  values: FlagFormValues,
  existingKeys: readonly string[],
  mode: "create" | "edit",
): FlagFormCheck {
  const errors: FieldErrors = {};
  const warnings: FieldErrors = {};

  const key = FlagKeySchema.safeParse(values.key);
  if (!key.success) {
    errors.key = [key.error.issues[0].message];
  } else if (mode === "create" && existingKeys.includes(values.key)) {
    errors.key = ["A flag with this key already exists"];
  }

  const { percentage } = values;
  if (!Number.isInteger(percentage) || percentage < 0 || percentage > 100) {
    errors.percentage = ["Must be a whole number from 0 to 100"];
  }

  const overlap = values.excludeCohorts.filter((cohort) =>
    values.includeCohorts.includes(cohort),
  );
  if (overlap.length > 0) {
    warnings.excludeCohorts = [
      `Also included: ${overlap.join(", ")}. Exclude wins for these cohorts.`,
    ];
  }

  return { valid: Object.keys(errors).length === 0, errors, warnings };
}

/** The form-field messages of a 400's `issues`; other fields and empty lists are dropped. */
export function issuesToFieldErrors(
  issues: Record<string, string[] | undefined>,
): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of FIELDS) {
    const messages = issues[field];
    if (messages?.length) errors[field] = messages;
  }
  return errors;
}
