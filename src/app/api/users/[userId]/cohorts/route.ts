import { type NextRequest, NextResponse } from "next/server";
import {
  getServices,
  handle,
  parseJson,
  parseUserId,
  UserCohortsBodySchema,
} from "@/server";

export const dynamic = "force-dynamic";

/** Replaces the cohorts of the user `userId`; 400 for a malformed id, 404 for an unknown user. */
export const PUT = handle(
  async (
    request: NextRequest,
    ctx: RouteContext<"/api/users/[userId]/cohorts">,
  ) => {
    const userId = parseUserId((await ctx.params).userId);
    const { cohorts } = await parseJson(request, UserCohortsBodySchema);
    const { catalog } = await getServices();
    const user = await catalog.setUserCohorts(userId, cohorts);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ user });
  },
);
