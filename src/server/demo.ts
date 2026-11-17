import { z } from "zod";
import type { CatalogService } from "./catalog";

// The /demo page's selected user, remembered in an httpOnly session cookie that only the
// `selectDemoUser` Server Function writes. It is a UI preference, not a credential.

export const DEMO_USER_COOKIE = "ff_demo_user";

/** No `maxAge`/`expires`: a session cookie. `Path=/demo` keeps it off every other request. */
export const DEMO_USER_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "strict",
  path: "/demo",
} as const;

export const DemoUserIdSchema = z.string().trim().min(1);

/** The user the cookie names, else the first user; `null` when there are no users. */
export function resolveDemoUser<T extends { userId: string }>(
  users: readonly T[],
  cookieValue: string | undefined,
): T | null {
  return users.find((user) => user.userId === cookieValue) ?? users[0] ?? null;
}

export type SelectDemoUserResult = { ok: true } | { ok: false; error: string };

export type SetDemoUserCookie = (
  name: string,
  value: string,
  options: typeof DEMO_USER_COOKIE_OPTIONS,
) => void;

/**
 * Remembers `userId` as the demo user when it is a stored user's id. Never throws for bad input:
 * anything else is a failure and the cookie is left unchanged.
 */
export async function selectDemoUser(
  catalog: Pick<CatalogService, "users">,
  userId: unknown,
  setCookie: SetDemoUserCookie,
): Promise<SelectDemoUserResult> {
  const parsed = DemoUserIdSchema.safeParse(userId);
  if (!parsed.success) return { ok: false, error: "Invalid user id" };
  const users = await catalog.users();
  if (!users.some((user) => user.userId === parsed.data)) {
    return { ok: false, error: "Unknown user" };
  }
  setCookie(DEMO_USER_COOKIE, parsed.data, DEMO_USER_COOKIE_OPTIONS);
  return { ok: true };
}
