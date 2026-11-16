import { notFound } from "next/navigation";
import { type NextRequest, NextResponse } from "next/server";
import {
  getServices,
  handle,
  parseJson,
  ResetBodySchema,
  testEndpointsEnabled,
} from "@/server";

export const dynamic = "force-dynamic";

/**
 * Test support: clears flags and sticky assignments and records `now` as the reset time (logged and
 * echoed back; the clock keeps running). Unless `ENABLE_TEST_ENDPOINTS` is `"true"`, Next answers
 * its own 404, before the body is read.
 */
export const POST = handle(async (request: NextRequest) => {
  if (!testEndpointsEnabled()) notFound();
  const body = await parseJson(request, ResetBodySchema);
  const { reset } = await getServices();
  await reset.reset(body.now);
  return NextResponse.json({ now: body.now.toISOString() });
});
