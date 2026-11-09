import pytest
from pydantic import ValidationError
from app.schemas import (
    CreateInventoryItem,
    PurchaseRequest
)

def test_rejects_whitespace_only_category():
    with pytest.raises(ValidationError):
        CreateInventoryItem(
            sku="NS-BAG-001",
            name="Everyday Backpack",
            price=91.20,
            quantity=24,
            reorder_point=12,
            category=" ",
            image_url="http://sample.com/100x100",
            price_currency="CAD",
            source_market="CA",
            source_rank=None,
            source_url="http://sample.com",
        )

def test_trimming_behaviour_creating_inventory_item():
    item = CreateInventoryItem(
        sku=" NS-BAG-001 ",
        name="Everyday Backpack",
        price=91.20,
        quantity=24,
        reorder_point=12,
        category=" accessories     ",
        image_url="http://sample.com/100x100",
        price_currency="CAD",
        source_market="CA",
        source_rank=None,
        source_url="http://sample.com",
    )
    assert item.category == item.category.strip()
    assert item.sku == item.sku.strip()
    assert item.category == "accessories"
    assert item.sku == "NS-BAG-001"


def test_rejects_negative_item_quantity():
    with pytest.raises(ValidationError):
        CreateInventoryItem(
            sku=" NS-BAG-001 ",
            name="Everyday Backpack",
            price=91.20,
            quantity=-1,
            reorder_point=12,
            category=" accessories     ",
            image_url="http://sample.com/100x100",
            price_currency="CAD",
            source_market="CA",
            source_rank=None,
            source_url="http://sample.com",
        )

def test_rejects_negative_item_reorder_point():
    with pytest.raises(ValidationError):
        CreateInventoryItem(
            sku=" NS-BAG-001 ",
            name="Everyday Backpack",
            price=91.20,
            quantity=10,
            reorder_point=-10,
            category=" accessories     ",
            image_url="http://sample.com/100x100",
            price_currency="CAD",
            source_market="CA",
            source_rank=None,
            source_url="http://sample.com",
        )

def test_accepts_zero_item_quantity():
    item = CreateInventoryItem(
        sku=" NS-BAG-001 ",
        name="Everyday Backpack",
        price=91.20,
        quantity=0,
        reorder_point=12,
        category=" accessories     ",
        image_url="http://sample.com/100x100",
        price_currency="CAD",
        source_market="CA",
        source_rank=None,
        source_url="http://sample.com",
    )

    assert item.quantity == 0

def test_accepts_zero_item_reorder_point():
    item = CreateInventoryItem(
        sku=" NS-BAG-001 ",
        name="Everyday Backpack",
        price=91.20,
        quantity=10,
        reorder_point=0,
        category=" accessories     ",
        image_url="http://sample.com/100x100",
        price_currency="CAD",
        source_market="CA",
        source_rank=None,
        source_url="http://sample.com",
    )

    assert item.reorder_point == 0

def test_rejects_negative_item_price():
    with pytest.raises(ValidationError):
        CreateInventoryItem(
            sku=" NS-BAG-001 ",
            name="Everyday Backpack",
            price=-25,
            quantity=10,
            reorder_point=10,
            category=" accessories     ",
            image_url="http://sample.com/100x100",
            price_currency="CAD",
            source_market="CA",
            source_rank=None,
            source_url="http://sample.com",
        )

def test_rejects_negative_purchase_quantity():
    with pytest.raises(ValidationError):
        PurchaseRequest(quantity=-1)

def test_rejects_zero_purchase_quantity():
    with pytest.raises(ValidationError):
        PurchaseRequest(quantity=0)

def test_accept_positive_purchase_quantity():
    req = PurchaseRequest(quantity=1)
    assert req.quantity == 1

def test_rejects_fractional_purchase_quantity():
    with pytest.raises(ValidationError):
        PurchaseRequest(quantity=1.25) # type: ignore