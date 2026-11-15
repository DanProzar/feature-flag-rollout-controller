import type { Db } from "mongodb";
import type { Clock, Flag } from "../domain";
import { isDuplicateKeyError } from "./errors";
import { createFlagsRepository } from "./flags";
import type { Cohort, User } from "./schemas";

export const SEED_COHORTS: readonly Cohort[] = [
  {
    key: "admin",
    name: "Admins",
    description: "People who manage flags and settings.",
  },
  {
    key: "tester",
    name: "Testers",
    description: "QA staff who try features before release.",
  },
  {
    key: "user",
    name: "Users",
    description: "Regular customers of the product.",
  },
  {
    key: "developer",
    name: "Developers",
    description: "Engineers building the product.",
  },
];

// Fixed UUID v7 ids, generated once: random ids would move users between percentage buckets on
// every fresh database and change what the demo shows.
export const SEED_USERS: readonly User[] = [
  {
    userId: "01a1dc80-f000-7ca2-9842-a25ac04f528a",
    name: "Alice",
    cohorts: ["admin", "developer"],
  },
  {
    userId: "01a1dc80-f001-7d40-8f31-97b3a953464b",
    name: "Bob",
    cohorts: ["tester"],
  },
  {
    userId: "01a1dc80-f002-7f7b-8e7c-8b8f50312ce4",
    name: "Carol",
    cohorts: ["user"],
  },
  {
    userId: "01a1dc80-f003-7c9f-bae4-c766892e83f6",
    name: "Dan",
    cohorts: ["developer"],
  },
  {
    userId: "01a1dc80-f004-7407-835c-df1b0df5d2fd",
    name: "Eve",
    cohorts: ["user", "tester"],
  },
  {
    userId: "01a1dc80-f005-7503-bf21-c2146a512485",
    name: "Frank",
    cohorts: ["user"],
  },
];

/** One flag per evaluation reason against `SEED_USERS` (`FLAG_NOT_FOUND`: any other key). */
export const SEED_FLAGS: readonly Flag[] = [
  {
    key: "new-checkout",
    enabled: true,
    percentage: 50,
    includeCohorts: [],
    excludeCohorts: [],
    sticky: true,
  },
  {
    key: "dark-mode",
    enabled: true,
    percentage: 0,
    includeCohorts: ["tester", "developer"],
    excludeCohorts: [],
    sticky: false,
  },
  {
    key: "beta-search",
    enabled: true,
    percentage: 100,
    includeCohorts: [],
    excludeCohorts: ["user"],
    sticky: false,
  },
  {
    key: "legacy-banner",
    enabled: false,
    percentage: 100,
    includeCohorts: [],
    excludeCohorts: [],
    sticky: false,
  },
  {
    key: "ai-assistant",
    enabled: true,
    percentage: 35,
    includeCohorts: ["admin"],
    excludeCohorts: [],
    sticky: false,
  },
];

export interface SeedOutcome {
  seeded: boolean;
  count: number;
}

export type SeedResult = Record<"cohorts" | "users" | "flags", SeedOutcome>;

const SKIPPED: SeedOutcome = { seeded: false, count: 0 };

/**
 * Inserts the seed data into each of `cohorts`, `users` and `flags` that is empty; non-empty
 * collections are left alone. Flags get no audit entries. Safe to run concurrently: each
 * collection is seeded by exactly one run.
 */
export async function seed(db: Db, clock: Clock): Promise<SeedResult> {
  const [cohorts, users, flags] = await Promise.all([
    insertIfEmpty(db, "cohorts", SEED_COHORTS),
    insertIfEmpty(db, "users", SEED_USERS),
    seedFlags(db, clock),
  ]);
  return { cohorts, users, flags };
}

async function insertIfEmpty(
  db: Db,
  name: string,
  docs: readonly object[],
): Promise<SeedOutcome> {
  const collection = db.collection(name);
  if (await isNonEmpty(db, name)) return SKIPPED;
  try {
    // Ordered: a concurrent run that lost the race fails on the first document and inserts none.
    await collection.insertMany(docs.map((d) => ({ ...d })));
  } catch (error) {
    if (isDuplicateKeyError(error)) return SKIPPED;
    throw error;
  }
  return { seeded: true, count: docs.length };
}

async function seedFlags(db: Db, clock: Clock): Promise<SeedOutcome> {
  if (await isNonEmpty(db, "flags")) return SKIPPED;
  const flags = createFlagsRepository(db, clock);
  const [first, ...rest] = SEED_FLAGS;
  // Only the run that creates the first flag goes on; a concurrent run finds it already there.
  if ((await flags.upsert(first)) !== null) return SKIPPED;
  for (const flag of rest) await flags.upsert(flag);
  return { seeded: true, count: SEED_FLAGS.length };
}

async function isNonEmpty(db: Db, name: string): Promise<boolean> {
  return (await db.collection(name).countDocuments({}, { limit: 1 })) > 0;
}
