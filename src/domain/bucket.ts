import { crc32 } from "node:zlib";

/**
 * Stable 0–99 bucket for a user within a flag: unsigned CRC-32 of the UTF-8 bytes of
 * `flagKey:userId`, mod 100. Fixed forever — changing it reshuffles every non-sticky user.
 */
export function bucket(flagKey: string, userId: string): number {
  return crc32(Buffer.from(`${flagKey}:${userId}`, "utf8")) % 100;
}
