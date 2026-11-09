from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException
from app.routes import inventory


def test_sku_not_found_behaviour(monkeypatch):
    # mocking database connection to return none
    connection = MagicMock()
    connection.__enter__.return_value = connection
    connection.execute.return_value.fetchone.return_value = None

    monkeypatch.setattr(
        inventory,
        "database_connection",
        lambda: connection
    )

    with pytest.raises(HTTPException) as error:
        inventory.get_inventory_item("GM-US-007")

    assert error.value.status_code == 404

def test_sku_found(monkeypatch):
    connection = MagicMock()
    connection.__enter__.return_value = connection
    connection.execute.return_value.fetchone.return_value = {
        "id": 1,
        "sku": "NS-BAG-001",
        "name": "Everyday Backpack",
        "price": 85.27,
        "quantity": 24,
        "reorder_point": 10,
        "category": "Essentials",
        "image_url": "http://sample.com/100x100",
        "price_currency": "CAD",
        "source_market": "CA",
        "source_rank": None,
        "source_url": "http://sample.com"
    }
 
    monkeypatch.setattr(
        inventory,
        "database_connection",
        lambda: connection
    )

    response = inventory.get_inventory_item("NS-BAG-001")

    assert response.sku == "NS-BAG-001"
    assert response.status == "in_stock"
    assert response.quantity == 24
