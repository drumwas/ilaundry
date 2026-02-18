-- Migration: Add pricing_mode column to tbl_services_type and tbl_cart_servicelist
-- This column controls whether a service type charges per item or per kg (weight)
-- Default is 'per_item' so all existing data is unaffected.

-- Service types table: defines how each type is priced
ALTER TABLE tbl_services_type
  ADD COLUMN pricing_mode VARCHAR(10) NOT NULL DEFAULT 'per_item'
  COMMENT 'per_item = quantity-based, per_kg = weight-based pricing';

-- Cart service list table: carries the pricing mode into the cart for display/logic
ALTER TABLE tbl_cart_servicelist
  ADD COLUMN pricing_mode VARCHAR(10) NOT NULL DEFAULT 'per_item'
  COMMENT 'per_item or per_kg, copied from tbl_services_type on add-to-cart';
