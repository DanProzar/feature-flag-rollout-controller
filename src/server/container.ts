import type { Db } from "mongodb";
import {
  createAssignmentsRepository,
  createAuditRepository,
  createCohortsRepository,
  createFlagsRepository,
  createUsersRepository,
  ensureIndexes,
  getDb,
} from "../data";
import type { Clock } from "../domain";
import { type CatalogService, createCatalogService } from "./catalog";
import { appClock } from "./clock";
import { createFlagService, type FlagService } from "./flags";
import { createResetService, type ResetService } from "./reset";

export interface Services {
  flags: FlagService;
  reset: ResetService;
  catalog: CatalogService;
}

export function createServices(db: Db, clock: Clock): Services {
  return {
    flags: createFlagService({
      flags: createFlagsRepository(db, clock),
      assignments: createAssignmentsRepository(db, clock),
      audit: createAuditRepository(db),
      clock,
    }),
    reset: createResetService({ db }),
    catalog: createCatalogService({
      users: createUsersRepository(db),
      cohorts: createCohortsRepository(db),
    }),
  };
}

// Cached on `globalThis`, like the Db, so indexes are ensured once per process even across Next.js
// dev hot reloads.
const globalForServices = globalThis as typeof globalThis & {
  __featureFlagsServices?: Promise<Services>;
};

let override: Services | null = null;

async function setUp(): Promise<Services> {
  const db = await getDb();
  await ensureIndexes(db);
  return createServices(db, appClock);
}

/** The app's services; the first call connects and ensures indexes, concurrent callers share it. */
export function getServices(): Promise<Services> {
  if (override) return Promise.resolve(override);
  if (!globalForServices.__featureFlagsServices) {
    const pending = setUp();
    globalForServices.__featureFlagsServices = pending;
    // A failed setup must not stick: the next request retries.
    pending.catch(() => {
      if (globalForServices.__featureFlagsServices === pending) {
        delete globalForServices.__featureFlagsServices;
      }
    });
  }
  return globalForServices.__featureFlagsServices;
}

/** Makes `getServices` return `services` (e.g. built on a test database); `null` clears it. */
export function setServicesForTesting(services: Services | null): void {
  override = services;
}
