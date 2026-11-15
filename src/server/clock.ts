import { type Clock, frozenClock, systemClock } from "../domain";

// The current delegate lives on `globalThis` so Next.js dev hot reloads keep a frozen clock and
// every route handler sees the same one.
const globalForClock = globalThis as typeof globalThis & {
  __featureFlagsClock?: Clock;
};

/** The app's clock: the system clock until `freezeClock`, then the frozen instant. */
export const appClock: Clock = {
  now: () => (globalForClock.__featureFlagsClock ?? systemClock).now(),
};

/** Freezes `appClock` at `at` until the next `freezeClock` (or `unfreezeClock`). */
export function freezeClock(at: Date): void {
  globalForClock.__featureFlagsClock = frozenClock(at);
}

/** Puts `appClock` back on the system clock; for test teardown. */
export function unfreezeClock(): void {
  delete globalForClock.__featureFlagsClock;
}
