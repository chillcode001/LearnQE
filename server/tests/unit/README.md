# Unit tests

Write unit tests here for small Python behaviors that do not need HTTP or SQLite.

## First exercise

Start with `CreateInventoryItem` in `app/schemas.py`. Its `strip_required_text` validator trims `sku`, `name`, and `category`, and rejects values that contain only whitespace.

Write tests for these behaviors:

1. A value with surrounding spaces is accepted and stored trimmed.
2. A whitespace-only SKU is rejected with Pydantic's `ValidationError`.
3. A normal SKU and name are accepted unchanged.

Construct `CreateInventoryItem` directly in these tests. Do not call an API route or open the real inventory database; that would make the test an integration/API test rather than a unit test.

Run the tests from the `server/` directory with:

```bash
python -m pytest tests/unit
```
