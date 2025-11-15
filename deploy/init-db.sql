-- Database initialization script for WhisperAPI
-- This script sets up extensions and optimizations

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create indexes for performance (Prisma migrations will create the main schema)
-- These are additional performance optimizations

-- Set default timezone
SET timezone = 'UTC';

-- Configure for better performance
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = '0.9';
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = '100';
ALTER SYSTEM SET random_page_cost = '1.1';
ALTER SYSTEM SET effective_io_concurrency = '200';
ALTER SYSTEM SET work_mem = '4MB';
ALTER SYSTEM SET min_wal_size = '1GB';
ALTER SYSTEM SET max_wal_size = '4GB';

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE whisperapi TO whisper;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO whisper;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO whisper;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'WhisperAPI database initialized successfully';
END $$;
