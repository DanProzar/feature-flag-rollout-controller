/**
 * Whether `POST /api/test/reset` is served; only the exact string `"true"` enables it. Read per
 * request, not cached.
 */
export function testEndpointsEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.ENABLE_TEST_ENDPOINTS === "true";
}
