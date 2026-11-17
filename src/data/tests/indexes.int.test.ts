import { describe, expect, it } from "vitest";
import { ensureIndexes } from "../indexes";
import { useTestDb } from "./harness";

const t = useTestDb();

const EXPECTED = [
  { collection: "flags", key: { key: 1 }, unique: true },
  { collection: "assignments", key: { flagKey: 1, userId: 1 }, unique: true },
  { collection: "audit", key: { key: 1, at: 1, _id: 1 }, unique: false },
  { collection: "users", key: { userId: 1 }, unique: true },
  { collection: "cohorts", key: { key: 1 }, unique: true },
];

async function customIndexes(collection: string) {
  const indexes = await t.db.collection(collection).indexes();
  return indexes
    .filter((i) => i.name !== "_id_")
    .map((i) => ({ key: i.key, unique: i.unique === true }));
}

describe("ensureIndexes", () => {
  it.each(EXPECTED)(
    "creates the $collection index",
    async ({ collection, key, unique }) => {
      expect(await customIndexes(collection)).toEqual([{ key, unique }]);
    },
  );

  it("is safe to run again", async () => {
    await ensureIndexes(t.db);
    await ensureIndexes(t.db);
    for (const { collection, key, unique } of EXPECTED) {
      expect(await customIndexes(collection)).toEqual([{ key, unique }]);
    }
  });
});
