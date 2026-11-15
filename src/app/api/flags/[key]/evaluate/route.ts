import { type NextRequest, NextResponse } from "next/server";
import {
  EvaluateBodySchema,
  getServices,
  handle,
  parseJson,
  parseKey,
} from "@/server";

export const dynamic = "force-dynamic";

/** Evaluates the flag `key` for `{ userId, cohorts }`; an unknown flag is `FLAG_NOT_FOUND`. */
export const POST = handle(
  async (
    request: NextRequest,
    ctx: RouteContext<"/api/flags/[key]/evaluate">,
  ) => {
    const key = parseKey((await ctx.params).key);
    const body = await parseJson(request, EvaluateBodySchema);
    const { flags } = await getServices();
    return NextResponse.json(await flags.evaluate(key, body));
  },
);
