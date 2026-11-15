import {
  actorIdFrom,
  getServices,
  parseJson,
  parseKey,
  PutFlagBodySchema,
} from "@/server";

export const dynamic = "force-dynamic";

/** Creates or fully replaces the flag `key`; every call is audited. */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ key: string }> },
): Promise<Response> {
  const key = parseKey((await params).key);
  if (key instanceof Response) return key;
  const body = await parseJson(request, PutFlagBodySchema);
  if (body instanceof Response) return body;
  const { flags } = await getServices();
  const flag = await flags.put(key, body, actorIdFrom(request));
  return Response.json({ flag });
}
