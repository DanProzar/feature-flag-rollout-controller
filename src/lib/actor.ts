// The "Acting as" user, remembered per browser and sent as `X-User-Id` on every PUT. Storage can be
// missing or throw (private windows, blocked site data), so both functions fail soft.

export const ACTOR_STORAGE_KEY = "feature-flags.actorId";

/** The stored actor id, or `null` when none is stored or storage is unavailable. */
export function readActor(): string | null {
  try {
    return globalThis.localStorage.getItem(ACTOR_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Stores the actor id; `null` clears it. Does nothing when storage is unavailable. */
export function writeActor(actorId: string | null): void {
  try {
    if (actorId === null) {
      globalThis.localStorage.removeItem(ACTOR_STORAGE_KEY);
    } else {
      globalThis.localStorage.setItem(ACTOR_STORAGE_KEY, actorId);
    }
  } catch {
    // Storage unavailable: the actor is simply not remembered.
  }
}
