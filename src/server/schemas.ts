import { z } from "zod";

// Zod schemas for request paths and bodies. Unknown body fields are stripped, never rejected, so a
// `key` in a PUT body is ignored.

/** A flag key as it appears in `/api/flags/:key`: a lowercase slug of 1–100 characters. */
export const FlagKeySchema = z
  .string()
  .regex(
    /^[a-z0-9][a-z0-9._-]{0,99}$/,
    "Must be 1–100 characters of a-z, 0-9, '.', '_' or '-', starting with a letter or digit",
  );

/** Longest accepted `userId`, cohort key or `X-User-Id`, after trimming. */
export const MAX_ID_LENGTH = 200;
/** Most cohorts in one list, after de-duplication. */
export const MAX_COHORTS = 100;

/** A trimmed, non-empty id of at most `MAX_ID_LENGTH` characters. */
const IdSchema = z.string().trim().min(1).max(MAX_ID_LENGTH);

/** Cohort keys: each an id; duplicates removed, first occurrence order kept; at most `MAX_COHORTS`. */
const CohortsSchema = z
  .array(IdSchema)
  .transform((cohorts) => [...new Set(cohorts)])
  .pipe(z.array(z.string()).max(MAX_COHORTS));

/** Every mutable flag field; all required, no defaults (the body fully replaces the flag). */
export const PutFlagBodySchema = z.object({
  enabled: z.boolean(),
  percentage: z.int().min(0).max(100),
  includeCohorts: CohortsSchema,
  excludeCohorts: CohortsSchema,
  sticky: z.boolean(),
});
export type PutFlagBody = z.infer<typeof PutFlagBodySchema>;

export const EvaluateBodySchema = z.object({
  userId: IdSchema,
  cohorts: CohortsSchema.default([]),
});
export type EvaluateBody = z.infer<typeof EvaluateBodySchema>;

/** A user id as it appears in `/api/users/:userId/cohorts`: a UUID (seed and created users are v7). */
export const UserIdSchema = z.uuid("Must be a UUID");

/** The body of `PUT /api/users/:userId/cohorts`: the user's full cohort list. */
export const UserCohortsBodySchema = z.object({ cohorts: CohortsSchema });
export type UserCohortsBody = z.infer<typeof UserCohortsBodySchema>;

export const ResetBodySchema = z.object({
  now: z.iso.datetime({ offset: true }).transform((now) => new Date(now)),
});
export type ResetBody = z.infer<typeof ResetBodySchema>;
