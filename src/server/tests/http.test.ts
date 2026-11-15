import { describe, expect, it } from "vitest";
import { z } from "zod";
import { actorIdFrom, invalidKey, parseJson, parseKey } from "../http";

const Schema = z.object({ name: z.string().min(1), count: z.int() });

function jsonRequest(body: string, headers: HeadersInit = {}): Request {
  return new Request("http://localhost/test", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
  });
}

async function read(response: Response) {
  return { status: response.status, body: await response.json() };
}

describe("parseJson", () => {
  it("returns the parsed value", async () => {
    const value = await parseJson(
      jsonRequest('{"name":"a","count":1,"extra":true}'),
      Schema,
    );
    expect(value).toStrictEqual({ name: "a", count: 1 });
  });

  it.each(["", "{", "not json", "{'name':'a'}"])(
    "answers 400 Invalid JSON for %j",
    async (body) => {
      const response = await parseJson(jsonRequest(body), Schema);
      expect(response).toBeInstanceOf(Response);
      expect(await read(response as Response)).toEqual({
        status: 400,
        body: { error: "Invalid JSON", issues: {} },
      });
    },
  );

  it("answers 400 with the failing field names on a schema failure", async () => {
    const response = await parseJson(jsonRequest('{"count":1.5}'), Schema);
    const { status, body } = await read(response as Response);
    expect(status).toBe(400);
    expect(body.error).toBe("Invalid request body");
    expect(Object.keys(body.issues).sort()).toEqual(["count", "name"]);
    expect(body.issues.name).toEqual([expect.any(String)]);
  });

  it("answers 400 for valid JSON that is not an object", async () => {
    const response = await parseJson(jsonRequest("[1]"), Schema);
    const { status, body } = await read(response as Response);
    expect(status).toBe(400);
    expect(body).toEqual({ error: "Invalid request body", issues: {} });
  });
});

describe("parseKey / invalidKey", () => {
  it("returns a valid key", () => {
    expect(parseKey("new-checkout")).toBe("new-checkout");
  });

  it("answers 400 Invalid flag key with issues on key", async () => {
    const response = parseKey("Bad Key");
    expect(response).toBeInstanceOf(Response);
    const { status, body } = await read(response as Response);
    expect(status).toBe(400);
    expect(body).toEqual({
      error: "Invalid flag key",
      issues: { key: [expect.any(String)] },
    });
  });

  it("invalidKey builds the same shape", async () => {
    expect(await read(invalidKey(["bad"]))).toEqual({
      status: 400,
      body: { error: "Invalid flag key", issues: { key: ["bad"] } },
    });
  });
});

describe("actorIdFrom", () => {
  it("is the trimmed X-User-Id header", () => {
    expect(actorIdFrom(jsonRequest("{}", { "X-User-Id": " dev-1 " }))).toBe(
      "dev-1",
    );
  });

  it.each([undefined, "", "   "])("is null for header %j", (value) => {
    const headers: Record<string, string> =
      value === undefined ? {} : { "X-User-Id": value };
    expect(actorIdFrom(jsonRequest("{}", headers))).toBeNull();
  });
});
