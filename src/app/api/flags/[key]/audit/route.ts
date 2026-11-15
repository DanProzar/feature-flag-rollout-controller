import { getServices, parseKey } from "@/server";

export const dynamic = "force-dynamic";

/** The audit entries for the flag `key`, oldest first; `at` is serialised as an ISO string. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> },
): Promise<Response> {
  const key = parseKey((await params).key);
  if (key instanceof Response) return key;
  const { flags } = await getServices();
  return Response.json({ entries: await flags.audit(key) });
}
