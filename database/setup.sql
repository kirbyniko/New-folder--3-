-- Setup script for local PostgreSQL database

-- Create database (run this as postgres user)
-- CREATE DATABASE civitron;

-- Connect to the database
\c civitron;

-- Run the schema
\i schema.sql;

-- Verify tables were created
\dt

-- Show some stats
SELECT 
  'states' as table_name, 
  COUNT(*) as row_count 
FROM states
UNION ALL
SELECT 
  'events' as table_name, 
  COUNT(*) as row_count 
FROM events
UNION ALL
SELECT 
  'bills' as table_name, 
  COUNT(*) as row_count 
FROM bills;
