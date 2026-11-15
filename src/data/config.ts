import { z } from "zod";

export interface DataConfig {
  mongodbUri: string;
  mongodbDb: string;
}

const EnvSchema = z.object({
  MONGODB_URI: z.string().min(1),
  MONGODB_DB: z.string().min(1),
});

/** Reads the MongoDB settings from `env`; throws naming every missing or empty variable. */
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
  };
}
