/** Source of the current time; all timestamps go through a `Clock` so tests can freeze it. */
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = {
  now: () => new Date(),
};

/** A clock stuck at `at`. Returns a fresh copy each call so callers can't change it. */
export function frozenClock(at: Date): Clock {
  const ms = at.getTime();
  return { now: () => new Date(ms) };
}
