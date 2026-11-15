import { beforeEach, describe, expect, it } from "vitest";
import {
  createCohortsRepository,
  createUsersRepository,
  SEED_COHORTS,
  SEED_USERS,
  seed,
} from "../../data";
import { useTestDb } from "../../data/tests/harness";
import { frozenClock } from "../../domain";
import { createCatalogService } from "../catalog";

const t = useTestDb();

function service() {
  return createCatalogService({
    users: createUsersRepository(t.db),
    cohorts: createCohortsRepository(t.db),
  });
}

beforeEach(() => t.clear());

describe("catalog service", () => {
  it("returns empty lists before seeding", async () => {
    const catalog = service();
    expect(await catalog.cohorts()).toEqual([]);
    expect(await catalog.users()).toEqual([]);
  });

  it("returns the seeded cohorts and users", async () => {
    await seed(t.db, frozenClock(new Date("2026-01-01T00:00:00.000Z")));
    const catalog = service();
    expect(await catalog.cohorts()).toStrictEqual(
      [...SEED_COHORTS].sort((a, b) => a.key.localeCompare(b.key)),
    );
    expect(await catalog.users()).toStrictEqual(
      [...SEED_USERS].sort((a, b) => a.userId.localeCompare(b.userId)),
    );
  });
});
