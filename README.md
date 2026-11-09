# Northstar QA Automation Interview Lab

A polished local shopping app and interactive five-day learning lab for QA foundations, test design, Playwright with TypeScript, Selenium fundamentals, AI-assisted test work, and GitHub Actions CI. Explore the store, then use the field guide modules to practice testing the experience.

## Get started

Install the UI dependencies and start the API environment:

```bash
npm install
npx playwright install chromium
python3 -m venv server/.venv
source server/.venv/bin/activate
python -m pip install -r server/requirements.txt
```

After installing Flyway CLI and applying the migrations with `npm run db:migrate`, run the API and UI in separate terminals:

```bash
# Terminal 1: from the repository root, with server/.venv activated
uvicorn app.main:app --app-dir server --reload --host 127.0.0.1 --port 8000

# Terminal 2: from the repository root
npm run dev
```

Open <http://127.0.0.1:5173>. Keep the API running while using the dashboard. To run Playwright, keep the API running and use `npm test` in another terminal; Playwright starts Vite on port 4173. Use `npm run test:ui`, `npm run test:headed`, or `npm run test:debug` to explore, watch, and debug tests. `npm run build` type-checks and builds the app; `npm run lint` performs a TypeScript check. Open `playwright-report/index.html` after a run for the HTML report.

## Inventory database

The project includes a local SQLite catalog for inventory records. Flyway migration files are in `database/migrations/`, and `flyway.toml` points Flyway at `data/inventory.db`. The local database file is generated and ignored by Git; migrations are the version-controlled source of truth. The npm commands call `scripts/flyway.mjs`, a small Node.js wrapper around the Flyway command-line tool. Flyway CLI must be installed separately and available on `PATH`.

Run these commands from the repository root after installing Flyway CLI:

```bash
npm run db:migrate
npm run db:info
```

The local database was initialized with Flyway: the pre-existing V1/V2 schema was baselined at version 2, then Flyway applied V3 and V4. `npm run db:info` shows the tracked migration state. The seed rows are reproducible from the versioned SQL files.

The migrations create `sku` with an auto-generated 64-bit integer `id`, unique `sku`, `name`, `price`, `quantity`, and `reorder_point`, then add `category`, `image_url`, currency, and research-source fields. V4 adds `stock_movement` for persistent receive, adjustment, and purchase history. SQLite's generated integer key uses `INTEGER PRIMARY KEY AUTOINCREMENT`; SQLite row IDs are signed 64-bit values.

The GadgetMart research catalog contains 100 candidate products. It includes 91 physical items selected from Amazon.com Electronics' Nov. 6, 2026 top-100 snapshot when the listing showed a price, plus 9 highly ranked Amazon.ca Electronics items from Nov. 8, 2026. The source marketplace, list rank, product link, image link, and price currency are stored on each record. This is a cross-market research shortlist, not a single ranked Canadian top 100 or a guarantee of sales. NIQ reports consumers remain price-sensitive, while Circana reports category-specific share gains; marketplace list rank is not sales volume. Quantities and reorder points are deterministic demo values; the listing prices are source snapshots, not approved GadgetMart retail prices. Rankings and prices change frequently.

Product photos are remote links from Amazon's image CDN or product/retailer image hosts. The React dashboard loads inventory and stock movements from the API. Inventory pages request up to 15 records at a time; the next page is fetched only when selected. Search and stock-status filters are applied by the API across the catalog. The overview avoids summing mixed CAD/USD prices; its stock metrics describe the currently loaded page, while the inventory panel count reflects all matches.

## Python inventory API

The FastAPI service in `server/` uses the Flyway-managed SQLite catalog. It exposes inventory listing and lookup, create/delete operations for SKUs, receive and adjustment operations, movement history, and an atomic purchase endpoint. See `server/README.md` for setup and run commands. Start the Python API at port 8000 and the Vite app at port 5173 to use the connected dashboard. Browser tests also need the API running; Playwright currently starts only Vite.

## Learning path

The in-app field guide includes lesson objectives, a hands-on exercise, a coaching prompt, day navigation, and completion tracking for this visit. Each exercise points to real project files and commands.

### Day 1 — QA foundations
Identify customer risks in the shop, prioritize them, and distinguish functional testing, test cases, and bug reports.

### Day 2 — Manual exploration and test design
Practice happy paths, negative paths, boundaries, reproducible steps, and useful expected results.

### Day 3 — Playwright and TypeScript
Use accessible locators, independent tests, retrying assertions, traces, and risk-based coverage.

### Day 4 — Reliability and Selenium
Compare Playwright auto-waits to Selenium explicit waits; practice deterministic checks and driver cleanup.

### Day 5 — CI and interview practice
Trace pull request workflows, diagnose failures from evidence, and explain CI artifacts and regression strategy.

## Developer workflow

```bash
npm run build       # Type-check and create a production build
npm run lint        # TypeScript check (not a stylistic linter)
npm test            # Playwright browser suite
npm run test:headed # Watch tests run in Chromium
npm run test:selenium # Optional; requires Chrome and a separately running app
```

The Playwright config starts Vite on port 4173 for browser tests. For Selenium, start `npm run dev -- --port 4173` in another terminal first.

## Testing practice workspace

The existing Playwright starter spec is `tests/shop.spec.ts`, and the Selenium comparison exercise is `selenium/smoke.ts`. The folders below are reserved for you to build out the test layers as you learn; they intentionally contain no new tests or framework setup from this project-completion pass:

```text
tests/
├── unit/          # Fast tests for pure TypeScript behavior
├── integration/   # React + DOM behavior (for example, Vitest and Testing Library)
├── e2e/           # Browser journeys (Playwright inventory workflows)
├── selenium/      # Focused Selenium comparison exercises
└── fixtures/      # Playwright page helpers and per-test inventory setup/cleanup
```

Use `.agent/skills/testing-typescript-playwright-selenium-ci/SKILL.md` as the testing guide. It explains test-layer choices, accessible locators, isolation, async waits, Selenium cleanup, and CI diagnosis. The Playwright fixture creates a unique inventory SKU through the API for each test and deletes it in teardown, so stock changes do not leak between tests. The current package scripts and workflow are starter material; adding unit/integration tooling and evolving CI are intentionally learner-owned exercises.

## Five-day plan (expanded reference)

### Day 1 — QA foundations and the application
Explore product search, category filtering, cart, and checkout. Write a short risk list: money totals, lost cart items, invalid input, and empty results. Learn the test pyramid, functional vs. nonfunctional tests, test case vs. test, and bug report structure. Add one manual test case with preconditions, steps, and expected result.

### Day 2 — Playwright essentials
Read `tests/e2e/inventory.spec.ts` and `tests/fixtures/inventory.fixture.ts`. Trace how the fixture creates a test SKU, passes it through `use()`, and deletes it in `finally`. Practice `getByRole`, `getByLabel`, and `getByPlaceholder`; prefer user-facing semantics over CSS selectors. Playwright waits for actionability and assertions retry; avoid fixed sleeps such as `waitForTimeout`.

### Day 3 — Coverage and reliability
Add a negative checkout test, quantity decrement test, and boundary tests (zero items, unknown search). Keep each test independent and assert outcomes, not implementation details. Use `npm run test:headed`, `npm run test:debug`, and trace artifacts to diagnose a deliberate broken locator. Consider keyboard access and semantic HTML; an accessibility scan is a useful follow-up exercise.

### Day 4 — Selenium and AI agents
Run `npm run dev` then `npm run test:selenium` with Chrome installed. Compare Selenium's explicit `WebDriverWait` and `quit()` lifecycle with Playwright's auto-wait and fixtures. Ask an AI agent to propose one test, then require it to explain user risk, locator stability, assertion quality, and false-positive risks. Review and run every generated change; never accept a test just because it passes.

### Day 5 — CI and interview practice
Inspect `.github/workflows/ci.yml`; create a branch and push it to see the GitHub Actions job (the repository must be pushed to GitHub). Review a failed run's report and artifacts. Practice explaining: the test pyramid, flaky tests, implicit vs explicit waits, selector strategy, test isolation, smoke vs regression, CI value, and what you would improve next. Describe one failure, evidence, root cause, and fix.

## Test design notes

The inventory E2E suite covers stock status boundaries, form validation, and stock-status filtering. Add cases for pagination, empty search results, API failures, keyboard navigation, and responsive behavior. A good test states one behavior, uses deterministic setup, waits on meaningful UI state, and has an assertion that would fail for the reported bug. Keep test data local and avoid ordering dependencies.

## AI-agent practice prompts

- “Review this test for flaky waits, weak assertions, and accessibility; explain each concern before suggesting a patch.”
- “Create one test for removing an item from a cart. Use semantic locators, avoid sleeps, and explain the user risk and expected failure behavior.”
- “Given this CI failure and trace, list likely causes ranked by evidence. Do not change code until you identify the observed failure.”

## Selenium comparison

The optional smoke script uses ChromeDriver and Selenium WebDriver. Install Chrome locally, start the Vite app, then run `npm run test:selenium`. Selenium driver/browser provisioning varies by machine; Playwright's browser install is the recommended path for repeatable CI in this project.

## GitHub Actions

Push and pull request events install Node dependencies and Chromium, build the app, run Playwright, and upload the HTML report even after failures. Traces are recorded on first retry; see `test-results/` locally or download the report artifact in Actions. No secrets are required.
