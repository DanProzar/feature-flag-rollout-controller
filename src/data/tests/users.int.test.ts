import { v4 } from "uuid";
import { beforeEach, describe, expect, it } from "vitest";
import { isUuidV7 } from "../schemas";
import { createUsersRepository } from "../users";
import { useTestDb } from "./harness";

const t = useTestDb();

beforeEach(() => t.clear());

describe("users repository", () => {
  it("creates users with distinct generated UUID v7 ids", async () => {
    const users = createUsersRepository(t.db);
    const alice = await users.create({ name: "Alice", cohorts: ["admin"] });
    const bob = await users.create({ name: "Bob", cohorts: [] });
    expect(isUuidV7(alice.userId)).toBe(true);
    expect(isUuidV7(bob.userId)).toBe(true);
    expect(bob.userId).not.toBe(alice.userId);
    expect(alice).toStrictEqual({
      userId: alice.userId,
      name: "Alice",
      cohorts: ["admin"],
    });
  });

  it("ignores a userId passed to create", async () => {
    const users = createUsersRepository(t.db);
    const chosen = "01a1dc80-f000-7ca2-9842-a25ac04f528a";
    const user = await users.create({
      name: "Mallory",
      cohorts: [],
      userId: chosen,
    } as never);
    expect(user.userId).not.toBe(chosen);
    expect(await users.get(chosen)).toBeNull();
  });

  it("gets a user by id, or null", async () => {
    const users = createUsersRepository(t.db);
    const alice = await users.create({ name: "Alice", cohorts: ["admin"] });
    expect(await users.get(alice.userId)).toStrictEqual(alice);
    expect(await users.get("missing")).toBeNull();
  });

  it("lists users sorted by userId, which is creation order", async () => {
    const users = createUsersRepository(t.db);
    expect(await users.list()).toEqual([]);
    const created = [];
    for (const name of ["Carol", "Alice", "Bob", "Dan", "Eve"]) {
      created.push(await users.create({ name, cohorts: [] }));
    }
    const listed = await users.list();
    expect(listed).toStrictEqual(created);
    expect(listed.map((u) => u.userId)).toEqual(
      created.map((u) => u.userId).sort(),
    );
  });

  it("throws when a stored userId is not a UUID v7", async () => {
    await t.db
      .collection("users")
      .insertOne({ userId: v4(), name: "Old", cohorts: [] });
    const users = createUsersRepository(t.db);
    await expect(users.list()).rejects.toThrow(/UUID v7/);
    const [doc] = await t.db.collection("users").find().toArray();
    await expect(users.get(doc.userId)).rejects.toThrow(/UUID v7/);
  });

  it("updates name and cohorts, returning the user", async () => {
    const users = createUsersRepository(t.db);
    const alice = await users.create({ name: "Alice", cohorts: ["admin"] });
    const updated = { userId: alice.userId, name: "Alicia", cohorts: [] };
    expect(await users.update(updated)).toStrictEqual(updated);
    expect(await users.get(alice.userId)).toStrictEqual(updated);
  });

  it("returns null when updating an unknown user, without creating it", async () => {
    const users = createUsersRepository(t.db);
    const ghost = {
      userId: "01a1dc80-f000-7ca2-9842-a25ac04f528a",
      name: "Ghost",
      cohorts: [],
    };
    expect(await users.update(ghost)).toBeNull();
    expect(await t.db.collection("users").countDocuments()).toBe(0);
  });

  it("deletes a user", async () => {
    const users = createUsersRepository(t.db);
    const alice = await users.create({ name: "Alice", cohorts: [] });
    expect(await users.delete(alice.userId)).toBe(true);
    expect(await users.delete(alice.userId)).toBe(false);
    expect(await users.get(alice.userId)).toBeNull();
  });

  it("clears all users", async () => {
    const users = createUsersRepository(t.db);
    await users.create({ name: "Alice", cohorts: [] });
    await users.create({ name: "Bob", cohorts: [] });
    await users.clear();
    expect(await users.list()).toEqual([]);
  });
});
