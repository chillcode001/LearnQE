# Project memory and handoff

Updated: 2026-11-08

## Purpose and collaboration

Northstar QA Automation Interview Lab is an inventory management demo used to learn quality engineering, Playwright/Selenium, API and database testing, concurrency, and CI. The user prefers instructor-style guidance and wants to implement tests and automation themselves; explain concepts and let the user write exercises unless they explicitly ask for implementation.

## Current application state

- React 18 + TypeScript + Vite front end.
- Inventory dashboard is in `src/components/InventoryDashboard.tsx`; API mapping functions are in `src/api/inventory.ts`; shared UI types are in `src/types/product.ts`.
- UI now loads at most 15 database SKUs per page and fetches a subsequent page only after the user clicks pagination. Search and stock-status filtering run in the API across the full catalog; `X-Total-Count` provides the matching total. Summary stock metrics describe only the loaded page. Recent movements load separately. Receive and adjust forms write through the API and update displayed quantities from persisted response data. The old six-item in-memory seed file was removed.
- User-authored Playwright tests are in `tests/e2e/inventory.spec.ts`; page and stock operation fixtures are in `tests/fixtures/inventory.fixture.ts`. Python unit tests are in `server/tests/unit/`; currently 11 schema tests and 2 mocked route tests. Recent learner coverage includes request validation and get-item 404/success mapping. Inspect files before suggesting more coverage.
- SQLite catalog migrations now include V1 (base SKU table), V2 (category, remote image URL, currency, source market/rank/link), and V3 (100 GadgetMart product candidates). The catalog is 91 Amazon.com US candidates and 9 Amazon.ca Canada candidates. Each row preserves its source rank, product link, image URL, source currency, and market. The list combines source marketplaces and snapshots, so it is not a single Canadian top 100 or a verified sales forecast. Product quantities and reorder points are deterministic demo values; source prices are snapshots, not approved GadgetMart prices.
- `flyway.toml` configures the `local` environment at `jdbc:sqlite:./data/inventory.db` and `filesystem:database/migrations`. Flyway history has successful baseline v2 and V3; V4 was added and successfully applied for stock movement persistence. Preserve this history; do not delete/recreate the DB without the user's intent.
- `data/inventory.db` is ignored and contains 100 unique catalog SKUs with image URLs. V3 seeds 91 US/USD and 9 CA/CAD research candidates; quantities are demo values, not forecasts.
- Python FastAPI backend in `server/app/` uses stdlib `sqlite3`. It supports health, list/get/create/delete, receipts, adjustments, purchase, and movement history. `INVENTORY_DB_PATH` overrides the default DB path.
- Receipt, adjustment, and purchase operations share an immediate SQLite transaction that updates quantity and inserts a stock movement atomically. A conditional update prevents negative inventory; insufficient stock returns 409 without changing stock/history. Movement records store `quantity_after` at event time.
- `POST /api/items` and `DELETE /api/items/{sku}` allow setup and cleanup of uniquely named test SKUs. Tests themselves remain learner-owned; do not add test cases unless explicitly requested. Use an isolated SQLite file via `INVENTORY_DB_PATH` for independent test environments.

## Structure and useful commands

- `src/`: React UI, seed data, and TypeScript types.
- `tests/e2e/`: Playwright browser tests; `tests/fixtures/`: learner fixtures.
- `database/migrations/`: Flyway SQL migrations.
- `database/migrations/V3__seed_gadgetmart_catalog.sql`: 100 researched source-listed product candidates and image URLs.
- `flyway.toml`: local environment, SQLite URL, and migration location.
- `scripts/flyway.mjs`: Node wrapper for Flyway CLI `migrate` and `info` commands.
- `server/app/`: Python FastAPI app, database connection, request/response schemas, and inventory routes.
- `server/app/routes/movements.py`: recent movement history endpoint.
- `src/api/inventory.ts`: API requests and snake_case-to-camelCase mapping for the React dashboard.
- `GET /api/items`: hard-caps `limit` at 15, supports `offset`, `search`, and `status`, and returns matching count in the `X-Total-Count` header.
- `database/migrations/V4__create_stock_movement_table.sql`: stock movement history schema.
- `server/requirements.txt`, `server/requirements-dev.txt`, `server/README.md`: backend and test dependencies and run guide. `requirements-dev.txt` includes `httpx2` for FastAPI TestClient with this Starlette release.
- `server/requirements-dev.txt`, `server/pytest.ini`, `server/tests/unit/README.md`: pytest setup and the learner's first unit-testing exercise. Do not write tests for the user unless explicitly requested.
- `data/inventory.db`: generated local database; ignored in Git.
- `playwright.config.ts`: Playwright browser projects and Vite test server on port 4173.
- `AGENTS.md`: repo workflow; `.agent/skills/code-readability-maintainability/SKILL.md`: style and maintainability rules.

Commands from repo root:

- `npm run dev`: Vite at 127.0.0.1:5173.
- `npm run build`: type-check and build.
- `npm run lint`: TypeScript check (not a stylistic linter).
- `npm test`: Playwright suite; config starts Vite at port 4173.
- `npm run test:headed`, `npm run test:ui`, `npm run test:debug`: Playwright modes.
- `npm run db:migrate`, `npm run db:info`: require Flyway CLI on `PATH`; both call `scripts/flyway.mjs`.
- Start FastAPI separately with the `server/.venv` active; Playwright starts only Vite, so leave the API running when using the connected UI or browser tests.

## Verification record

- On 2026-11-08, `npm run db:migrate` applied Flyway V4 successfully; history is baseline v2, V3, V4. SQLite contains the `stock_movement` table and 100 catalog rows.
- Frontend/API integration added: UI loads items and movement history via `src/api/inventory.ts`, writes receive/adjust actions through FastAPI, and maps remote catalog images and categories. Legacy sample seed was removed. `npm run build` passed; `python3 -m compileall -q server/app` passed.
- On 2026-11-08, inventory pagination was changed to API-backed pages capped at 15 records, lazy page navigation, and API-side search/status filtering. `npm run build` passed after this change; `server/.venv/bin/python -m compileall -q server/app` passed. No automated tests or browser checks were run for pagination.
- On 2026-11-08, inventory table item names were shortened to 50 characters with `...` for longer names; the full name remains available as the title and accessible label. `npm run build` passed after this change; no tests were run.
- A temporary-database direct route smoke check passed create, receive, adjust, failed adjustment unchanged, purchase, movement history, and delete. This was not a checked-in test. FastAPI TestClient smoke was attempted but could not start because `httpx2` was absent; `httpx2` is now in `server/requirements-dev.txt`, but dependency install and TestClient were not rerun.
- The user's current pytest suite previously passed 13 tests with `./.venv/bin/python -m pytest -p no:cacheprovider tests/unit` from `server/`. No pytest suite was run during the UI integration change. `npm test` previously failed to start Vite in the sandbox with `listen EPERM`; no Playwright cases ran.
- `node --check scripts/flyway.mjs` passed earlier; the user installed Flyway CLI and completed baseline, V3, and V4 migrations.
- `npm test` was explicitly attempted on 2026-11-08. Playwright did not start its Vite server because the environment denied binding to `127.0.0.1:4173` (`listen EPERM`); no test cases ran. Build was not run.

## Follow-up and design notes

- Learner next step: update Playwright fixtures for the database-backed UI. Existing tests assume six fixed NS-* in-memory products and low-stock totals; provision unique SKUs using API create/delete and clean them up. Playwright currently launches Vite only, so start FastAPI separately before browser tests. CI does not yet install/start the Python API.
- Pagination is limited to 15 returned rows by API validation. Test coverage for next/previous-page navigation, filtering across page boundaries, and empty results remains learner-owned and has not been run.
- Keep Flyway migrations append-only after shared use; add a new versioned migration for future schema changes rather than editing an already applied version.
- Research sources used for the catalog: ParseShelf's Amazon.com Electronics top-100 snapshot (Nov. 6, 2026), a Canadian Amazon Electronics bestseller snapshot (Nov. 8, 2026), and NIQ/Circana market context. Rank position is list rank, not units sold. Product names, pricing, source links, and remote image links should be rechecked before commercial purchasing or launch.
- Update this memory whenever implementation, architecture, commands, tests, CI, or verification changes. Keep it consistent with source, README, and AGENTS.md.
