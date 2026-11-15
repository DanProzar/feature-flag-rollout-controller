import {
  getServices,
  parseJson,
  ResetBodySchema,
  testEndpointsEnabled,
} from "@/server";

export const dynamic = "force-dynamic";

/**
 * Test support: clears flags and sticky assignments and freezes the clock at `now`. Answers 404,
 * before looking at the body, unless `ENABLE_TEST_ENDPOINTS` is `"true"`.
 */
export async function POST(request: Request): Promise<Response> {
  if (!testEndpointsEnabled()) return new Response(null, { status: 404 });
  const body = await parseJson(request, ResetBodySchema);
  if (body instanceof Response) return body;
  const { reset } = await getServices();
  await reset.reset(body.now);
  return Response.json({ now: body.now.toISOString() });
}
