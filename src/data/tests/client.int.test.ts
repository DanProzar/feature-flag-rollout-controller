import { randomBytes } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { closeDb, getDb } from "../client";
import { TEST_MONGODB_URI } from "./harness";

const DB_NAME = `feature_flags_test_${randomBytes(6).toString("hex")}`;
const TIMEOUT = "MONGODB_SERVER_SELECTION_TIMEOUT_MS";
const UNREACHABLE = "mongodb://127.0.0.1:1/";
const saved = {
  uri: process.env.MONGODB_URI,
  db: process.env.MONGODB_DB,
  timeout: process.env[TIMEOUT],
};

function restore(name: string, value?: string) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

beforeAll(() => {
  process.env.MONGODB_URI = TEST_MONGODB_URI;
  process.env.MONGODB_DB = DB_NAME;
});

afterEach(async () => {
  await closeDb();
  restore(TIMEOUT, saved.timeout);
});

afterAll(async () => {
  const db = await getDb();
  await db.dropDatabase();
  await closeDb();
  restore("MONGODB_URI", saved.uri);
  restore("MONGODB_DB", saved.db);
  restore(TIMEOUT, saved.timeout);
});

describe("getDb", () => {
  it("returns the configured database and can ping", async () => {
    const db = await getDb();
    expect(db.databaseName).toBe(DB_NAME);
    expect(await db.command({ ping: 1 })).toMatchObject({ ok: 1 });
  });

  it("returns the same Db to concurrent callers", async () => {
    const [a, b, c] = await Promise.all([getDb(), getDb(), getDb()]);
    expect(b).toBe(a);
    expect(c).toBe(a);
  });

  it("reconnects after closeDb", async () => {
    const first = await getDb();
    await closeDb();
    const second = await getDb();
    expect(second).not.toBe(first);
    expect(await second.command({ ping: 1 })).toMatchObject({ ok: 1 });
  });

  it("closeDb is a no-op when nothing is connected", async () => {
    await expect(closeDb()).resolves.toBeUndefined();
  });

  it("fails an unreachable server within MONGODB_SERVER_SELECTION_TIMEOUT_MS", async () => {
    process.env.MONGODB_URI = UNREACHABLE;
    process.env[TIMEOUT] = "300";
    const started = Date.now();
    await expect(getDb()).rejects.toThrow();
    const elapsed = Date.now() - started;
    expect(elapsed).toBeGreaterThanOrEqual(250);
    expect(elapsed).toBeLessThan(3000);
  });

  it("does not cache a failed connection", async () => {
    process.env.MONGODB_URI = UNREACHABLE;
    process.env[TIMEOUT] = "200";
    await expect(getDb()).rejects.toThrow();
    process.env.MONGODB_URI = TEST_MONGODB_URI;
    const db = await getDb();
    expect(await db.command({ ping: 1 })).toMatchObject({ ok: 1 });
  });

  it("closeDb during a failed connect resolves and leaves the next connection alone", async () => {
    process.env.MONGODB_URI = UNREACHABLE;
    process.env[TIMEOUT] = "200";
    const failing = getDb();
    process.env.MONGODB_URI = TEST_MONGODB_URI;
    await expect(closeDb()).resolves.toBeUndefined();
    await expect(failing).rejects.toThrow();
    const db = await getDb();
    expect(await db.command({ ping: 1 })).toMatchObject({ ok: 1 });
  });
});
