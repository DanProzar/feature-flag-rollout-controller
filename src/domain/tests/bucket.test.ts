import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { bucket } from "../bucket";
import { referenceBucket, referenceCrc32 } from "./helpers";

// Arbitrary Unicode, including astral characters and lone surrogates.
const anyString = fc.string({ unit: "binary" });

describe("bucket", () => {
  it("is checked against a correct reference CRC-32 (IEEE 802.3 check value)", () => {
    expect(referenceCrc32("123456789")).toBe(0xcbf43926);
  });

  // Pinned values: changing the algorithm reshuffles every non-sticky user, so this must fail loudly.
  it.each([
    {
      flagKey: "new-checkout",
      userId: "user-1",
      crc: 0xde8c4484,
      expected: 32,
    },
    {
      flagKey: "new-checkout",
      userId: "user-2",
      crc: 0x4785153e,
      expected: 62,
    },
    { flagKey: "dark-mode", userId: "alice", crc: 0xae82ed06, expected: 42 },
    { flagKey: "dark-mode", userId: "bob", crc: 0xef85ebec, expected: 8 },
    // Case and surrounding spaces are part of the input: no lowercasing or trimming.
    { flagKey: "Dark-Mode", userId: " Alice ", crc: 0x26d0a895, expected: 53 },
    // UTF-8 bytes, no Unicode normalisation: composed and decomposed "é" differ.
    { flagKey: "flag", userId: "\u00e9", crc: 0x6ebe0740, expected: 56 },
    { flagKey: "flag", userId: "e\u0301", crc: 0xfb701d9c, expected: 28 },
    { flagKey: "прапор", userId: "користувач", crc: 0x3b75751e, expected: 38 },
    { flagKey: "rocket", userId: "🚀", crc: 0xb1d980c7, expected: 11 },
    { flagKey: "", userId: "", crc: 0x140e363f, expected: 11 },
  ])(
    "bucket($flagKey, $userId) → $expected",
    ({ flagKey, userId, crc, expected }) => {
      expect(referenceCrc32(`${flagKey}:${userId}`)).toBe(crc);
      expect(crc % 100).toBe(expected);
      expect(bucket(flagKey, userId)).toBe(expected);
    },
  );

  it("treats the hash as unsigned when it is ≥ 2^31", () => {
    // 0xDE8C4484 read as a signed int32 is negative and would give a bucket of -64.
    expect(referenceCrc32("new-checkout:user-1")).toBeGreaterThanOrEqual(
      2 ** 31,
    );
    expect(bucket("new-checkout", "user-1")).toBe(32);
  });

  it("matches the reference CRC-32 of the UTF-8 bytes of flagKey:userId", () => {
    fc.assert(
      fc.property(anyString, anyString, (flagKey, userId) => {
        expect(bucket(flagKey, userId)).toBe(referenceBucket(flagKey, userId));
      }),
      { numRuns: 1000 },
    );
  });

  it("is an integer in [0, 99]", () => {
    fc.assert(
      fc.property(anyString, anyString, (flagKey, userId) => {
        const b = bucket(flagKey, userId);
        return Number.isInteger(b) && b >= 0 && b <= 99;
      }),
    );
  });

  it("varies across flag keys for the same user", () => {
    fc.assert(
      fc.property(anyString, (userId) => {
        const buckets = new Set(
          Array.from({ length: 20 }, (_, i) => bucket(`flag-${i}`, userId)),
        );
        return buckets.size > 1;
      }),
    );
  });
});
