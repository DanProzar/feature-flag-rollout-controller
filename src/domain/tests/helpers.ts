import { bucket } from "../bucket";

/** Finds a userId whose bucket for `flagKey` satisfies `predicate`; throws instead of looping forever. */
export function findUser(
  flagKey: string,
  predicate: (bucket: number) => boolean,
  maxTries = 10_000,
): string {
  for (let i = 0; i < maxTries; i++) {
    const userId = `user-${i}`;
    if (predicate(bucket(flagKey, userId))) return userId;
  }
  throw new Error(`No user found for "${flagKey}" in ${maxTries} tries`);
}

/**
 * Bitwise CRC-32 (IEEE 802.3), written independently of `node:zlib` and `Buffer`, so tests can
 * check `bucket` against a second implementation.
 */
export function referenceCrc32(text: string): number {
  let crc = 0xffffffff;
  for (const byte of new TextEncoder().encode(text)) {
    crc ^= byte;
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function referenceBucket(flagKey: string, userId: string): number {
  return referenceCrc32(`${flagKey}:${userId}`) % 100;
}
