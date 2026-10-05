# Supabase Methodology (Local Snapshot)
Source: .agents/skills/supabase/SKILL.md

1. Verify against Supabase docs and real DB schema.
2. Views bypass RLS by default: Use WITH (security_invoker = true) in Postgres 15+.
3. Storage RLS: Ensure storage.objects has explicit policies; never leave public ALL permissions.
4. Private buckets must have public = false in storage.buckets.
5. auth.role() is deprecated - use TO clause.
6. Verify your work empirically with real queries and negative security probes.
