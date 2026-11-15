import { describe, expect, it } from "vitest";
import { frozenClock, systemClock } from "../clock";

describe("systemClock", () => {
  it("returns the current time", () => {
    const before = Date.now();
    const now = systemClock.now().getTime();
    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(Date.now());
  });
});

describe("frozenClock", () => {
  // Compare against a primitive, never a shared Date: a buggy clock could mutate a shared fixture.
  const AT = "2026-01-01T00:00:00.000Z";
  const AT_MS = Date.parse(AT);

  it("always returns the frozen instant", () => {
    const clock = frozenClock(new Date(AT));
    expect(clock.now().getTime()).toBe(AT_MS);
    expect(clock.now().getTime()).toBe(AT_MS);
  });

  it("returns a new Date on every call, distinct from the one it was created from", () => {
    const at = new Date(AT);
    const clock = frozenClock(at);
    expect(clock.now()).not.toBe(at);
    expect(clock.now()).not.toBe(clock.now());
  });

  it("is unaffected by mutating a returned date", () => {
    const clock = frozenClock(new Date(AT));
    clock.now().setFullYear(2000);
    expect(clock.now().getTime()).toBe(AT_MS);
  });

  it("is unaffected by mutating the date it was created from", () => {
    const at = new Date(AT);
    const clock = frozenClock(at);
    at.setFullYear(2000);
    expect(clock.now().getTime()).toBe(AT_MS);
  });
});
