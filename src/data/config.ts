import { z } from "zod";

export interface DataConfig {
  mongodbUri: string;
  mongodbDb: string;
  /** How long the driver looks for a server before failing an operation. */
  serverSelectionTimeoutMs: number;
}

const DEFAULT_SERVER_SELECTION_TIMEOUT_MS = 5000;

const EnvSchema = z.object({
  MONGODB_URI: z.string().min(1),
  MONGODB_DB: z.string().min(1),
});

const TIMEOUT_VAR = "MONGODB_SERVER_SELECTION_TIMEOUT_MS";

/** Optional; a positive integer number of milliseconds. */
function parseTimeout(value: string | undefined): number {
  if (value === undefined) return DEFAULT_SERVER_SELECTION_TIMEOUT_MS;
  if (!/^[1-9]\d*$/.test(value)) {
    throw new Error(
      `${TIMEOUT_VAR} must be a positive integer (milliseconds), got ${JSON.stringify(value)}`,
    );
  }
  return Number(value);
}

/** Reads the MongoDB settings from `env`; throws naming every missing, empty or invalid variable. */
export function loadConfig(
  env: Record<string, string | undefined> = process.env,
): DataConfig {
  const result = EnvSchema.safeParse(env);
  if (!result.success) {
    const names = result.error.issues.map((i) => i.path.join("."));
    throw new Error(
      `Missing or empty environment variable(s): ${names.join(", ")}`,
    );
  }
  return {
    mongodbUri: result.data.MONGODB_URI,
    mongodbDb: result.data.MONGODB_DB,
    serverSelectionTimeoutMs: parseTimeout(env[TIMEOUT_VAR]),
  };
}
