import { describe, expect, it } from "vitest";
import {
  DEMO_USER_COOKIE,
  DEMO_USER_COOKIE_OPTIONS,
  DemoUserIdSchema,
  resolveDemoUser,
} from "../demo";

const USERS = [
  { userId: "u-1", name: "Alice" },
  { userId: "u-2", name: "Bob" },
];

describe("resolveDemoUser", () => {
  it("returns the user the cookie names", () => {
    expect(resolveDemoUser(USERS, "u-2")).toBe(USERS[1]);
  });

  it.each([
    ["unknown id", "u-9"],
    ["no cookie", undefined],
  ])("falls back to the first user for %s", (_, cookieValue) => {
    expect(resolveDemoUser(USERS, cookieValue)).toBe(USERS[0]);
  });

  it("is null without users", () => {
    expect(resolveDemoUser([], "u-1")).toBeNull();
  });
});

describe("DemoUserIdSchema", () => {
  it("trims the id", () => {
    expect(DemoUserIdSchema.parse("  u-1 ")).toBe("u-1");
  });

  it.each(["", "   ", 42, null, undefined])("rejects %j", (value) => {
    expect(DemoUserIdSchema.safeParse(value).success).toBe(false);
  });
});

describe("demo user cookie", () => {
  it("is an httpOnly, secure, strict session cookie scoped to /demo", () => {
    expect(DEMO_USER_COOKIE).toBe("ff_demo_user");
    expect(DEMO_USER_COOKIE_OPTIONS).toStrictEqual({
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/demo",
    });
  });
});
