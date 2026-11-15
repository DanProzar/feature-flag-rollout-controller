import { afterEach, describe, expect, it, vi } from "vitest";
import { ACTOR_STORAGE_KEY, readActor, writeActor } from "../actor";

function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => void items.delete(key),
    setItem: (key, value) => void items.set(key, String(value)),
  };
}

function throwingStorage(): Storage {
  const fail = () => {
    throw new Error("SecurityError");
  };
  return {
    length: 0,
    clear: fail,
    getItem: fail,
    key: fail,
    removeItem: fail,
    setItem: fail,
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("actor storage", () => {
  it("reads null when nothing is stored", () => {
    vi.stubGlobal("localStorage", memoryStorage());
    expect(readActor()).toBeNull();
  });

  it("round-trips the actor under its storage key", () => {
    const storage = memoryStorage();
    vi.stubGlobal("localStorage", storage);
    writeActor("dev-1");
    expect(storage.getItem(ACTOR_STORAGE_KEY)).toBe("dev-1");
    expect(readActor()).toBe("dev-1");
  });

  it("clears the actor with null", () => {
    vi.stubGlobal("localStorage", memoryStorage());
    writeActor("dev-1");
    writeActor(null);
    expect(readActor()).toBeNull();
  });

  it("tolerates storage that throws", () => {
    vi.stubGlobal("localStorage", throwingStorage());
    expect(readActor()).toBeNull();
    expect(() => writeActor("dev-1")).not.toThrow();
  });

  it("tolerates missing storage", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(readActor()).toBeNull();
    expect(() => writeActor(null)).not.toThrow();
  });
});
