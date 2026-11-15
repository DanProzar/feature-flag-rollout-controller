// `npm run seed`: creates indexes and seeds every empty collection. Exit 0 when done (including
// when there was nothing to seed), 1 on any error.
import { systemClock } from "../domain";
import { closeDb, getDb } from "./client";
import { loadConfig } from "./config";
import { ensureIndexes } from "./indexes";
import { seed } from "./seed";

async function main() {
  loadConfig();
  const db = await getDb();
  try {
    await ensureIndexes(db);
    const result = await seed(db, systemClock);
    for (const [name, { seeded, count }] of Object.entries(result)) {
      console.log(
        seeded
          ? `seeded ${count} ${name}`
          : `${name} already present, skipping`,
      );
    }
  } finally {
    await closeDb();
  }
}

main().then(
  () => process.exit(0),
  (error: unknown) => {
    console.error(
      `seed failed: ${error instanceof Error ? error.message : error}`,
    );
    process.exit(1);
  },
);
