-- Migration: Add product_ids column to forms table
-- Description: Stores the list of product/service IDs associated with a pre-sale form

-- Add product_ids to forms table (array of UUIDs)
ALTER TABLE forms ADD COLUMN IF NOT EXISTS product_ids UUID[] DEFAULT NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_forms_product_ids ON forms USING GIN(product_ids);
