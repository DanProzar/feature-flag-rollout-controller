import { crc32 } from "node:zlib";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { bucket } from "../bucket";

describe("bucket", () => {
  it("uses standard CRC-32 (IEEE 802.3 check value)", () => {
    expect(crc32(Buffer.from("123456789", "utf8"))).toBe(0xcbf43926);
  });

  // Pinned values: changing the algorithm reshuffles every non-sticky user, so this must fail loudly.
  it.each([
    ["new-checkout", "user-1", 0xde8c4484, 32],
    ["new-checkout", "user-2", 0x4785153e, 62],
    ["dark-mode", "alice", 0xae82ed06, 42],
    ["dark-mode", "bob", 0xef85ebec, 8],
    ["прапор", "користувач", 0x3b75751e, 38],
    ["rocket", "🚀", 0xb1d980c7, 11],
    ["", "", 0x140e363f, 11],
  ])("bucket(%j, %j) hashes to %i → %i", (flagKey, userId, crc, expected) => {
    expect(crc % 100).toBe(expected);
    expect(bucket(flagKey, userId)).toBe(expected);
  });

  it("hashes the UTF-8 bytes of non-ASCII input", () => {
    const utf8 = crc32(Buffer.from("прапор:користувач", "utf8")) % 100;
    const utf16 = crc32(Buffer.from("прапор:користувач", "utf16le")) % 100;
    expect(utf8).not.toBe(utf16);
    expect(bucket("прапор", "користувач")).toBe(utf8);
  });

  it("treats the hash as unsigned when it is ≥ 2^31", () => {
    // 0xDE8C4484 read as a signed int32 would give a bucket of -64.
    expect(0xde8c4484).toBeGreaterThanOrEqual(2 ** 31);
    expect(0xde8c4484 | 0).toBeLessThan(0);
    expect(bucket("new-checkout", "user-1")).toBe(32);
  });

  it("is an integer in [0, 99]", () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (flagKey, userId) => {
        const b = bucket(flagKey, userId);
        return Number.isInteger(b) && b >= 0 && b <= 99;
      }),
    );
  });

  it("is deterministic", () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (flagKey, userId) => {
        return bucket(flagKey, userId) === bucket(flagKey, userId);
      }),
    );
  });

  it("varies across flag keys for the same user", () => {
    fc.assert(
      fc.property(fc.string(), (userId) => {
        const buckets = new Set(
          Array.from({ length: 20 }, (_, i) => bucket(`flag-${i}`, userId)),
        );
        return buckets.size > 1;
      }),
    );
  });
});
