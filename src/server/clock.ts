import { type Clock, systemClock } from "../domain";

/** The app's clock: always the system clock. Tests inject `frozenClock` into their services. */
export const appClock: Clock = systemClock;
