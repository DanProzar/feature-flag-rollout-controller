import { EvaluateBodySchema, getServices, parseJson, parseKey } from "@/server";

export const dynamic = "force-dynamic";

/** Evaluates the flag `key` for `{ userId, cohorts }`; an unknown flag is `FLAG_NOT_FOUND`. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ key: string }> },
): Promise<Response> {
  const key = parseKey((await params).key);
  if (key instanceof Response) return key;
  const body = await parseJson(request, EvaluateBodySchema);
  if (body instanceof Response) return body;
  const { flags } = await getServices();
  return Response.json(await flags.evaluate(key, body));
}
