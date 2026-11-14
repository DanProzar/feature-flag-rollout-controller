# Phase 0 — Scaffold: Plan

Each group ends in a working state and can be committed on its own.

## 1. Next.js + TypeScript project (roadmap item 1)
1. Run `create-next-app` with TypeScript, App Router, `src/` dir, ESLint, npm, and no Tailwind.
2. Confirm that `tsconfig.json` has `"strict": true`.
3. Replace the default home page with a minimal placeholder page (product name only) and remove
   the boilerplate assets.
4. Add Prettier, `.prettierrc` and `.prettierignore`, and `eslint-config-prettier` in the ESLint config.
5. Add npm scripts: `typecheck`, `format` and `format:check` (alongside `dev`, `build`, `start` and `lint`).
6. Add `.nvmrc` (`24`) and `"engines": { "node": ">=24" }`.
7. Run `lint`, `typecheck`, `format:check` and `build` until they all pass, then commit.

## 2. Vitest (roadmap item 2)
1. Install `vitest`, then add `vitest.config.ts` (node environment, `src/**/*.test.ts`).
2. Add the `test` script (`vitest run`).
3. Add one trivial passing test, e.g. `src/sanity.test.ts`.
4. Run `npm test` until it passes, then commit.

## 3. Docker + Compose (roadmap item 3)
1. Set `output: "standalone"` in `next.config.ts`.
2. Write a multi-stage `Dockerfile` on `node:24-alpine` with three stages: `deps` (`npm ci`),
   `build` (`npm run build`) and `runner` (copy standalone output, `public` and `.next/static`,
   run as a non-root user, `EXPOSE 3000`).
3. Add `.dockerignore` (`node_modules`, `.next`, `.git`, `specs`, env files).
4. Write `docker-compose.yml`:
   - `mongo`: `mongo:8`, a named volume, and a `mongosh --eval "db.adminCommand('ping')"` healthcheck.
   - `app`: built from the Dockerfile, port `3000:3000`, `depends_on: mongo (service_healthy)`, and the env vars
     `MONGODB_URI=mongodb://mongo:27017`, `MONGODB_DB=feature_flags` and `ENABLE_TEST_ENDPOINTS=false`.
5. Write the `docker-compose.dev.yml` override: build the `deps` stage, mount the source, keep
   an anonymous `node_modules` volume, and run `npm run dev`.
6. Add `.env.example` with the three env vars.
7. Smoke test both modes (see `validation.md`), then commit.

## 4. Wrap-up
1. Run the full validation checklist.
2. Open a PR from `feature/phase-0-scaffold` into `main`.
