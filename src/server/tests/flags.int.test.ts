import { beforeEach, describe, expect, it } from "vitest";
import {
  createAssignmentsRepository,
  createAuditRepository,
  createFlagsRepository,
} from "../../data";
import { useTestDb } from "../../data/tests/harness";
import { frozenClock } from "../../domain";
import { createFlagService } from "../flags";
import type { PutFlagBody } from "../schemas";

const t = useTestDb();

const T1 = "2026-01-01T00:00:00.000Z";
const clock = frozenClock(new Date(T1));

const BODY: PutFlagBody = {
  enabled: true,
  percentage: 50,
  includeCohorts: ["beta"],
  excludeCohorts: ["internal"],
  sticky: true,
};

function service() {
  return createFlagService({
    flags: createFlagsRepository(t.db, clock),
    assignments: createAssignmentsRepository(t.db, clock),
    audit: createAuditRepository(t.db),
    clock,
  });
}

beforeEach(() => t.clear());

describe("flag service put", () => {
  it("creates a flag and audits it with before: null", async () => {
    const flags = service();
    const flag = await flags.put("demo", BODY, "dev-1");
    expect(flag).toStrictEqual({ key: "demo", ...BODY });
    expect(await createFlagsRepository(t.db, clock).get("demo")).toStrictEqual(
      flag,
    );
    expect(await flags.audit("demo")).toStrictEqual([
      {
        at: new Date(T1),
        key: "demo",
        actorId: "dev-1",
        before: null,
        after: flag,
      },
    ]);
  });

  it("replaces a flag and audits the previous one as before, oldest first", async () => {
    const flags = service();
    const first = await flags.put("demo", BODY, "dev-1");
    const second = await flags.put(
      "demo",
      { ...BODY, percentage: 10, sticky: false },
      "dev-2",
    );
    expect(second).toStrictEqual({
      key: "demo",
      ...BODY,
      percentage: 10,
      sticky: false,
    });
    const entries = await flags.audit("demo");
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      actorId: "dev-1",
      before: null,
      after: first,
    });
    expect(entries[1]).toMatchObject({
      actorId: "dev-2",
      before: first,
      after: second,
    });
  });

  it("audits an unchanged PUT too", async () => {
    const flags = service();
    await flags.put("demo", BODY, null);
    await flags.put("demo", BODY, null);
    const entries = await flags.audit("demo");
    expect(entries).toHaveLength(2);
    expect(entries[1].before).toStrictEqual(entries[1].after);
  });

  it("stores a null actorId as null", async () => {
    const flags = service();
    await flags.put("demo", BODY, null);
    const [entry] = await flags.audit("demo");
    expect(entry.actorId).toBeNull();
    const raw = await t.db.collection("audit").findOne({ key: "demo" });
    expect(raw?.actorId).toBeNull();
  });
});

describe("flag service audit", () => {
  it("lists the entries of that key only", async () => {
    const flags = service();
    await flags.put("a", BODY, null);
    await flags.put("b", BODY, null);
    await flags.put("a", { ...BODY, enabled: false }, null);
    const entries = await flags.audit("a");
    expect(entries.map((e) => e.key)).toEqual(["a", "a"]);
  });

  it("is [] for an unknown key", async () => {
    expect(await service().audit("nope")).toEqual([]);
  });
});
