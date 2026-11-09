# Repository Guidelines

## Project Structure & Module Organization

This repository contains the Northstar Inventory Management quality engineering project. Keep the React UI in `src/`, the Python API in `server/`, browser and API tests in `tests/`, the optional Selenium example in `selenium/`, database migrations in `database/migrations/`, and static assets in `public/` or `assets/` as appropriate. Keep generated output, the local SQLite database under `data/`, Python virtual environments, and local dependencies out of source control.

Before substantial work, read `README.md` for the learner-facing project plan, `.agent/MEMORY.md` for implementation state and continuity notes, and `.agent/skills/code-readability-maintainability/SKILL.md` for project coding guidance. Treat source code as authoritative if it conflicts with notes, then update the notes to match. `.agent/` is the canonical home for project agent skills and memory; check it for relevant guidance throughout the task.

## Build, Test, and Development Commands

Run commands from the repository root:

- `npm install` (or `npm ci` for a clean lockfile install) installs dependencies.
- `npx playwright install chromium` installs the Playwright browser locally.
- `npm run dev` starts the app at `http://127.0.0.1:5173`.
- `npm run build` type-checks and builds the production app.
- `npm run lint` runs the configured TypeScript check; it is not a stylistic linter.
- `npm test` runs Playwright; its config launches Vite on port 4173. Start FastAPI on port 8000 separately before browser tests against the connected dashboard.
- `npm run test:ui`, `npm run test:headed`, and `npm run test:debug` support interactive exploration and debugging.
- `.github/workflows/ci.yml` skips runs when only the root `README.md` changes. Otherwise, it prepares the Flyway SQLite database, runs Python unit and integration tests plus the frontend build, installs configured Playwright browsers and Chrome, starts FastAPI and Vite, then runs Playwright and the Selenium smoke. Playwright uses one worker in CI to keep database writes predictable.
- `npm run test:selenium` runs the Selenium smoke script; start FastAPI and Vite separately and have Chrome available. See the README for the three-terminal sequence.
- `npm run db:migrate` calls the Node wrapper in `scripts/flyway.mjs` to apply Flyway migrations to `data/inventory.db` (requires Flyway CLI on `PATH`).
- `npm run db:info` calls the same wrapper to show Flyway migration status (requires Flyway CLI on `PATH`).
- The Python inventory API lives in `server/app/`; install `server/requirements.txt` in a virtual environment and follow `server/README.md` to start it.
- The inventory list API caps each response at 15 items and supports `offset`, `search`, and stock `status` filters. The UI fetches a page only when the user navigates to it.
- Start the backend with `uvicorn app.main:app --app-dir server --reload --host 127.0.0.1 --port 8000` after activating `server/.venv`.
- Python unit and API integration tests use pytest under `server/tests/`; install `server/requirements-dev.txt`, apply Flyway migrations before the integration tests, and run `python -m pytest tests/unit tests/integration` from `server/`.

Do not claim checks passed unless they were actually run. Follow the user’s request about whether to run tests or verification.

## Coding Style & Naming Conventions

Follow the existing TypeScript/React style, use strict types and descriptive names, and prefer focused changes. Keep selectors user-facing and accessible (`getByRole`, `getByLabel`, `getByPlaceholder`) where practical. Avoid fixed sleeps; use Playwright’s retrying assertions and meaningful UI state. Keep test setup deterministic and tests independent.

## Testing Guidelines

Add or update tests for new behavior when requested or appropriate to the task. Name tests for the expected user-visible behavior. Cover meaningful boundaries and failure states, and assert outcomes rather than implementation details. See `MEMORY.md` for existing coverage and known gaps before adding overlapping cases. The app currently has Playwright browser coverage and an optional Selenium smoke flow.

## Continuity Notes

Maintain `.agent/MEMORY.md` as the concise, detailed project handoff for future coding agents. Update it whenever implementation, structure, commands, test coverage, CI, decisions, known issues, or verification status changes. Record the date and exact commands/results for checks that were run; mark checks as unrun when they were not. Keep it consistent with source, `README.md`, and this file, and preserve unresolved follow-ups and relevant decisions across task handoffs. Store project-specific reusable agent skills under `.agent/skills/{skill-name}/SKILL.md`. Update `AGENTS.md` too if project-wide workflow or conventions change.

## Commit & Pull Request Guidelines

No Git history was available during the initial project inspection, so no established commit convention can be inferred. Use concise imperative commit subjects (for example, `Add input validation`). Pull requests should explain the change and motivation, list relevant verification commands and results, and link related issues. Include screenshots for user interface changes.

## Security & Configuration

Do not commit credentials, tokens, or machine-specific configuration. Provide safe example configuration such as `.env.example` if future work introduces environment variables, and document required variables without real secrets.
