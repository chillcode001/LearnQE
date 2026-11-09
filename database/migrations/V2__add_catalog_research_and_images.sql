ALTER TABLE sku
    ADD COLUMN category TEXT NOT NULL DEFAULT 'Other';

ALTER TABLE sku
    ADD COLUMN image_url TEXT NOT NULL DEFAULT '';

ALTER TABLE sku
    ADD COLUMN price_currency TEXT NOT NULL DEFAULT 'CAD'
        CHECK (price_currency IN ('CAD', 'USD'));

ALTER TABLE sku
    ADD COLUMN source_market TEXT NOT NULL DEFAULT 'CA'
        CHECK (source_market IN ('CA', 'US'));

ALTER TABLE sku
    ADD COLUMN source_rank INTEGER
        CHECK (source_rank IS NULL OR source_rank > 0);

ALTER TABLE sku
    ADD COLUMN source_url TEXT NOT NULL DEFAULT '';
