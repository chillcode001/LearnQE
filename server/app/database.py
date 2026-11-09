"""SQLite connection helpers for the inventory API."""

from collections.abc import Iterator
from contextlib import contextmanager
import os
from pathlib import Path
import sqlite3


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATABASE_PATH = Path(
    os.environ.get("INVENTORY_DB_PATH", PROJECT_ROOT / "data" / "inventory.db")
).expanduser()


@contextmanager
def database_connection() -> Iterator[sqlite3.Connection]:
    """Open one short-lived SQLite connection for a request."""
    connection = sqlite3.connect(
        DATABASE_PATH,
        timeout=10,
        isolation_level=None,
    )
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    try:
        yield connection
    finally:
        connection.close()


def verify_database_is_ready() -> None:
    """Fail startup with a useful message if Flyway has not prepared the DB."""
    if not DATABASE_PATH.is_file():
        raise RuntimeError(
            f"Inventory database not found at {DATABASE_PATH}. "
            "Run the Flyway migrations before starting the API."
        )

    try:
        with database_connection() as connection:
            connection.execute("SELECT sku FROM sku LIMIT 1")
            connection.execute("SELECT id FROM stock_movement LIMIT 1")
    except sqlite3.Error as error:
        raise RuntimeError(
            f"Inventory database at {DATABASE_PATH} is not ready. "
            "Check that Flyway migrations have been applied."
        ) from error
