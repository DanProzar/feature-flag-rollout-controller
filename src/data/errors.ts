import { MongoServerError } from "mongodb";

const DUPLICATE_KEY = 11000;

/** True for MongoDB's `E11000` unique-index violation. */
export function isDuplicateKeyError(error: unknown): boolean {
  return error instanceof MongoServerError && error.code === DUPLICATE_KEY;
}

/** Thrown by `cohorts.create` when a cohort with that key already exists. */
export class DuplicateCohortError extends Error {
  constructor(readonly key: string) {
    super(`Cohort "${key}" already exists`);
    this.name = "DuplicateCohortError";
  }
}
