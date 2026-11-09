"""Inventory and purchase endpoints."""

import sqlite3

from fastapi import APIRouter, HTTPException, Query, Response, status

from app.database import database_connection
from app.schemas import (
    CreateInventoryItem,
    InventoryItem,
    PurchaseRequest,
    PurchaseResponse,
    StockMovementRequest,
    StockMovementResponse,
    StockStatus,
)


router = APIRouter(prefix="/api/items", tags=["inventory"])


def to_inventory_item(row: sqlite3.Row) -> InventoryItem:
    """Convert a database row into the API representation."""
    quantity = row["quantity"]
    reorder_point = row["reorder_point"]

    if quantity == 0:
        stock_status: StockStatus = "out_of_stock"
    elif quantity <= reorder_point:
        stock_status = "low_stock"
    else:
        stock_status = "in_stock"

    return InventoryItem(
        id=row["id"],
        sku=row["sku"],
        name=row["name"],
        price=row["price"],
        quantity=quantity,
        reorder_point=reorder_point,
        category=row["category"],
        image_url=row["image_url"],
        price_currency=row["price_currency"],
        source_market=row["source_market"],
        source_rank=row["source_rank"],
        source_url=row["source_url"],
        status=stock_status,
    )


def to_stock_movement(row: sqlite3.Row) -> StockMovementResponse:
    """Convert a persisted movement row into the API representation."""
    return StockMovementResponse(
        id=row["id"],
        sku=row["sku"],
        item_name=row["item_name"],
        change=row["change"],
        reason=row["reason"],
        recorded_at=row["recorded_at"],
        quantity_after=row["quantity_after"],
    )


def apply_stock_change(
    sku: str,
    quantity_change: int,
    reason: str,
) -> StockMovementResponse:
    """Change stock and write its audit record in one transaction."""
    with database_connection() as connection:
        connection.execute("BEGIN IMMEDIATE")

        item = connection.execute(
            "SELECT id FROM sku WHERE sku = ?",
            (sku,),
        ).fetchone()

        if item is None:
            connection.rollback()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"SKU '{sku}' was not found.",
            )

        update = connection.execute(
            """
            UPDATE sku
            SET quantity = quantity + ?
            WHERE sku = ? AND quantity + ? >= 0
            """,
            (quantity_change, sku, quantity_change),
        )

        if update.rowcount == 0:
            connection.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Insufficient stock to complete this movement.",
            )

        quantity_after = connection.execute(
            "SELECT quantity FROM sku WHERE sku = ?",
            (sku,),
        ).fetchone()["quantity"]

        movement_cursor = connection.execute(
            """
            INSERT INTO stock_movement (sku, change, reason, quantity_after)
            VALUES (?, ?, ?, ?)
            """,
            (sku, quantity_change, reason, quantity_after),
        )

        movement = connection.execute(
            """
            SELECT
                movement.id,
                movement.sku,
                sku.name AS item_name,
                movement.change,
                movement.reason,
                strftime('%Y-%m-%dT%H:%M:%SZ', movement.recorded_at) AS recorded_at,
                movement.quantity_after
            FROM stock_movement AS movement
            JOIN sku ON sku.sku = movement.sku
            WHERE movement.id = ?
            """,
            (movement_cursor.lastrowid,),
        ).fetchone()
        connection.commit()

    if movement is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="The movement was saved but could not be loaded.",
        )

    return to_stock_movement(movement)


@router.get("", response_model=list[InventoryItem])
def list_inventory(
    response: Response,
    limit: int = Query(default=15, ge=1, le=15),
    offset: int = Query(default=0, ge=0),
    search: str = Query(default="", max_length=200),
    stock_status: StockStatus | None = Query(default=None, alias="status"),
) -> list[InventoryItem]:
    """Return one filtered inventory page with its matching row count."""
    conditions = []
    parameters: list[object] = []

    if search.strip():
        conditions.append("(name LIKE ? OR sku LIKE ? OR category LIKE ?)")
        search_pattern = f"%{search.strip()}%"
        parameters.extend([search_pattern, search_pattern, search_pattern])

    if stock_status == "out_of_stock":
        conditions.append("quantity = 0")
    elif stock_status == "low_stock":
        conditions.append("quantity > 0 AND quantity <= reorder_point")
    elif stock_status == "in_stock":
        conditions.append("quantity > reorder_point")

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    with database_connection() as connection:
        total = connection.execute(
            f"SELECT COUNT(*) FROM sku {where_clause}",
            parameters,
        ).fetchone()[0]
        rows = connection.execute(
            f"""
            SELECT *
            FROM sku
            {where_clause}
            ORDER BY sku
            LIMIT ? OFFSET ?
            """,
            [*parameters, limit, offset],
        ).fetchall()

    response.headers["X-Total-Count"] = str(total)
    return [to_inventory_item(row) for row in rows]


@router.get("/{sku}", response_model=InventoryItem)
def get_inventory_item(sku: str) -> InventoryItem:
    """Return one SKU or a 404 response when it does not exist."""
    with database_connection() as connection:
        row = connection.execute(
            "SELECT * FROM sku WHERE sku = ?",
            (sku,),
        ).fetchone()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"SKU '{sku}' was not found.",
        )

    return to_inventory_item(row)


@router.post(
    "",
    response_model=InventoryItem,
    status_code=status.HTTP_201_CREATED,
)
def create_inventory_item(item: CreateInventoryItem) -> InventoryItem:
    """Create a SKU; useful for normal inventory setup and isolated test data."""
    try:
        with database_connection() as connection:
            cursor = connection.execute(
                """
                INSERT INTO sku (
                    sku,
                    name,
                    price,
                    quantity,
                    reorder_point,
                    category,
                    image_url,
                    price_currency,
                    source_market,
                    source_rank,
                    source_url
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    item.sku,
                    item.name,
                    item.price,
                    item.quantity,
                    item.reorder_point,
                    item.category,
                    item.image_url,
                    item.price_currency,
                    item.source_market,
                    item.source_rank,
                    item.source_url,
                ),
            )
            row = connection.execute(
                "SELECT * FROM sku WHERE id = ?",
                (cursor.lastrowid,),
            ).fetchone()
    except sqlite3.IntegrityError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"SKU '{item.sku}' already exists or violates an inventory constraint.",
        ) from error

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="The inventory item was created but could not be loaded.",
        )

    return to_inventory_item(row)


@router.delete("/{sku}", status_code=status.HTTP_204_NO_CONTENT)
def delete_inventory_item(sku: str) -> Response:
    """Delete a SKU, allowing test fixtures to clean up their own records."""
    with database_connection() as connection:
        cursor = connection.execute(
            "DELETE FROM sku WHERE sku = ?",
            (sku,),
        )

    if cursor.rowcount == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"SKU '{sku}' was not found.",
        )

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/{sku}/receipts",
    response_model=StockMovementResponse,
    status_code=status.HTTP_201_CREATED,
)
def receive_stock(sku: str, request: StockMovementRequest) -> StockMovementResponse:
    """Add stock and persist the corresponding movement record."""
    return apply_stock_change(sku, request.quantity, request.reason)


@router.post(
    "/{sku}/adjustments",
    response_model=StockMovementResponse,
    status_code=status.HTTP_201_CREATED,
)
def adjust_stock(sku: str, request: StockMovementRequest) -> StockMovementResponse:
    """Remove stock and persist the corresponding movement record."""
    return apply_stock_change(sku, -request.quantity, request.reason)


@router.post(
    "/{sku}/purchases",
    response_model=PurchaseResponse,
)
def purchase_inventory(
    sku: str,
    request: PurchaseRequest,
) -> PurchaseResponse:
    """Atomically decrement stock and write a purchase movement."""
    movement = apply_stock_change(sku, -request.quantity, "Customer purchase")
    return PurchaseResponse(
        sku=sku,
        purchased_quantity=request.quantity,
        remaining_quantity=movement.quantity_after,
    )
