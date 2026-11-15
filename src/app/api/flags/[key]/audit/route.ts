import { type NextRequest, NextResponse } from "next/server";
import { getServices, handle, parseKey } from "@/server";

export const dynamic = "force-dynamic";

/** The audit entries for the flag `key`, oldest first; `at` is serialised as an ISO string. */
export const GET = handle(
  async (
    _request: NextRequest,
    ctx: RouteContext<"/api/flags/[key]/audit">,
  ) => {
    const key = parseKey((await ctx.params).key);
    const { flags } = await getServices();
    return NextResponse.json({ entries: await flags.audit(key) });
  },
);
