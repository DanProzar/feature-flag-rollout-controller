import { type Db, MongoClient } from "mongodb";
import { loadConfig } from "./config";

interface Connection {
  client: MongoClient;
  db: Db;
}

// Cached on `globalThis` so Next.js dev hot reloads reuse the connection instead of leaking one
// per reload.
const globalForMongo = globalThis as typeof globalThis & {
  __featureFlagsMongo?: Promise<Connection>;
};

async function connect(): Promise<Connection> {
  const config = loadConfig();
  // A short server-selection timeout fails requests within seconds when MongoDB is down, instead of
  // the driver's default 30 s.
  const client = await new MongoClient(config.mongodbUri, {
    serverSelectionTimeoutMS: config.serverSelectionTimeoutMs,
  }).connect();
  return { client, db: client.db(config.mongodbDb) };
}

/** The app's database, connecting on first use; concurrent callers share one connection. */
export function getDb(): Promise<Db> {
  if (!globalForMongo.__featureFlagsMongo) {
    const pending = connect();
    globalForMongo.__featureFlagsMongo = pending;
    // A failed attempt must not stick: the next call retries.
    pending.catch(() => {
      if (globalForMongo.__featureFlagsMongo === pending) {
        delete globalForMongo.__featureFlagsMongo;
      }
    });
  }
  return globalForMongo.__featureFlagsMongo.then((c) => c.db);
}

/** Closes the shared connection, if any; the next `getDb()` reconnects. */
export async function closeDb(): Promise<void> {
  const pending = globalForMongo.__featureFlagsMongo;
  if (!pending) return;
  delete globalForMongo.__featureFlagsMongo;
  // A connection that failed has nothing to close.
  const connection = await pending.catch(() => undefined);
  await connection?.client.close();
}
