import { notFound } from "next/navigation";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  actorIdFrom,
  BadRequestError,
  handle,
  parseJson,
  parseKey,
  parseUserId,
} from "../http";

import { MAX_ID_LENGTH } from "../schemas";

const Schema = z.object({ name: z.string().min(1), count: z.int() });

function jsonRequest(body: string, headers: HeadersInit = {}): NextRequest {
  return new NextRequest("http://localhost/test", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
  });
}

/** What `parseJson` / `parseKey` threw, as `handle` would answer it. */
async function answer(parse: () => unknown) {
  const response = await handle(async () => {
    await parse();
    return new Response("unreachable");
  })();
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
    "throws Invalid JSON for %j",
    async (body) => {
      await expect(parseJson(jsonRequest(body), Schema)).rejects.toThrow(
        BadRequestError,
      );
      expect(await answer(() => parseJson(jsonRequest(body), Schema))).toEqual({
        status: 400,
        body: { error: "Invalid JSON", issues: {} },
      });
    },
  );

  it("throws with the failing field names on a schema failure", async () => {
    const { status, body } = await answer(() =>
      parseJson(jsonRequest('{"count":1.5}'), Schema),
    );
    expect(status).toBe(400);
    expect(body.error).toBe("Invalid request body");
    expect(Object.keys(body.issues).sort()).toEqual(["count", "name"]);
    expect(body.issues.name).toEqual([expect.any(String)]);
  });

  it.each(["[1]", '"x"', "null"])(
    "reports valid JSON that is not an object (%s) under issues.body",
    async (json) => {
      expect(await answer(() => parseJson(jsonRequest(json), Schema))).toEqual({
        status: 400,
        body: {
          error: "Invalid request body",
          issues: { body: [expect.stringContaining("expected object")] },
        },
      });
    },
  );
});

describe("parseKey", () => {
  it("returns a valid key", () => {
    expect(parseKey("new-checkout")).toBe("new-checkout");
  });

  it("throws Invalid flag key with issues on key", async () => {
    expect(() => parseKey("Bad Key")).toThrow(BadRequestError);
    expect(await answer(() => parseKey("Bad Key"))).toEqual({
      status: 400,
      body: {
        error: "Invalid flag key",
        issues: { key: [expect.any(String)] },
      },
    });
  });
});

describe("parseUserId", () => {
  const ID = "019a8f00-0000-7000-8000-000000000001";

  it("returns a UUID", () => {
    expect(parseUserId(ID)).toBe(ID);
  });

  it.each(["not-a-uuid", "", `${ID}x`])(
    "throws Invalid user id for %j",
    async (userId) => {
      expect(await answer(() => parseUserId(userId))).toEqual({
        status: 400,
        body: {
          error: "Invalid user id",
          issues: { userId: [expect.any(String)] },
        },
      });
    },
  );
});

describe("handle", () => {
  it("passes the arguments through and returns the handler's response", async () => {
    const handler = handle(async (a: number, b: string) =>
      Response.json({ a, b }),
    );
    const response = await handler(1, "x");
    expect(await response.json()).toEqual({ a: 1, b: "x" });
  });

  it("answers a BadRequestError with 400 { error, issues }", async () => {
    const response = await handle(async () => {
      throw new BadRequestError("Nope", { field: ["bad"] });
    })();
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Nope",
      issues: { field: ["bad"] },
    });
  });

  it("rethrows other errors for Next to answer", async () => {
    const boom = new Error("boom");
    await expect(
      handle(async () => {
        throw boom;
      })(),
    ).rejects.toBe(boom);
  });

  it("rethrows Next's notFound() so Next answers 404", async () => {
    await expect(handle(async () => notFound())()).rejects.toMatchObject({
      digest: expect.stringMatching(/^NEXT_HTTP_ERROR_FALLBACK;404/),
    });
  });
});

describe("actorIdFrom", () => {
  it("is the trimmed X-User-Id header", () => {
    expect(actorIdFrom(jsonRequest("{}", { "X-User-Id": " dev-1 " }))).toBe(
      "dev-1",
    );
  });

  it("accepts a header of MAX_ID_LENGTH characters", () => {
    const id = "a".repeat(MAX_ID_LENGTH);
    expect(actorIdFrom(jsonRequest("{}", { "X-User-Id": id }))).toBe(id);
  });

  it("throws Invalid X-User-Id header when it is longer", async () => {
    const headers = { "X-User-Id": "a".repeat(MAX_ID_LENGTH + 1) };
    expect(await answer(() => actorIdFrom(jsonRequest("{}", headers)))).toEqual(
      {
        status: 400,
        body: {
          error: "Invalid X-User-Id header",
          issues: { "x-user-id": [expect.any(String)] },
        },
      },
    );
  });

  it.each([undefined, "", "   "])("is null for header %j", (value) => {
    const headers: Record<string, string> =
      value === undefined ? {} : { "X-User-Id": value };
    expect(actorIdFrom(jsonRequest("{}", headers))).toBeNull();
  });
});
