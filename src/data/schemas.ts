import { validate, version } from "uuid";
import { z } from "zod";

// Zod schemas for every stored document. Repositories parse each document they read with these, so
// a corrupted or hand-edited document fails loudly here instead of reaching the evaluator. Unknown
// keys such as `_id` are stripped.

/** The domain `Flag` (the six mission fields), as stored in `flags` and in audit entries. */
export const FlagSchema = z.object({
  key: z.string().min(1),
  enabled: z.boolean(),
  percentage: z.int().min(0).max(100),
  includeCohorts: z.array(z.string()),
  excludeCohorts: z.array(z.string()),
  sticky: z.boolean(),
});

export const FlagDocumentSchema = FlagSchema.extend({
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type FlagDocument = z.infer<typeof FlagDocumentSchema>;

/** A user's stored sticky result for one flag. */
export const AssignmentDocumentSchema = z.object({
  flagKey: z.string().min(1),
  userId: z.string().min(1),
  value: z.boolean(),
  createdAt: z.date(),
});
export type AssignmentDocument = z.infer<typeof AssignmentDocumentSchema>;

/** One admin change to a flag; `before` is `null` when the change created it. */
export const AuditEntrySchema = z.object({
  at: z.date(),
  key: z.string().min(1),
  actorId: z.string().nullable(),
  before: FlagSchema.nullable(),
  after: FlagSchema,
});
export type AuditEntry = z.infer<typeof AuditEntrySchema>;

/** True for a UUID v7 string, the only `userId` format stored in `users`. */
export function isUuidV7(id: string): boolean {
  return validate(id) && version(id) === 7;
}

export const UserSchema = z.object({
  userId: z.string().refine(isUuidV7, "userId must be a UUID v7"),
  name: z.string().min(1),
  cohorts: z.array(z.string()),
});
export type User = z.infer<typeof UserSchema>;

/** A named cohort; a catalogue for UIs, not referenced by flags or users. */
export const CohortSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
});
export type Cohort = z.infer<typeof CohortSchema>;
