# Dispatch: Explorer Survey 3 (Security, RLS, Storage Buckets, BFF & 4-State Matrix)

- Working Directory: c:\Users\Excelência Tour SMO\Documents\waesy\.agents\teamwork\explorer_survey_r8_3
- Original Request: c:\Users\Excelência Tour SMO\Documents\waesy\.agents\teamwork\ORIGINAL_REQUEST.md
- Task: Investigate platform security, Supabase RLS, storage buckets, BFF architecture and 4-state UI matrix:
1. Supabase schema & migrations: investigate the 585 tables and their RLS policies. Verify deny-by-default, multi-tenant isolation with sovereign `store_id`, and check sensitive RPC functions for `SECURITY DEFINER` with explicit `SET search_path = public`.
2. Public routes & ActionAuthGuardModal: investigate public transactional routes (`_store.*`, commerce, listings, mobility, services) and verify where anonymous users attempt transactional mutations (buy, book, quote, contact) to ensure ActionAuthGuardModal is properly wired with exact `returnUrl`.
3. Storage buckets: audit `avatars`, `banners`, `classifieds-images`, `cms-media` (and other buckets). Verify triple governance (bucket upload + external URL + Ctrl+V paste) and broken image prevention (`onError` neutral SVG fallback).
4. BFF Server Functions & Invariant B.25: inspect `src/services/*.functions.ts`. Verify if 100% of typed parameters from Zod schemas are safely destructured or guarded with defensive coalescing.
5. 4-State Matrix: assess coverage of data, loading/skeleton, empty state, and error state across public routes and workspaces.
Produce a comprehensive report at c:\Users\Excelência Tour SMO\Documents\waesy\.agents\teamwork\explorer_survey_r8_3\handoff.md detailing findings, gaps, exact files and proposed remediation recipes.
