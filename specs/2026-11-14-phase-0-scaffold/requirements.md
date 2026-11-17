# Phase 0 — Scaffold: Requirements

Branch: `feature/phase-0-scaffold`
Roadmap: `specs/roadmap.md` → Phase 0, items 1–3.
Status: ✅ Complete — merged 2026-11-14. Historical record, frozen at merge; the current truth is `specs/mission.md` and `specs/tech-stack.md`. Later changes: the Dockerfile gained a `seed`
stage (Phase 2) and cache mounts (Phase 7).

## Context

The repository contains only specs (`mission.md`, `roadmap.md`, `tech-stack.md`) and a README.
Before the pure evaluator (Phase 1) can be built, we need a runnable, tested, containerised project
skeleton. Per the mission's principles ("Small, safe steps", "Simple to run"), this phase ships
nothing functional. It only proves that the toolchain works end to end.

## Scope

Roadmap items 1–3, plus the UI framework follow-up (item 4 below):

1. **Next.js + TypeScript project**
   - Next.js (App Router, latest stable), TypeScript in `strict` mode, `src/` directory layout.
   - ESLint with the Next.js config, Prettier, and `eslint-config-prettier` so the two don't conflict.
   - npm as the package manager, with a committed `package-lock.json`.
   - npm scripts: `dev`, `build`, `start`, `lint`, `typecheck` (`tsc --noEmit`), `format`,
     `format:check`, `test`.
2. **Vitest**
   - Vitest configured for TypeScript, with tests colocated as `*.test.ts`.
   - One trivial passing test.
3. **Docker**
   - A production `Dockerfile`: multi-stage build, Next.js `output: "standalone"`, and a
     `node:24-alpine` base.
   - `docker-compose.yml` with the services `app` (production image, port 3000) and `mongo`
     (`mongo:8`, named volume, healthcheck). `app` depends on `mongo` being healthy.
   - `docker-compose.dev.yml` override: mounts the source and runs `next dev` with hot reload.
   - The app serves a placeholder page at `/`.
   - Env vars from `tech-stack.md` (`MONGODB_URI`, `MONGODB_DB`, `ENABLE_TEST_ENDPOINTS`) are declared
     in compose and in a `.env.example`. Nothing reads them yet.
4. **UI framework (follow-up)**
   - Tailwind CSS v4 via PostCSS and shadcn/ui initialised (`components.json`, `src/lib/utils.ts`,
     theme tokens in `src/app/globals.css`). Only the CLI's default `button` component is added.

## Decisions

| Topic | Decision | Rationale |
|-------|----------|-----------|
| Scope | Roadmap items 1–3 only: no `src/domain` or `src/data` folders, no CI | Keep the phase minimal. Later phases create their own folders. |
| Node | **Node 24 LTS**, pinned in the Dockerfile, `.nvmrc` and `package.json` `engines` (`>=24`) | Meets the `zlib.crc32` requirement (≥ 22.2) from `tech-stack.md`, and it is the current LTS. |
| MongoDB | **`mongo:8`** image | Current major release. The official driver supports it. |
| Docker image | **Both**: a production standalone image by default, plus a dev override with hot reload | `docker compose up` runs the real system. `docker compose -f docker-compose.yml -f docker-compose.dev.yml up` is for iterating. |
| Placeholder page | A minimal page that names the product. No UI work. | Phase 4 owns the UI. |
| UI framework | **shadcn/ui** (`base-nova` preset) on **Tailwind CSS v4**, initialised in this phase. Originally scaffolded without Tailwind; added as a follow-up. | Copy-in components we own and can edit, accessible primitives, and a consistent theme via CSS variables. Setting it up now keeps Phase 4 focused on screens. |

## Out of scope

- The `src/domain`, `src/data` and `src/app/api` code and folders (Phases 1–3).
- A MongoDB client or any DB connection from the app (Phase 2).
- A CI pipeline (GitHub Actions).
- Any shadcn/ui components beyond the CLI default and any real UI screens (Phase 4).
- README run instructions (Phase 5). A one-line note is acceptable if it helps reviewers.
