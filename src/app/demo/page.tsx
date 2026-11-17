import { cookies } from "next/headers";
import { DemoPage } from "@/components/demo/demo-page";
import { DEMO_USER_COOKIE, getServices, resolveDemoUser } from "@/server";

export const dynamic = "force-dynamic";

/** Loads the flags and users; every evaluation happens in the browser, like a client app. */
export default async function Demo() {
  const services = await getServices();
  const [flags, users, cookieStore] = await Promise.all([
    services.flags.list(),
    services.catalog.users(),
    cookies(),
  ]);
  const selected = resolveDemoUser(
    users,
    cookieStore.get(DEMO_USER_COOKIE)?.value,
  );

  return (
    <DemoPage
      flags={flags.map(({ key }) => ({ key }))}
      users={users.map(({ userId, name, cohorts }) => ({
        userId,
        name,
        cohorts,
      }))}
      selectedUserId={selected?.userId ?? null}
    />
  );
}
