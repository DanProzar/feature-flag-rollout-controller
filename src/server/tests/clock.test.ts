import { afterEach, describe, expect, it, vi } from "vitest";
import { appClock, freezeClock, unfreezeClock } from "../clock";

// Compare against primitives, never a shared Date: a buggy clock could mutate a shared fixture.
const T1 = "2026-01-01T00:00:00.000Z";
const T2 = "2026-06-01T12:00:00.000Z";

afterEach(() => unfreezeClock());

function expectSystemTime() {
  const before = Date.now();
  const now = appClock.now().getTime();
  expect(now).toBeGreaterThanOrEqual(before);
  expect(now).toBeLessThanOrEqual(Date.now());
}

describe("appClock", () => {
  it("follows the system clock by default", () => {
    expectSystemTime();
  });

  it("returns the frozen instant after freezeClock, as fresh copies", () => {
    freezeClock(new Date(T1));
    const a = appClock.now();
    const b = appClock.now();
    expect(a.toISOString()).toBe(T1);
    expect(b.toISOString()).toBe(T1);
    expect(a).not.toBe(b);
    a.setFullYear(2000);
    expect(appClock.now().toISOString()).toBe(T1);
  });

  it("is unaffected by mutating the date it was frozen with", () => {
    const at = new Date(T1);
    freezeClock(at);
    at.setFullYear(2000);
    expect(appClock.now().toISOString()).toBe(T1);
  });

  it("moves to a new instant on a second freezeClock", () => {
    freezeClock(new Date(T1));
    freezeClock(new Date(T2));
    expect(appClock.now().toISOString()).toBe(T2);
  });

  it("follows the system clock again after unfreezeClock", () => {
    freezeClock(new Date(T1));
    unfreezeClock();
    expectSystemTime();
  });

  it("shares the frozen time through globalThis across module instances", async () => {
    freezeClock(new Date(T1));
    vi.resetModules();
    const fresh = await import("../clock");
    expect(fresh.appClock).not.toBe(appClock);
    expect(fresh.appClock.now().toISOString()).toBe(T1);
    fresh.freezeClock(new Date(T2));
    expect(appClock.now().toISOString()).toBe(T2);
  });
});
