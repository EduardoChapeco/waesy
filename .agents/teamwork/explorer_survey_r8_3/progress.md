# Progress — Explorer Survey 3

Last visited: 2026-10-13T17:45:00Z
Status: Report Generation

## Tasks & Phases
- [x] Phase 1: Supabase Schema, Migrations, RLS & RPC Security
  - [x] Audited 500 migrations, 604 active tables, and RLS status
  - [x] Verified multi-tenant isolation (324 tables with `store_id`, 1 table with `tenant_id` only)
  - [x] Audited 249 SECURITY DEFINER functions; identified 126 missing `SET search_path = public` (50 sensitive)
- [x] Phase 2: Public Routes & ActionAuthGuardModal Wiring
  - [x] Identified 200 public store/catalog routes
  - [x] Audited transactional mutation triggers (buy, book, quote, contact)
  - [x] Verified `ActionAuthGuardModal` integration (5 wired, 19 missing, 3 missing explicit returnUrl)
- [x] Phase 3: Storage Buckets & Media Governance
  - [x] Cataloged 8 SQL buckets vs 10 code-referenced buckets
  - [x] Audited Triple Governance across 9 uploaders (3 compliant, 6 missing features)
  - [x] Audited 672 `<img>` tags for broken image prevention (only 21 have `onError`, 651 missing)
- [x] Phase 4: BFF Server Functions & Invariant B.25
  - [x] Audited 243 `src/services/*.functions.ts` files and 1,815 `createServerFn` endpoints
  - [x] Checked 1,772 Zod-validated endpoints
  - [x] Identified 156 functions with unreferenced or dropped parameters violating Invariant B.25
- [x] Phase 5: 4-State Matrix UI Coverage
  - [x] Audited 377 route surfaces across Store, Workspace, Admin, and Other
  - [x] Quantified coverage: 289 (77%) complete, 88 (23%) missing states (85 missing Empty, 22 missing Loading)
- [x] Phase 6: Synthesis & Handoff Report (`handoff.md`)
