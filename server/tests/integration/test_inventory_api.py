"""API integration checks for persisted inventory and movement behavior."""

from collections.abc import Callable, Iterator
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Protocol
from uuid import uuid4

import pytest


class ApiRequest(Protocol):
    def __call__(
        self,
        path: str,
        method: str = "GET",
        body: dict[str, Any] | None = None,
    ) -> tuple[int, Any]: ...


@pytest.fixture
def create_inventory_item(
    api_request: ApiRequest,
) -> Iterator[Callable[[int, int], tuple[int, dict[str, Any]]]]:
    """Create unique SKUs for a test and delete them during teardown."""
    created_skus: list[str] = []

    def create_item(
        quantity: int,
        reorder_point: int,
    ) -> tuple[int, dict[str, Any]]:
        sku = f"INTEGRATION-{uuid4().hex[:12]}"
        status_code, response_body = api_request(
            "/api/items",
            "POST",
            {
                "sku": sku,
                "name": f"Integration test item {sku}",
                "price": 19.99,
                "quantity": quantity,
                "reorder_point": reorder_point,
                "category": "Integration tests",
            },
        )

        if status_code == 201:
            created_skus.append(sku)

        return status_code, {"sku": sku, **(response_body or {})}

    yield create_item

    for sku in created_skus:
        status_code, _ = api_request(
            f"/api/items/{sku}",
            "DELETE",
        )
        assert status_code == 204


def test_two_purchases_cannot_both_buy_the_last_unit(
    api_request: ApiRequest,
    create_inventory_item: Callable[[int, int], tuple[int, dict[str, Any]]],
) -> None:
    create_status, created_item = create_inventory_item(quantity=1, reorder_point=1)
    sku = created_item["sku"]

    with ThreadPoolExecutor(max_workers=2) as executor:
        purchase_futures = [
            executor.submit(
                api_request,
                f"/api/items/{sku}/purchases",
                "POST",
                {"quantity": 1},
            )
            for _ in range(2)
        ]
        purchase_responses = [future.result() for future in purchase_futures]

    item_status, item = api_request(f"/api/items/{sku}")
    history_status, history = api_request("/api/movements?limit=100")
    item_movements = [movement for movement in history if movement["sku"] == sku]
    purchase_statuses = sorted(status_code for status_code, _ in purchase_responses)

    assert create_status == 201
    assert purchase_statuses == [200, 409]

    successful_purchase = next(
        body for status_code, body in purchase_responses if status_code == 200
    )
    rejected_purchase = next(
        body for status_code, body in purchase_responses if status_code == 409
    )

    assert successful_purchase["remaining_quantity"] == 0
    assert rejected_purchase["detail"] == "Insufficient stock to complete this movement."
    assert item_status == 200
    assert item["quantity"] == 0
    assert item["status"] == "out_of_stock"
    assert history_status == 200
    assert len(item_movements) == 1
    assert item_movements[0]["change"] == -1
    assert item_movements[0]["reason"] == "Customer purchase"
    assert item_movements[0]["quantity_after"] == 0


def test_receipt_updates_inventory_and_persists_movement(
    api_request: ApiRequest,
    create_inventory_item: Callable[[int, int], tuple[int, dict[str, Any]]],
) -> None:
    _, created_item = create_inventory_item(quantity=9, reorder_point=10)
    sku = created_item["sku"]

    receipt_status, receipt = api_request(
        f"/api/items/{sku}/receipts",
        "POST",
        {"quantity": 2, "reason": "Customer return"},
    )
    item_status, item = api_request(f"/api/items/{sku}")
    history_status, history = api_request("/api/movements?limit=100")
    item_movements = [movement for movement in history if movement["sku"] == sku]

    assert receipt_status == 201
    assert receipt["change"] == 2
    assert receipt["quantity_after"] == 11
    assert item_status == 200
    assert item["quantity"] == 11
    assert item["status"] == "in_stock"
    assert history_status == 200
    assert item_movements == [receipt]


def test_rejected_adjustment_preserves_inventory_and_history(
    api_request: ApiRequest,
    create_inventory_item: Callable[[int, int], tuple[int, dict[str, Any]]],
) -> None:
    _, created_item = create_inventory_item(quantity=1, reorder_point=5)
    sku = created_item["sku"]

    adjustment_status, error = api_request(
        f"/api/items/{sku}/adjustments",
        "POST",
        {"quantity": 2, "reason": "Damaged goods"},
    )
    item_status, item = api_request(f"/api/items/{sku}")
    history_status, history = api_request("/api/movements?limit=100")

    assert adjustment_status == 409
    assert error["detail"] == "Insufficient stock to complete this movement."
    assert item_status == 200
    assert item["quantity"] == 1
    assert history_status == 200
    assert not any(movement["sku"] == sku for movement in history)
