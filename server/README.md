# Northstar Inventory API

This Python API exposes the Flyway-managed SQLite inventory catalog and powers the React inventory dashboard. The API owns stock values and movement records; the browser refreshes its displayed quantity from API responses.

## Setup

Run from the repository root:

```bash
python3 -m venv server/.venv
source server/.venv/bin/activate
python -m pip install -r server/requirements.txt
```

If the SQLite database has not been created or migrated yet, run `npm run db:migrate` from the repository root first. V4 adds the persistent stock movement table.

## Start the API

```bash
uvicorn app.main:app --app-dir server --reload --host 127.0.0.1 --port 8000
```

Interactive endpoint documentation is available at <http://127.0.0.1:8000/docs>. Health check: <http://127.0.0.1:8000/health>.

Set `INVENTORY_DB_PATH` to use a separate SQLite database, which is useful for isolated development and test runs.

## Python unit-test setup

Install the test dependency from the `server/` directory:

```bash
python -m pip install -r requirements-dev.txt
python -m pytest tests/unit
```

The first learner exercise is in `server/tests/unit/README.md`. Unit tests should construct Pydantic models directly and avoid starting FastAPI or touching SQLite. `httpx2` is included so later API tests can use FastAPI's `TestClient` with the installed Starlette version.

## Endpoints

- `GET /api/items`: list at most 15 inventory items per request. Use `limit` (up to 15) and `offset` for pagination, plus optional `search` and `status` filters. `X-Total-Count` reports the total number of matching records; the API does not fetch later pages until requested.
- `GET /api/items/{sku}`: retrieve one SKU.
- `POST /api/items`: add a SKU; duplicate SKUs return `409`.
- `DELETE /api/items/{sku}`: delete a SKU (intended for inventory management and test cleanup).
- `POST /api/items/{sku}/receipts`: add stock and record a positive movement.
- `POST /api/items/{sku}/adjustments`: remove stock and record a negative movement. Insufficient stock returns `409` without changing inventory or history.
- `POST /api/items/{sku}/purchases`: decrement stock atomically. Invalid quantities return `422`, an unknown SKU returns `404`, and insufficient stock returns `409` without changing inventory.
- `GET /api/movements`: list recent persisted stock movements.

Purchase uses a SQLite write transaction and a conditional `UPDATE ... WHERE quantity >= requested_quantity`. This protects the last unit from being sold twice. For the user's concurrency exercise, create a one-unit SKU, send two purchase requests at once, then check that only one request succeeds and the stored quantity is zero.

The React app and API are separate development processes. Start the API in one terminal and Vite in another. The browser tests are learner-owned; start the API before `npm test` because the current Playwright configuration only launches Vite. The existing UI tests use fixed in-memory Northstar SKUs and counts, so update their fixtures to create isolated database-backed products before relying on them with the 100-row API catalog.

The demo has no authentication or authorization. Do not expose the create/delete endpoints or this database to an untrusted network.
