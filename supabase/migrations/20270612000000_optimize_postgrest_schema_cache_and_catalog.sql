-- Give PostgREST authenticator enough headroom (5min) and sort/hash memory
-- to complete schema-cache builds cleanly on 800+ relations under CPU load,
-- while keeping anon (3s) and authenticated (8s) per-request timeouts untouched.
ALTER ROLE authenticator SET statement_timeout = '5min';
ALTER ROLE authenticator SET work_mem = '32MB';

NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';
