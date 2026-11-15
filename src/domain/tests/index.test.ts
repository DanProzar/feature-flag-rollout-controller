import { describe, expect, it } from "vitest";
import * as domain from "../index";

describe("domain public API", () => {
  it("exports the evaluator, bucketing and clocks", () => {
    expect(typeof domain.evaluate).toBe("function");
    expect(typeof domain.bucket).toBe("function");
    expect(typeof domain.frozenClock).toBe("function");
    expect(typeof domain.systemClock.now).toBe("function");
  });
});
