CREATE TABLE stock_movement (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku TEXT NOT NULL REFERENCES sku(sku) ON DELETE CASCADE,
    change INTEGER NOT NULL CHECK (change <> 0),
    reason TEXT NOT NULL CHECK (length(trim(reason)) > 0),
    quantity_after INTEGER NOT NULL CHECK (quantity_after >= 0),
    recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stock_movement_recorded_at
    ON stock_movement(recorded_at DESC, id DESC);
