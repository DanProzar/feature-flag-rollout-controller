import { randomBytes } from "node:crypto";
import { type Db, MongoClient } from "mongodb";
import { afterAll, beforeAll } from "vitest";
import { ensureIndexes } from "../indexes";

export const TEST_MONGODB_URI =
  process.env.MONGODB_URI ?? "mongodb://localhost:27017";

export interface TestDb {
  /** The per-file database; only valid inside tests and hooks. */
  readonly db: Db;
  readonly client: MongoClient;
  /** Deletes every document in every collection, keeping indexes. */
  clear(): Promise<void>;
}

/**
 * Gives a test file its own database `feature_flags_test_<random>` with indexes in place, and
 * drops it after the file's tests have run.
 */
export function useTestDb(): TestDb {
  const name = `feature_flags_test_${randomBytes(6).toString("hex")}`;
  let client: MongoClient | undefined;
  let db: Db | undefined;

  beforeAll(async () => {
    client = await new MongoClient(TEST_MONGODB_URI).connect();
    db = client.db(name);
    await ensureIndexes(db);
  });

  afterAll(async () => {
    await db?.dropDatabase();
    await client?.close();
  });

  return {
    get db() {
      if (!db) throw new Error("useTestDb: database not ready");
      return db;
    },
    get client() {
      if (!client) throw new Error("useTestDb: client not ready");
      return client;
    },
    async clear() {
      const collections = await this.db.collections();
      await Promise.all(collections.map((c) => c.deleteMany({})));
    },
  };
}
