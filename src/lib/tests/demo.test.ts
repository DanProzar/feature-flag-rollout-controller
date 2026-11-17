import { describe, expect, it } from "vitest";
import { SEED_FLAGS } from "../../data";
import {
  DEMO_FEATURES,
  type DemoEvaluation,
  sortFlagKeys,
  storefrontModel,
  toDemoEvaluation,
} from "../demo";

const ON: DemoEvaluation = {
  status: "ok",
  enabled: true,
  reason: "PERCENTAGE",
};
const OFF: DemoEvaluation = {
  status: "ok",
  enabled: false,
  reason: "KILL_SWITCH",
};

const ALL_ON = Object.fromEntries(DEMO_FEATURES.map(({ key }) => [key, ON]));

const ALL_OFF_MODEL = {
  newCheckout: false,
  darkMode: false,
  search: false,
  banner: false,
  assistant: false,
  legacy: true,
};

describe("DEMO_FEATURES", () => {
  it("lists exactly the seed flag keys", () => {
    expect(DEMO_FEATURES.map(({ key }) => key).sort()).toEqual(
      SEED_FLAGS.map(({ key }) => key).sort(),
    );
  });
});

describe("storefrontModel", () => {
  it("turns every feature on when every seed flag is on", () => {
    expect(storefrontModel(ALL_ON)).toEqual({
      newCheckout: true,
      darkMode: true,
      search: true,
      banner: true,
      assistant: true,
      legacy: false,
    });
  });

  it.each<[string, DemoEvaluation | undefined]>([
    ["enabled: false", OFF],
    ["loading", { status: "loading" }],
    ["error", { status: "error", error: "boom" }],
    ["missing", undefined],
  ])("treats a %s evaluation as off", (_, evaluation) => {
    const evaluations: Record<string, DemoEvaluation> = { ...ALL_ON };
    if (evaluation) evaluations["dark-mode"] = evaluation;
    else delete evaluations["dark-mode"];
    expect(storefrontModel(evaluations)).toEqual({
      newCheckout: true,
      darkMode: false,
      search: true,
      banner: true,
      assistant: true,
      legacy: false,
    });
  });

  it("is fully legacy with no evaluations", () => {
    expect(storefrontModel({})).toEqual(ALL_OFF_MODEL);
  });

  it("is fully legacy when every seed flag is off", () => {
    const allOff = Object.fromEntries(
      DEMO_FEATURES.map(({ key }) => [key, OFF]),
    );
    expect(storefrontModel(allOff)).toEqual(ALL_OFF_MODEL);
  });

  it("is not legacy once a single feature is on", () => {
    expect(storefrontModel({ "ai-assistant": ON })).toEqual({
      ...ALL_OFF_MODEL,
      assistant: true,
      legacy: false,
    });
  });

  it("ignores keys other than the seed flags", () => {
    expect(storefrontModel({ "some-other-flag": ON })).toEqual(ALL_OFF_MODEL);
  });
});

describe("toDemoEvaluation", () => {
  it("keeps a successful answer", () => {
    expect(
      toDemoEvaluation({ ok: true, enabled: true, reason: "STICKY" }),
    ).toEqual({ status: "ok", enabled: true, reason: "STICKY" });
  });

  it("keeps a failure's message", () => {
    expect(
      toDemoEvaluation({ ok: false, error: "Network error: down", issues: {} }),
    ).toEqual({ status: "error", error: "Network error: down" });
  });
});

describe("sortFlagKeys", () => {
  it("returns a sorted copy without mutating its input", () => {
    const keys = ["new-checkout", "ai-assistant", "dark-mode"];
    expect(sortFlagKeys(keys)).toEqual([
      "ai-assistant",
      "dark-mode",
      "new-checkout",
    ]);
    expect(keys).toEqual(["new-checkout", "ai-assistant", "dark-mode"]);
  });
});
