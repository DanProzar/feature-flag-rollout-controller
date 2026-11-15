# Changelog

## 2026-11-15

- Added the pure flag evaluator: kill switch, cohort exclude/include, sticky and percentage rules
- Added CRC32 user bucketing with pinned reference values
- Added an injectable clock with real and frozen implementations
- Added precedence-matrix and property-based tests with a 100% domain coverage gate
- Strengthened evaluator tests: independent CRC32 reference over arbitrary Unicode, a written-out precedence table and targeted property tests
- Adopted shadcn/ui on Tailwind CSS v4 as the UI framework
- Fixed hydration warning caused by browser-extension body attributes
- Fixed frozen-clock tests that could not detect a clock sharing its Date with callers
- Fixed lint warnings from the generated coverage report
- Added user and cohort seeding to the Phase 3 roadmap
- Added Phase 1 evaluator spec (requirements, plan, validation)
- Marked Phase 1 complete in the roadmap
- Moved domain tests into `src/domain/tests` and made per-module `tests/` folders the project convention
- Synced the tech stack and Phase 1 specs with the built evaluator

## 2026-11-14

- Scaffolded Next.js + TypeScript project
- Added Vitest with a sanity test
- Added Dockerfile and Docker Compose setup
- Created project constitution: mission, roadmap, and tech stack specs
- Added Phase 0 scaffold spec (requirements, plan, validation)
- Marked Phase 0 complete in the roadmap
