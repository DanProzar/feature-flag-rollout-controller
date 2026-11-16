import { type NextRequest, NextResponse } from "next/server";
import {
  actorIdFrom,
  getServices,
  handle,
  parseJson,
  parseKey,
  PutFlagBodySchema,
} from "@/server";

export const dynamic = "force-dynamic";

/** Creates or fully replaces the flag `key`; every call is audited. */
export const PUT = handle(
  async (request: NextRequest, ctx: RouteContext<"/api/flags/[key]">) => {
    const key = parseKey((await ctx.params).key);
    const body = await parseJson(request, PutFlagBodySchema);
    const { flags } = await getServices();
    const flag = await flags.put(key, body, actorIdFrom(request));
    return NextResponse.json({ flag });
  },
);

/** Deletes the flag `key` and its sticky assignments (audited); 404 when there is no such flag. */
export const DELETE = handle(
  async (request: NextRequest, ctx: RouteContext<"/api/flags/[key]">) => {
    const key = parseKey((await ctx.params).key);
    const { flags } = await getServices();
    const flag = await flags.delete(key, actorIdFrom(request));
    if (!flag) {
      return NextResponse.json({ error: "Flag not found" }, { status: 404 });
    }
    return NextResponse.json({ flag });
  },
);
