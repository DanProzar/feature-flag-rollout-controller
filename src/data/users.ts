import type { Db } from "mongodb";
import { v7 } from "uuid";
import { type User, UserSchema } from "./schemas";

/** A user before it has an id; `create` always generates the `userId`. */
export type NewUser = Omit<User, "userId">;

export interface UsersRepository {
  get(userId: string): Promise<User | null>;
  /** Every user, sorted by `userId` (creation order, since UUID v7 is time-ordered). */
  list(): Promise<User[]>;
  create(user: NewUser): Promise<User>;
  /** Replaces `name` and `cohorts`; `null` when there is no such user (never creates one). */
  update(user: User): Promise<User | null>;
  /** Replaces only `cohorts`; `null` when there is no such user (never creates one). */
  setCohorts(userId: string, cohorts: string[]): Promise<User | null>;
  /** `true` if a user was removed. */
  delete(userId: string): Promise<boolean>;
  clear(): Promise<void>;
}

export function createUsersRepository(db: Db): UsersRepository {
  const users = db.collection<User>("users");

  return {
    async get(userId) {
      const doc = await users.findOne({ userId });
      return doc && UserSchema.parse(doc);
    },

    async list() {
      const docs = await users.find().sort({ userId: 1 }).toArray();
      return docs.map((doc) => UserSchema.parse(doc));
    },

    async create({ name, cohorts }) {
      const user: User = { userId: v7(), name, cohorts };
      await users.insertOne({ ...user });
      return user;
    },

    async update({ userId, name, cohorts }) {
      const doc = await users.findOneAndUpdate(
        { userId },
        { $set: { name, cohorts } },
        { returnDocument: "after" },
      );
      return doc && UserSchema.parse(doc);
    },

    async setCohorts(userId, cohorts) {
      const doc = await users.findOneAndUpdate(
        { userId },
        { $set: { cohorts } },
        { returnDocument: "after" },
      );
      return doc && UserSchema.parse(doc);
    },

    async delete(userId) {
      const { deletedCount } = await users.deleteOne({ userId });
      return deletedCount === 1;
    },

    async clear() {
      await users.deleteMany({});
    },
  };
}
