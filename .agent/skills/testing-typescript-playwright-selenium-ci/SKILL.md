---
name: testing-typescript-playwright-selenium-ci
description: Use when planning, writing, reviewing, or organizing tests and CI for this TypeScript React application. Covers unit and component integration tests, Playwright E2E, the Selenium comparison smoke, and GitHub Actions.
---

# Testing this TypeScript application

Apply this skill when changing application behavior, tests, or CI. Choose the narrowest test layer that gives meaningful confidence; do not repeat the same assertions at every layer. Follow the current package scripts and configurations as implemented. Recommendations for future tools below do not mean those dependencies are already installed.

## Current project setup

- React 18, TypeScript, and Vite app code live in `src/`.
- Playwright Test is installed and configured in `playwright.config.ts`; current browser tests are in `tests/shop.spec.ts` and run against Vite on port 4173.
- Selenium WebDriver is installed; `selenium/smoke.ts` is a small Chrome search comparison and requires the app to be started separately.
- `npm run build` performs TypeScript build and Vite build. `npm run lint` is currently a TypeScript check, not ESLint.
- GitHub Actions currently runs clean install, Chromium install, build, Playwright, and report upload. It does not currently run Vitest or a separate test TypeScript check.
- No Vitest or Testing Library dependencies are currently present. Do not write imports from them as if they work until a separate task installs and configures them.

## Recommended test layers and folders

Keep the pyramid weighted toward fast, focused tests:

1. **Unit tests:** many small tests for deterministic logic without rendering or a browser. Place in `tests/unit/` (or beside a module under `src/**/__tests__/` when colocated tests are preferred). Extract pure calculations such as cart totals or filtering only when that improves reuse or makes meaningful behavior easier to verify.
2. **Component/in-process integration tests:** test React components and DOM interactions together, without launching a real browser. Place in `tests/integration/*.test.tsx`. Recommended future stack: Vitest, Testing Library (`@testing-library/react`, `@testing-library/user-event`), and jsdom.
3. **Browser E2E tests:** test a small number of important user journeys in a real browser using Playwright. Place in `tests/e2e/*.spec.ts`; move any existing browser specs here only when the learner is ready to practice that migration and update Playwright `testDir` as part of the same exercise.
4. **Selenium comparison:** retain `tests/selenium/` for focused WebDriver exercises. Do not create a full Selenium duplicate suite unless cross-tool comparison becomes an explicit goal.

Suggested structure: `tests/unit/`, `tests/integration/`, `tests/e2e/`, `tests/selenium/`, and `tests/fixtures/`. Keep fixtures minimal and add shared data/setup only when multiple tests genuinely need it. Avoid generic fixture frameworks or abstractions for one-off tests. Keep tool-specific configuration separate: `vitest.config.ts` for Vitest and `playwright.config.ts` for Playwright.

For a learn-by-doing repository, scaffolding folders and documenting the structure is appropriate; leave test files, test scripts, framework installation, and CI workflow implementation as learner exercises unless the user explicitly requests those tasks.

## What to test at each layer

- **Unit:** pure search/filter matching, subtotal calculation, quantity boundaries, and other deterministic business rules if extracted from UI code.
- **Component integration:** search and category controls update results; empty-state reset works; cart quantity controls and totals update; checkout form validation and cancellation preserve the right state; lesson tabs and progress work accessibly.
- **E2E:** a small set of high-value flows such as discover product → add to bag → edit quantity → checkout → confirmation, plus a focused empty-search recovery path.
- **Selenium:** one comparison smoke that searches for a product, waits for the result, and always quits the driver.

These are coverage examples, not a requirement to test every behavior at all layers. Cover customer risk and observable behavior, not implementation trivia.

## Reliable test design

- Give each test a clear behavior-oriented name, independent setup, and assertions that would fail for a real regression.
- Prefer user-observable semantics. In Playwright use `getByRole`, `getByLabel`, and other user-facing locators; use a test ID only as an explicit stable contract when semantic location is insufficient. In Testing Library prefer role and label queries.
- Avoid fixed sleeps. Use Playwright retrying assertions and actionability waits; in Selenium use explicit waits for the condition required by the next action. In component tests, await user interactions and observable DOM changes.
- Keep tests deterministic: use local test data, control state per test, avoid dependence on test order, wall-clock timing, remote services, or shared mutable fixtures.
- Assert outcomes rather than CSS classes, React state shape, implementation function names, or arbitrary DOM structure.
- Use browser-native form validation deliberately and test what users can observe, including validity/focus behavior. Preserve cart and form data on recoverable errors.
- In Selenium, wrap browser use in `try/finally` so `driver.quit()` runs after success or failure.
- Keep tests focused. A test may cover a coherent user journey, but split unrelated behavior so failures identify a clear cause.

## TypeScript and configuration guidance

If adding the recommended unit/integration layer in a later implementation task:

- Add Vitest, `@testing-library/react`, `@testing-library/user-event`, and jsdom as development dependencies and define explicit `test:unit` and `test:integration` scripts (or a single documented Vitest script with clear projects).
- Configure Vitest to use the Vite configuration where appropriate and jsdom for DOM tests. Keep Playwright’s browser suite under Playwright Test; do not try to run Playwright specs through Vitest.
- Extend type checking to include test files. Keep browser app types, Node/config types, and test-runner types explicit so globals from one environment do not leak ambiguously into another. The current `tsconfig.json` includes only `src`; make any broader scope deliberate and verify it.
- If the learner elects to migrate the existing Playwright spec, move it to `tests/e2e/shop.spec.ts` and update Playwright `testDir` as one exercise. Do not preempt the learner by doing this migration.
- Avoid extracting app logic solely to satisfy a test. Extract a small pure module when the domain rule benefits from an independent, clear contract.

## CI workflow

Run CI on pushes and pull requests. A practical progression for this project is:

1. `npm ci` from the committed lockfile.
2. Typecheck/build and run fast unit plus component integration tests.
3. Install only the Playwright browser engines in use (currently Chromium) and run E2E.
4. Upload the Playwright report and relevant failure artifacts even when tests fail, with sensible retention.
5. Keep Selenium optional until Chrome provisioning and runtime are deliberately standardized in CI; document the local command and prerequisites meanwhile.

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
