import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { evaluate } from "../evaluate";
import type { Flag } from "../types";
import { referenceBucket } from "./helpers";

// Flag cohorts and "other" user cohorts come from disjoint pools, so each property controls
// exactly which cohort rules can match instead of relying on chance.
const flagCohort = fc.constantFrom("a", "b", "c");
const otherCohort = fc.constantFrom("x", "y", "z");
const anyString = fc.string({ unit: "binary" });
const stored = fc.option(fc.boolean(), { nil: undefined });

const flagArb = fc.record<Flag>({
  key: anyString,
  enabled: fc.boolean(),
  percentage: fc.integer({ min: 0, max: 100 }),
  includeCohorts: fc.uniqueArray(flagCohort),
  excludeCohorts: fc.uniqueArray(flagCohort),
  sticky: fc.boolean(),
});
const anyCtx = fc.record({
  userId: anyString,
  cohorts: fc.uniqueArray(fc.oneof(flagCohort, otherCohort)),
});
/** Kill switch off. */
const liveFlag = flagArb.map((f) => ({ ...f, enabled: true }));
/** A user whose cohorts never match a flag's cohort lists. */
const noMatchCtx = fc.record({
  userId: anyString,
  cohorts: fc.uniqueArray(otherCohort),
});

describe("evaluate properties", () => {
  it("always applies the kill switch", () => {
    fc.assert(
      fc.property(flagArb, anyCtx, stored, (flag, ctx, s) => {
        expect(evaluate({ ...flag, enabled: false }, ctx, s)).toEqual({
          enabled: false,
          reason: "KILL_SWITCH",
          persist: false,
        });
      }),
    );
  });

  it("excludes a user whose cohort is in both lists", () => {
    fc.assert(
      fc.property(
        liveFlag,
        noMatchCtx,
        flagCohort,
        stored,
        (flag, ctx, shared, s) => {
          const f = {
            ...flag,
            includeCohorts: [...flag.includeCohorts, shared],
            excludeCohorts: [...flag.excludeCohorts, shared],
          };
          expect(
            evaluate(f, { ...ctx, cohorts: [...ctx.cohorts, shared] }, s),
          ).toEqual({
            enabled: false,
            reason: "COHORT_EXCLUDED",
            persist: false,
          });
        },
      ),
    );
  });

  it("includes a user in an included, non-excluded cohort", () => {
    fc.assert(
      fc.property(
        liveFlag,
        noMatchCtx,
        flagCohort,
        stored,
        (flag, ctx, cohort, s) => {
          const f = {
            ...flag,
            includeCohorts: [...flag.includeCohorts, cohort],
            excludeCohorts: flag.excludeCohorts.filter((c) => c !== cohort),
          };
          expect(
            evaluate(f, { ...ctx, cohorts: [...ctx.cohorts, cohort] }, s),
          ).toEqual({
            enabled: true,
            reason: "COHORT_INCLUDED",
            persist: false,
          });
        },
      ),
    );
  });

  it("returns a stored sticky value whatever the percentage", () => {
    fc.assert(
      fc.property(liveFlag, noMatchCtx, fc.boolean(), (flag, ctx, s) => {
        expect(evaluate({ ...flag, sticky: true }, ctx, s)).toEqual({
          enabled: s,
          reason: "STICKY",
          persist: false,
        });
      }),
    );
  });

  it("follows bucket < percentage at every percentage, so raising it never turns a user off", () => {
    fc.assert(
      fc.property(liveFlag, noMatchCtx, (flag, ctx) => {
        const b = referenceBucket(flag.key, ctx.userId);
        for (let percentage = 0; percentage <= 100; percentage++) {
          const result = evaluate({ ...flag, percentage }, ctx);
          expect(result.reason).toBe("PERCENTAGE");
          expect(result.enabled).toBe(b < percentage);
        }
      }),
      { numRuns: 200 },
    );
  });

  it("persists the percentage result of a sticky flag with nothing stored, whatever it is", () => {
    fc.assert(
      fc.property(liveFlag, noMatchCtx, stored, (flag, ctx, s) => {
        const result = evaluate(flag, ctx, s);
        const shouldPersist = flag.sticky && s === undefined;
        expect(result.persist).toBe(shouldPersist);
        if (shouldPersist) expect(result.reason).toBe("PERCENTAGE");
      }),
    );
  });

  it("never persists anything but a sticky flag's percentage result", () => {
    fc.assert(
      fc.property(
        fc.option(flagArb, { nil: null }),
        anyCtx,
        stored,
        (flag, ctx, s) => {
          const result = evaluate(flag, ctx, s);
          if (result.persist) {
            expect(result.reason).toBe("PERCENTAGE");
            expect(flag?.sticky).toBe(true);
          }
        },
      ),
    );
  });
});
