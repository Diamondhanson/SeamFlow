-- ============================================
-- 1. CHECK IF COLORS & FABRICS COLUMNS EXIST
-- ============================================

-- Check orders table columns
SELECT 
    table_name,
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('colors', 'fabrics')
ORDER BY column_name;

-- Check bulk_orders table columns  
SELECT 
    table_name,
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'bulk_orders' 
AND column_name IN ('colors', 'fabrics')
ORDER BY column_name;

-- ============================================
-- 2. CHECK ALL COLUMNS IN ORDERS TABLE
-- ============================================

SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'orders'
ORDER BY ordinal_position;

-- ============================================
-- 3. CHECK ALL COLUMNS IN BULK_ORDERS TABLE  
-- ============================================

SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'bulk_orders'
ORDER BY ordinal_position;

-- ============================================
-- 4. CHECK RECENT DATA IN ORDERS TABLE
-- ============================================

-- Check last 5 orders with colors/fabrics data
SELECT 
    id,
    order_name,
    colors,
    fabrics,
    created_at,
    date_ordered
FROM orders 
ORDER BY created_at DESC 
LIMIT 5;

-- ============================================
-- 5. CHECK RECENT DATA IN BULK_ORDERS TABLE
-- ============================================

-- Check last 5 bulk orders with colors/fabrics data
SELECT 
    id,
    order_name,
    colors,
    fabrics,
    created_at,
    date_ordered
FROM bulk_orders 
ORDER BY created_at DESC 
LIMIT 5;

-- ============================================
-- 6. COUNT ORDERS WITH/WITHOUT COLORS & FABRICS
-- ============================================

-- Count orders with colors data
SELECT 
    'Orders with colors' as description,
    COUNT(*) as count
FROM orders 
WHERE colors IS NOT NULL AND array_length(colors, 1) > 0
UNION ALL
SELECT 
    'Orders without colors' as description,
    COUNT(*) as count
FROM orders 
WHERE colors IS NULL OR array_length(colors, 1) IS NULL OR array_length(colors, 1) = 0;

-- Count orders with fabrics data
SELECT 
    'Orders with fabrics' as description,
    COUNT(*) as count
FROM orders 
WHERE fabrics IS NOT NULL AND array_length(fabrics, 1) > 0
UNION ALL
SELECT 
    'Orders without fabrics' as description,
    COUNT(*) as count
FROM orders 
WHERE fabrics IS NULL OR array_length(fabrics, 1) IS NULL OR array_length(fabrics, 1) = 0;

-- ============================================
-- 7. CHECK FOR DATA TYPE ISSUES
-- ============================================

-- Check if colors/fabrics columns are arrays
SELECT 
    table_name,
    column_name,
    data_type,
    udt_name
FROM information_schema.columns 
WHERE table_name IN ('orders', 'bulk_orders')
AND column_name IN ('colors', 'fabrics');

-- ============================================
-- 8. TEST INSERT CAPABILITY (OPTIONAL - BE CAREFUL!)
-- ============================================

-- UNCOMMENT AND MODIFY TO TEST INSERT (replace with your user_id)
-- WARNING: This will create test data in your database!

/*
INSERT INTO orders (
    user_id, 
    order_name, 
    date_ordered, 
    date_delivery, 
    notes, 
    status,
    colors, 
    fabrics
) VALUES (
    'your-user-id-here',  -- Replace with actual user ID
    'TEST ORDER - DELETE ME',
    '2024-01-15',
    '2024-01-30', 
    'Test order for colors/fabrics',
    'registered',
    ARRAY['Red', 'Blue'],
    ARRAY['Cotton', 'Silk']
);
*/

-- ============================================
-- 9. CHECK TABLE CREATION SCRIPTS
-- ============================================

-- Show the current table definition for orders
SELECT 
    pg_get_tabledef('public.orders');

-- Show the current table definition for bulk_orders  
SELECT 
    pg_get_tabledef('public.bulk_orders');

-- ============================================
-- 10. CHECK FOR PERMISSIONS ISSUES
-- ============================================

-- Check if you have INSERT/UPDATE permissions
SELECT 
    table_name, 
    privilege_type 
FROM information_schema.table_privileges 
WHERE table_name IN ('orders', 'bulk_orders')
AND grantee = current_user; 