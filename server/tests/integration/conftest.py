"""Fixtures that run the API against an isolated copy of the migrated database."""

from collections.abc import Iterator
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import time
from typing import Any, Protocol
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

import pytest

from app import database


class ApiRequest(Protocol):
    def __call__(
        self,
        path: str,
        method: str = "GET",
        body: dict[str, Any] | None = None,
    ) -> tuple[int, Any]: ...


SERVER_DIRECTORY = Path(__file__).resolve().parents[2]


@pytest.fixture(scope="session")
def api_base_url(tmp_path_factory: pytest.TempPathFactory) -> Iterator[str]:
    """Start a real local API process using a temporary SQLite database copy."""
    source_database = database.DATABASE_PATH

    if not source_database.is_file():
        pytest.fail(
            "The migrated inventory database is missing. Run `npm run db:migrate` "
            "from the repository root before the integration tests."
        )

    temporary_directory = tmp_path_factory.mktemp("inventory-api")
    isolated_database = temporary_directory / "inventory.db"
    shutil.copyfile(source_database, isolated_database)

    with socket.socket() as port_socket:
        port_socket.bind(("127.0.0.1", 0))
        port = port_socket.getsockname()[1]

    base_url = f"http://127.0.0.1:{port}"
    log_path = temporary_directory / "uvicorn.log"
    process_environment = os.environ.copy()
    process_environment["INVENTORY_DB_PATH"] = str(isolated_database)

    with log_path.open("w") as server_log:
        server_process = subprocess.Popen(
            [
                sys.executable,
                "-m",
                "uvicorn",
                "app.main:app",
                "--host",
                "127.0.0.1",
                "--port",
                str(port),
            ],
            cwd=SERVER_DIRECTORY,
            env=process_environment,
            stdout=server_log,
            stderr=subprocess.STDOUT,
        )

        try:
            startup_deadline = time.monotonic() + 15

            while time.monotonic() < startup_deadline:
                if server_process.poll() is not None:
                    break

                try:
                    with urlopen(f"{base_url}/health", timeout=1) as response:
                        if response.status == 200:
                            break
                except (OSError, URLError):
                    time.sleep(0.1)
            else:
                pytest.fail(f"The inventory API did not start. See {log_path}.")

            if server_process.poll() is not None:
                server_log.flush()
                pytest.fail(
                    f"The inventory API exited during startup. See {log_path}:\n"
                    f"{log_path.read_text()}"
                )

            yield base_url
        finally:
            if server_process.poll() is None:
                server_process.terminate()

            try:
                server_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                server_process.kill()
                server_process.wait(timeout=5)


@pytest.fixture
def api_request(api_base_url: str) -> ApiRequest:
    """Send JSON requests to the temporary API server and return status/body."""

    def send_request(
        path: str,
        method: str = "GET",
        body: dict[str, Any] | None = None,
    ) -> tuple[int, Any]:
        request_body = None if body is None else json.dumps(body).encode("utf-8")
        request_headers = {"Content-Type": "application/json"} if body else {}
        request = Request(
            f"{api_base_url}{path}",
            data=request_body,
            headers=request_headers,
            method=method,
        )

        try:
            with urlopen(request, timeout=5) as response:
                response_body = response.read()
                return response.status, json.loads(response_body) if response_body else None
        except HTTPError as error:
            response_body = error.read()
            return error.code, json.loads(response_body) if response_body else None

    return send_request
