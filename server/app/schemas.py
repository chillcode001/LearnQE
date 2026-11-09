"""Validated API request and response models."""

from typing import Literal

from pydantic import BaseModel, Field, field_validator


StockStatus = Literal["in_stock", "low_stock", "out_of_stock"]


class InventoryItem(BaseModel):
    """A SKU and its current stock state."""

    id: int
    sku: str
    name: str
    price: float
    quantity: int
    reorder_point: int
    category: str
    image_url: str
    price_currency: str
    source_market: str
    source_rank: int | None
    source_url: str
    status: StockStatus


class CreateInventoryItem(BaseModel):
    """Fields needed to add a SKU, including isolated test fixtures."""

    sku: str = Field(min_length=1, max_length=80)
    name: str = Field(min_length=1, max_length=300)
    price: float = Field(ge=0, allow_inf_nan=False)
    quantity: int = Field(ge=0)
    reorder_point: int = Field(ge=0)
    category: str = Field(default="Other", min_length=1, max_length=100)
    image_url: str = ""
    price_currency: Literal["CAD", "USD"] = "CAD"
    source_market: Literal["CA", "US"] = "CA"
    source_rank: int | None = Field(default=None, gt=0)
    source_url: str = ""

    @field_validator("sku", "name", "category")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        cleaned_value = value.strip()
        if not cleaned_value:
            raise ValueError("This field must contain non-whitespace text.")
        return cleaned_value


class PurchaseRequest(BaseModel):
    """Quantity to purchase from one SKU."""

    quantity: int = Field(strict=True, gt=0)


class PurchaseResponse(BaseModel):
    """Result returned after a successful stock decrement."""

    sku: str
    purchased_quantity: int
    remaining_quantity: int


class StockMovementRequest(BaseModel):
    """Quantity and reason for a receive or adjustment operation."""

    quantity: int = Field(strict=True, gt=0)
    reason: str = Field(min_length=1, max_length=200)

    @field_validator("reason")
    @classmethod
    def strip_required_reason(cls, value: str) -> str:
        cleaned_value = value.strip()
        if not cleaned_value:
            raise ValueError("Reason must contain non-whitespace text.")
        return cleaned_value


class StockMovementResponse(BaseModel):
    """A persisted movement and stock quantity immediately after it."""

    id: int
    sku: str
    item_name: str
    change: int
    reason: str
    recorded_at: str
    quantity_after: int
