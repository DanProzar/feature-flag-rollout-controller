import { beforeEach, describe, expect, it } from "vitest";
import { SEED_USERS, seed } from "@/data";
import { appClock } from "@/server";
import { putCohorts, useApi } from "./helpers";

const t = useApi();
const [ALICE] = SEED_USERS;

beforeEach(async () => {
  await t.clear();
  await seed(t.db, appClock);
});

describe("PUT /api/users/:userId/cohorts", () => {
  it("answers 200 { user } with the cohorts trimmed and de-duplicated", async () => {
    expect(
      await putCohorts(ALICE.userId, { cohorts: ["user", " user", "beta"] }),
    ).toEqual({
      status: 200,
      body: { user: { ...ALICE, cohorts: ["user", "beta"] } },
    });
    expect(
      await t.db.collection("users").findOne({ userId: ALICE.userId }),
    ).toMatchObject({ name: ALICE.name, cohorts: ["user", "beta"] });
  });

  it("accepts an empty list", async () => {
    const res = await putCohorts(ALICE.userId, { cohorts: [] });
    expect(res.body.user.cohorts).toEqual([]);
  });

  it("answers 404 for an unknown user", async () => {
    expect(
      await putCohorts("01a1dc80-ffff-7000-8000-000000000000", {
        cohorts: [],
      }),
    ).toEqual({ status: 404, body: { error: "User not found" } });
  });

  it.each(["not-a-uuid", "alice"])(
    "answers 400 Invalid user id for %j before reading the body",
    async (userId) => {
      const res = await putCohorts(userId, { cohorts: "not a list" });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid user id");
      expect(Object.keys(res.body.issues)).toEqual(["userId"]);
    },
  );

  it.each([{}, { cohorts: "admin" }, { cohorts: [" "] }])(
    "answers 400 for %j without changing the user",
    async (body) => {
      const res = await putCohorts(ALICE.userId, body);
      expect(res.status).toBe(400);
      expect(Object.keys(res.body.issues)).toEqual(["cohorts"]);
      expect(
        await t.db.collection("users").findOne({ userId: ALICE.userId }),
      ).toMatchObject({ cohorts: ALICE.cohorts });
    },
  );
});
