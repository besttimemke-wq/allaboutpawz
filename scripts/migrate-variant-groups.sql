-- ---------------------------------------------------------------------------
-- Variant grouping (ADDITIVE-ONLY schema change)
--
-- The supplier feed ships the same physical item as multiple product rows
-- that differ only by color / size / price ("items by colors, different
-- pricing for the same damn item" — owner, Nov 2026). Products carries a
-- variant_group_id uuid column but the feed never populates it (0/10,699).
--
-- variant_group_key is a TEXT group key computed from the item identity:
--   <normalized brand> | <normalized base name>
-- where normalization strips color words, size tokens and punctuation so
-- "Warren London Dog Coat — Brown, Medium" and "…Black, Large" collapse into
-- one group. One row per group becomes the PLP card; the rest surface as
-- "Other options" swatches on the PDP (Chewy-style).
--
-- Additive only: new nullable column, no existing column touched, fully
-- reversible (DROP COLUMN variant_group_key).
-- ---------------------------------------------------------------------------

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS variant_group_key text;

-- Fast lookup for PDP "same item, other options".
CREATE INDEX IF NOT EXISTS products_variant_group_key_idx
  ON products (variant_group_key)
  WHERE variant_group_key IS NOT NULL;
