# Northstar Inventory Management

Northstar is a demo inventory operations app backed by a Python API and SQLite database. Use the dashboard to work with stock levels and movement history, and explore ways to make inventory changes reliable through automation, testing, and CI.

## What’s included

- React and TypeScript dashboard with search, stock-status filters, and API-backed pages of up to 15 items.
- FastAPI service for inventory lookup, receipts, adjustments, purchases, and movement history.
- SQLite database managed by versioned Flyway migrations.
- Playwright end-to-end coverage, Python unit tests, and an optional Selenium example.
- GitHub Actions workflow that migrates a fresh database, runs Python unit tests and the frontend build, starts the API, and runs the browser suite.
- An in-app learning guide with practical exercises for inventory quality, Playwright, Selenium, and CI.

## Requirements

- Node.js 22 or newer
- Python 3.12 or newer
- Flyway CLI available on `PATH` for local database migrations

## Set up locally

Install the JavaScript and Python dependencies and the browsers used by Playwright:

```bash
npm ci
npx playwright install
python3 -m venv server/.venv
source server/.venv/bin/activate
python -m pip install -r server/requirements-dev.txt
```

Install [Flyway CLI](https://documentation.red-gate.com/flyway/reference/usage/command-line) separately. Then, from the repository root, create and migrate the local database:

```bash
mkdir -p data
npm run db:migrate
npm run db:info
```

Flyway applies the versioned SQL files in `database/migrations/` to `data/inventory.db`. The database file is generated locally and ignored by Git; the migration files are the source of truth.

## Start the application

Run the API and frontend in separate terminals from the repository root.

Terminal 1, with `server/.venv` activated:

```bash
uvicorn app.main:app --app-dir server --reload --host 127.0.0.1 --port 8000
```

Terminal 2:

```bash
npm run dev
```

Open <http://127.0.0.1:5173>. The API’s interactive documentation is at <http://127.0.0.1:8000/docs>.

## Data and inventory behavior

The database starts with a 100-item demo catalog. Product names, source links, image links, and source prices are research snapshots; quantities and reorder points are example values for practicing inventory workflows, not operational recommendations.

The dashboard fetches no more than 15 inventory records at a time. Search and status filters apply across the catalog, and a later page is requested only when you navigate to it. Receipts, adjustments, and purchases update stock and write movement history together in a database transaction.

## Checks and tests

Run the frontend build and TypeScript check:

```bash
npm run build
npm run lint
```

Run the Python unit tests from the repository root:

```bash
cd server
python -m pytest tests/unit
```

Run the Playwright suite with the API running on port 8000. Playwright starts Vite on port 4173:

```bash
npm test
```

Use `npm run test:ui`, `npm run test:headed`, or `npm run test:debug` to explore and diagnose browser checks. The E2E fixture creates a unique inventory SKU for each test, searches for it in the UI, and deletes it during teardown so stock changes do not leak between tests.

The optional Selenium starter is in `selenium/smoke.ts`. It still targets the earlier storefront UI and needs to be updated to inventory selectors before it can verify this dashboard. Start the application separately and have Chrome available when you adapt and run it:

```bash
npm run test:selenium
```

## GitHub Actions

Pushes and pull requests that change files other than the root `README.md` run `.github/workflows/ci.yml`. CI prepares a fresh SQLite database with Flyway, runs Python unit tests, builds the frontend, starts FastAPI, and runs Playwright using the browsers configured in `playwright.config.ts`. CI runs browser tests with one worker to limit contention on SQLite. The Playwright report and failure diagnostics are uploaded as workflow artifacts.

## Project layout

```text
src/                         React dashboard and API client
server/app/                  FastAPI routes, schemas, and SQLite access
server/tests/unit/           Python unit tests
database/migrations/         Flyway schema and seed migrations
tests/e2e/                   Playwright inventory workflows
tests/fixtures/              Per-test inventory setup and cleanup
selenium/                    Optional Selenium example
.github/workflows/ci.yml     Build, database, API, and browser CI
.agent/                      Coding guidance and project memory
```

The testing guidance lives in `.agent/skills/testing-typescript-playwright-selenium-ci/SKILL.md`. Coding and readability guidance lives in `.agent/skills/code-readability-maintainability/SKILL.md`.
