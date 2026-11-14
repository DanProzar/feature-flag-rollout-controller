# Phase 0 — Scaffold: Validation

The phase is done and can be merged into `main` when every check below passes on a clean checkout.

## Local checks (Node 24)

```sh
npm ci
npm run lint          # exits 0, no warnings
npm run typecheck     # exits 0
npm run format:check  # exits 0
npm test              # 1 test passed, exits 0
npm run build         # exits 0, produces .next/standalone
```

## Compose smoke test: production

```sh
docker compose up --build -d
docker compose ps                     # mongo is "healthy", app is "running"
curl -i http://localhost:3000/        # HTTP 200, placeholder page HTML
docker compose exec app node -v       # v24.x
docker compose exec mongo mongosh --quiet --eval "db.version()"   # 8.x
docker compose down
```

## Compose smoke test: dev override

```sh
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d
curl -i http://localhost:3000/        # HTTP 200
# Edit the placeholder text → refresh shows the change without a rebuild (hot reload)
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
```

## Review checklist

- [ ] `tsconfig.json` has `"strict": true`.
- [ ] Node 24 is pinned in the `Dockerfile`, `.nvmrc` and `package.json` `engines`. Mongo is pinned to `mongo:8`.
- [ ] The production image runs as a non-root user and uses Next.js standalone output.
- [ ] `.env.example` lists `MONGODB_URI`, `MONGODB_DB` and `ENABLE_TEST_ENDPOINTS`, and no secrets are committed.
- [ ] `package-lock.json` is committed.
- [ ] Nothing outside roadmap items 1–3 was added: no domain or data code and no CI.
- [ ] Each task group from `plan.md` is its own commit on `feature/phase-0-scaffold`.
