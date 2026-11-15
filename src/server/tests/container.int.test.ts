import { randomBytes } from "node:crypto";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { closeDb, getDb } from "../../data";
import { TEST_MONGODB_URI } from "../../data/tests/harness";
import { frozenClock } from "../../domain";
import {
  createServices,
  getServices,
  setServicesForTesting,
} from "../container";

const { ensureIndexes } = vi.hoisted(() => ({ ensureIndexes: vi.fn() }));

vi.mock("../../data", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../data")>();
  ensureIndexes.mockImplementation(actual.ensureIndexes);
  return { ...actual, ensureIndexes };
});

const DB_NAME = `feature_flags_test_${randomBytes(6).toString("hex")}`;
const globalForServices = globalThis as { __featureFlagsServices?: unknown };

beforeAll(() => {
  vi.stubEnv("MONGODB_URI", TEST_MONGODB_URI);
  vi.stubEnv("MONGODB_DB", DB_NAME);
});

beforeEach(() => {
  delete globalForServices.__featureFlagsServices;
  ensureIndexes.mockClear();
});

afterEach(() => setServicesForTesting(null));

afterAll(async () => {
  const db = await getDb();
  await db.dropDatabase();
  await closeDb();
  delete globalForServices.__featureFlagsServices;
  vi.unstubAllEnvs();
});

describe("getServices", () => {
  it("shares one instance across concurrent calls and ensures indexes once", async () => {
    const [a, b, c] = await Promise.all([
      getServices(),
      getServices(),
      getServices(),
    ]);
    expect(b).toBe(a);
    expect(c).toBe(a);
    expect(await getServices()).toBe(a);
    expect(ensureIndexes).toHaveBeenCalledOnce();
    expect(ensureIndexes).toHaveBeenCalledWith(await getDb());
    const indexes = await (await getDb()).collection("flags").indexes();
    expect(indexes.some((i) => i.unique && i.key.key === 1)).toBe(true);
  });

  it("returns working services", async () => {
    const { flags } = await getServices();
    expect(await flags.evaluate("nope", { userId: "u1", cohorts: [] })).toEqual(
      { enabled: false, reason: "FLAG_NOT_FOUND" },
    );
  });

  it("retries after a failed setup", async () => {
    ensureIndexes.mockRejectedValueOnce(new Error("boom"));
    await expect(getServices()).rejects.toThrow("boom");
    const services = await getServices();
    expect(services.flags).toBeDefined();
    expect(ensureIndexes).toHaveBeenCalledTimes(2);
  });

  it("a failed setup leaves a newer cached one alone", async () => {
    let fail!: (error: Error) => void;
    ensureIndexes.mockReturnValueOnce(
      new Promise((_, reject) => (fail = reject)),
    );
    const failing = getServices();
    // Something (e.g. a test) dropped the cache while the first setup was still running.
    delete globalForServices.__featureFlagsServices;
    const services = await getServices();
    fail(new Error("boom"));
    await expect(failing).rejects.toThrow("boom");
    expect(await getServices()).toBe(services);
  });

  it("returns the override until it is cleared", async () => {
    const real = await getServices();
    const fake = createServices(await getDb(), frozenClock(new Date(0)));
    setServicesForTesting(fake);
    expect(await getServices()).toBe(fake);
    setServicesForTesting(null);
    expect(await getServices()).toBe(real);
  });
});
