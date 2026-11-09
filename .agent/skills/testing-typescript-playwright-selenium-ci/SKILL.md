---
name: testing-typescript-playwright-selenium-ci
description: Use when planning, writing, reviewing, or organizing tests and CI for this TypeScript React application. Covers unit and component integration tests, Playwright E2E, the Selenium comparison smoke, and GitHub Actions.
---

# Testing this TypeScript application

Apply this skill when changing application behavior, tests, or CI. Choose the narrowest test layer that gives meaningful confidence; do not repeat the same assertions at every layer. Follow the current package scripts and configurations as implemented. Recommendations for future tools below do not mean those dependencies are already installed.

## Current project setup

- React 18, TypeScript, and Vite app code live in `src/`.
- Playwright Test is installed and configured in `playwright.config.ts`; current inventory browser tests are in `tests/e2e/inventory.spec.ts` and run against Vite on port 4173.
- Selenium WebDriver is installed; `selenium/smoke.ts` creates a test SKU through the API, receives stock through the UI, verifies saved inventory and movement history, then cleans up. It requires FastAPI, Vite, and Chrome.
- Python unit tests live in `server/tests/unit/`. API integration tests in `server/tests/integration/` start Uvicorn against a temporary copy of the migrated database and exercise HTTP responses and persisted SQLite state.
- `npm run build` performs TypeScript build and Vite build. `npm run lint` is currently a TypeScript check, not ESLint.
- GitHub Actions migrates a fresh SQLite database, runs Python unit and API integration tests, builds the frontend, installs all Playwright project browsers and Chrome, starts FastAPI and Vite, runs Playwright with one worker and the Selenium smoke in headless Chrome, and uploads Playwright reports and failure diagnostics. Root README-only changes are filtered out.
- No Vitest or Testing Library dependencies are currently present. Do not write imports from them as if they work until a separate task installs and configures them.

## Recommended test layers and folders

Keep the pyramid weighted toward fast, focused tests:

1. **Unit tests:** many small tests for pure behavior without rendering or a browser. Python schema and mocked-route examples live in `server/tests/unit/`. Add TypeScript unit tests under `tests/unit/` only after selecting and configuring a runner.
2. **API integration tests:** exercise FastAPI over HTTP with a real temporary SQLite database. Keep them in `server/tests/integration/`; create test-owned records, assert response and database effects, and clean up in fixture teardown.
3. **Component integration tests:** test React components and DOM interactions without a real browser. Place future component tests in `tests/integration/*.test.tsx`. Recommended stack: Vitest, Testing Library (`@testing-library/react`, `@testing-library/user-event`), and jsdom; those dependencies are not installed.
4. **Browser E2E tests:** test a small number of important inventory workflows in a real browser using Playwright. Current specs live in `tests/e2e/*.spec.ts`.
5. **Selenium comparison:** keep the focused WebDriver flow in `selenium/smoke.ts`. Avoid duplicating the full Playwright suite unless cross-tool comparison becomes an explicit goal.

Current structure: `server/tests/unit/`, `server/tests/integration/`, `tests/e2e/`, `tests/fixtures/`, and `selenium/`. Add `tests/unit/` or component `tests/integration/` if a TypeScript test runner is deliberately introduced. Keep fixtures minimal and add shared setup only when multiple tests benefit from it. Keep runner configuration separate: Vitest config for React component tests and `playwright.config.ts` for browser tests.

For a learn-by-doing repository, scaffolding folders and documenting the structure is appropriate; leave test files, test scripts, framework installation, and CI workflow implementation as learner exercises unless the user explicitly requests those tasks.

## What to test at each layer

- **Unit:** schema/request validation and pure deterministic stock rules.
- **API integration:** inventory creation and lookup, stock movement persistence, rejected operations leaving data unchanged, and concurrent purchase of the last unit.
- **Component integration:** when a React test stack is added, search/filter behavior, loading and error states, and movement dialog validation.
- **E2E:** high-value inventory workflows such as stock-status boundaries, receipt actions, movement history, search, and pagination.
- **Selenium:** one smoke journey that creates a SKU, receives stock through the UI, verifies saved quantity and history, cleans up data, and quits the driver.

These are coverage examples, not a requirement to test every behavior at all layers. Cover customer risk and observable behavior, not implementation trivia.

## Reliable test design

- Give each test a clear behavior-oriented name, independent setup, and assertions that would fail for a real regression.
- Prefer user-observable semantics. In Playwright use `getByRole`, `getByLabel`, and other user-facing locators; use a test ID only as an explicit stable contract when semantic location is insufficient. In Testing Library prefer role and label queries.
- Avoid fixed sleeps. Use Playwright retrying assertions and actionability waits; in Selenium use explicit waits for the condition required by the next action. In component tests, await user interactions and observable DOM changes.
- Keep tests deterministic: use local test data, control state per test, avoid dependence on test order, wall-clock timing, remote services, or shared mutable fixtures.
- Assert outcomes rather than CSS classes, React state shape, implementation function names, or arbitrary DOM structure.
- Use browser-native form validation deliberately and test what users can observe, including validity/focus behavior. Preserve inventory state and form input on recoverable errors.
- In Selenium, wrap browser use in `try/finally` so `driver.quit()` runs after success or failure.
- Keep tests focused. A test may cover a coherent user journey, but split unrelated behavior so failures identify a clear cause.

## TypeScript and configuration guidance

If adding the recommended unit/integration layer in a later implementation task:

- Add Vitest, `@testing-library/react`, `@testing-library/user-event`, and jsdom as development dependencies and define explicit `test:unit` and `test:integration` scripts (or a single documented Vitest script with clear projects).
- Configure Vitest to use the Vite configuration where appropriate and jsdom for DOM tests. Keep Playwright’s browser suite under Playwright Test; do not try to run Playwright specs through Vitest.
- Extend type checking to include test files. Keep browser app types, Node/config types, and test-runner types explicit so globals from one environment do not leak ambiguously into another. The current `tsconfig.json` includes only `src`; make any broader scope deliberate and verify it.
- Playwright specs already live in `tests/e2e/`; keep new browser flows there unless the project structure changes deliberately.
- Avoid extracting app logic solely to satisfy a test. Extract a small pure module when the domain rule benefits from an independent, clear contract.

## CI workflow

Run CI on pushes and pull requests. A practical progression for this project is:

1. `npm ci` from the committed lockfile.
2. Typecheck/build and run fast unit plus component integration tests.
3. Install the configured Playwright browser engines and run E2E against FastAPI and the migrated CI database.
4. Upload the Playwright report and relevant failure artifacts even when tests fail, with sensible retention.
5. Provision Chrome and ChromeDriver, then run the focused Selenium smoke in headless Chrome. Document its local prerequisites and command.

Keep CI reproducible and diagnose failures from logs, traces, screenshots, and reports. Use CI retries as a diagnostic aid, not as a way to hide flaky behavior. Start with conservative worker counts for constrained CI machines; increase parallelism only when tests are isolated and resources support it. Never place secrets in test fixtures or logs.

## Applying changes and reporting

Before adding tests, inspect existing coverage, test scripts, project config, and `.agent/MEMORY.md`. Match the existing tool for the test layer already in use. When test architecture or commands change, update `README.md` and `.agent/MEMORY.md` with the new layout and exact runnable commands. Report which checks actually ran and distinguish setup/environment failures from test failures.

## References

- [Playwright: Best Practices](https://playwright.dev/docs/best-practices) — user-visible behavior, isolation, locators, and CI.
- [Playwright: Locators](https://playwright.dev/docs/locators) — resilient, user-oriented locator strategies.
- [Playwright: Continuous Integration](https://playwright.dev/docs/ci) — browser setup and CI execution.
- [Vitest: Guide](https://vitest.dev/guide/) — unit and component test runner setup.
- [Vitest: Testing Types](https://vitest.dev/guide/testing-types) — type testing and test type-check behavior.
- [Selenium: Test Practices](https://www.selenium.dev/documentation/test_practices/) — test design recommendations and automation concerns.
- [Selenium: Page Object Models](https://www.selenium.dev/documentation/test_practices/encouraged/page_object_models/) — an optional organization pattern when a suite grows.
- [GitHub Actions: Node.js](https://docs.github.com/en/actions/automating-builds-and-tests/building-and-testing-nodejs) — official Node workflow guidance.

Use these references as guidance, not rigid rules. Prefer the simplest architecture that makes this small learning project understandable and reliable.
