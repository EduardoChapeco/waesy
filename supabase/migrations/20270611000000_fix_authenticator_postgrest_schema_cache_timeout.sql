-- Prevent PostgREST PGRST002 infinite schema-cache retry loops on large schemas (860+ tables/views)
-- Preserves anon (3s) and authenticated (8s) per-request query timeouts.
ALTER ROLE authenticator SET statement_timeout = '45s';
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';
