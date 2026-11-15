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
  const at = new Date("2026-01-01T00:00:00.000Z");

  it("always returns the frozen instant", () => {
    const clock = frozenClock(at);
    expect(clock.now()).toEqual(at);
    expect(clock.now()).toEqual(at);
  });

  it("is unaffected by mutating a returned date", () => {
    const clock = frozenClock(at);
    clock.now().setFullYear(2000);
    expect(clock.now()).toEqual(at);
  });

  it("is unaffected by mutating the date it was created from", () => {
    const source = new Date(at);
    const clock = frozenClock(source);
    source.setFullYear(2000);
    expect(clock.now()).toEqual(at);
  });
});
