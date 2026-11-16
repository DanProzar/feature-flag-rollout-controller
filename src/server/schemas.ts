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

/** Cohort keys: each trimmed and non-empty; duplicates removed, first occurrence order kept. */
const CohortsSchema = z
  .array(z.string().trim().min(1))
  .transform((cohorts) => [...new Set(cohorts)]);

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
  userId: z.string().trim().min(1),
  cohorts: CohortsSchema.default([]),
});
export type EvaluateBody = z.infer<typeof EvaluateBodySchema>;

/** The body of `PUT /api/users/:userId/cohorts`: the user's full cohort list. */
export const UserCohortsBodySchema = z.object({ cohorts: CohortsSchema });
export type UserCohortsBody = z.infer<typeof UserCohortsBodySchema>;

export const ResetBodySchema = z.object({
  now: z.iso.datetime({ offset: true }).transform((now) => new Date(now)),
});
export type ResetBody = z.infer<typeof ResetBodySchema>;
