import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Mirrors the `@/*` path in tsconfig.json, which route handlers use.
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.test.ts"],
          exclude: ["src/**/*.int.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "int",
          include: ["src/**/*.int.test.ts"],
          testTimeout: 30_000,
          hookTimeout: 30_000,
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: [
        "src/domain/**/*.ts",
        "src/data/**/*.ts",
        "src/server/**/*.ts",
        "src/app/api/**/*.ts",
      ],
      exclude: [
        "src/domain/tests/**",
        "src/domain/index.ts",
        "src/domain/types.ts",
        "src/data/tests/**",
        "src/data/index.ts",
        "src/data/seed.cli.ts",
        "src/server/tests/**",
        "src/server/index.ts",
        "src/app/api/tests/**",
      ],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
