import type { Reason } from "../domain";
import type { EvaluateFlagResult } from "./api-client";

// The /demo storefront: which seed flag drives which feature, and what the storefront shows for a
// set of evaluations. Anything but a successful `enabled: true` answer counts as off (fail safe).

export type StorefrontFeature =
  "newCheckout" | "darkMode" | "search" | "banner" | "assistant";

/** The storefront's flag-driven features, in display order. */
export const DEMO_FEATURES: readonly {
  key: string;
  feature: StorefrontFeature;
  label: string;
}[] = [
  { key: "beta-search", feature: "search", label: "Search bar" },
  { key: "legacy-banner", feature: "banner", label: "Promo banner" },
  { key: "new-checkout", feature: "newCheckout", label: "New checkout" },
  { key: "dark-mode", feature: "darkMode", label: "Dark mode" },
  { key: "ai-assistant", feature: "assistant", label: "AI assistant" },
];

export type DemoEvaluation =
  | { status: "loading" }
  | { status: "ok"; enabled: boolean; reason: Reason }
  | { status: "error"; error: string };

export type StorefrontModel = Record<StorefrontFeature, boolean> & {
  /** Every feature is off: the storefront is the legacy product. */
  legacy: boolean;
};

/** Which storefront features are on for these evaluations, keyed by flag key. */
export function storefrontModel(
  evaluations: Record<string, DemoEvaluation>,
): StorefrontModel {
  const features = Object.fromEntries(
    DEMO_FEATURES.map(({ key, feature }) => {
      const evaluation = evaluations[key];
      return [feature, evaluation?.status === "ok" && evaluation.enabled];
    }),
  ) as Record<StorefrontFeature, boolean>;
  return { ...features, legacy: !Object.values(features).some(Boolean) };
}

/** An evaluate call's result as a grid row. */
export function toDemoEvaluation(result: EvaluateFlagResult): DemoEvaluation {
  return result.ok
    ? { status: "ok", enabled: result.enabled, reason: result.reason }
    : { status: "error", error: result.error };
}

/** The keys sorted, as a new array. */
export function sortFlagKeys(keys: readonly string[]): string[] {
  return [...keys].sort();
}
