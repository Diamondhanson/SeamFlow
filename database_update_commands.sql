-- ============================================
-- ADD COLORS AND FABRICS COLUMNS TO ORDERS TABLE
-- ============================================

-- Add colors column (array of text) to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS colors TEXT[] DEFAULT '{}';

-- Add fabrics column (array of text) to orders table  
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS fabrics TEXT[] DEFAULT '{}';

-- ============================================
-- ADD COLORS AND FABRICS COLUMNS TO BULK_ORDERS TABLE
-- ============================================

-- Add colors column (array of text) to bulk_orders table
ALTER TABLE bulk_orders 
ADD COLUMN IF NOT EXISTS colors TEXT[] DEFAULT '{}';

-- Add fabrics column (array of text) to bulk_orders table
ALTER TABLE bulk_orders 
ADD COLUMN IF NOT EXISTS fabrics TEXT[] DEFAULT '{}';

-- ============================================
-- VERIFY THE UPDATES
-- ============================================

-- Check if columns were added successfully to orders table
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('colors', 'fabrics');

-- Check if columns were added successfully to bulk_orders table
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'bulk_orders' 
AND column_name IN ('colors', 'fabrics');

-- ============================================
-- OPTIONAL: ADD INDEXES FOR BETTER PERFORMANCE
-- ============================================

-- Add GIN index for colors array searches (optional - for better performance)
CREATE INDEX IF NOT EXISTS idx_orders_colors ON orders USING GIN (colors);
CREATE INDEX IF NOT EXISTS idx_bulk_orders_colors ON bulk_orders USING GIN (colors);

-- Add GIN index for fabrics array searches (optional - for better performance)  
CREATE INDEX IF NOT EXISTS idx_orders_fabrics ON orders USING GIN (fabrics);
CREATE INDEX IF NOT EXISTS idx_bulk_orders_fabrics ON bulk_orders USING GIN (fabrics);

-- ============================================
-- SAMPLE QUERIES TO TEST (OPTIONAL)
-- ============================================

-- Test query: Find orders with specific color
-- SELECT * FROM orders WHERE 'Red' = ANY(colors);

-- Test query: Find orders with specific fabric  
-- SELECT * FROM orders WHERE 'Cotton' = ANY(fabrics);

-- Test query: Find bulk orders with multiple colors
-- SELECT * FROM bulk_orders WHERE colors && ARRAY['Red', 'Blue']; 