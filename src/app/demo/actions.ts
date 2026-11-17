"use server";

import { cookies } from "next/headers";
import {
  getServices,
  type SelectDemoUserResult,
  selectDemoUser as selectDemoUserService,
} from "@/server";

/** Remembers the /demo "Acting as" user in the httpOnly `ff_demo_user` session cookie. */
export async function selectDemoUser(
  userId: unknown,
): Promise<SelectDemoUserResult> {
  const [services, cookieStore] = await Promise.all([getServices(), cookies()]);
  return selectDemoUserService(
    services.catalog,
    userId,
    (name, value, options) => cookieStore.set(name, value, options),
  );
}
