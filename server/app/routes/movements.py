"""Stock movement history endpoint."""

from fastapi import APIRouter, Query

from app.database import database_connection
from app.schemas import StockMovementResponse


router = APIRouter(prefix="/api/movements", tags=["inventory activity"])


@router.get("", response_model=list[StockMovementResponse])
def list_stock_movements(
    limit: int = Query(default=5, ge=1, le=100),
) -> list[StockMovementResponse]:
    """Return recent stock movements in newest-first order."""
    with database_connection() as connection:
        rows = connection.execute(
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
            ORDER BY movement.id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

    return [
        StockMovementResponse.model_validate(dict(row))
        for row in rows
    ]
