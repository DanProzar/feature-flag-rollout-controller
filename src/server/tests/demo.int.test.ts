import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createCohortsRepository,
  createUsersRepository,
  SEED_USERS,
  seed,
} from "../../data";
import { useTestDb } from "../../data/tests/harness";
import { frozenClock } from "../../domain";
import { createCatalogService } from "../catalog";
import {
  DEMO_USER_COOKIE,
  DEMO_USER_COOKIE_OPTIONS,
  selectDemoUser,
} from "../demo";

const t = useTestDb();

function catalog() {
  return createCatalogService({
    users: createUsersRepository(t.db),
    cohorts: createCohortsRepository(t.db),
  });
}

beforeEach(async () => {
  await t.clear();
  await seed(t.db, frozenClock(new Date("2026-01-01T00:00:00.000Z")));
});

describe("selectDemoUser", () => {
  it("remembers a stored user in the demo cookie", async () => {
    const setCookie = vi.fn();
    const [, bob] = SEED_USERS;
    expect(
      await selectDemoUser(catalog(), ` ${bob.userId} `, setCookie),
    ).toEqual({ ok: true });
    expect(setCookie).toHaveBeenCalledExactlyOnceWith(
      DEMO_USER_COOKIE,
      bob.userId,
      DEMO_USER_COOKIE_OPTIONS,
    );
  });

  it.each([
    ["an unknown id", "01a1dc80-ffff-7000-8000-000000000000"],
    ["an empty id", "  "],
    ["a non-string id", 42],
  ])("rejects %s and sets nothing", async (_, userId) => {
    const setCookie = vi.fn();
    const result = await selectDemoUser(catalog(), userId, setCookie);
    expect(result).toEqual({ ok: false, error: expect.any(String) });
    expect(setCookie).not.toHaveBeenCalled();
  });
});
