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
