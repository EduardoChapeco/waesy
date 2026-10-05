# Explorer 1 Dispatch: Persistence, RLS, Storage Buckets & Telemetry Survey

## Objective
Conduct a comprehensive read-only survey of the Waesy codebase regarding:
1. Database tables, schemas, migrations, constraints, foreign keys, indexes, and RLS policies (Deny-by-Default, multi-tenant isolation, civil ownership) for project `jfuebqmltksyznovhlwa` and local schema files.
2. The 5 storage buckets (`avatars`, `covers`, `classified-media`, `product-media`, `brand-assets`) and all media uploader components, verifying triple governance (bucket upload, external URL, clipboard paste listener).
3. Complete inventory of hardcoded mock images, Unsplash URLs, and synthetic data across the codebase.
4. Edge telemetry in Cloudflare Pages, `device_fingerprint`, anti-flooding rate limiting, and persistence in `lead_form_submissions` and `pwa_telemetry`.

## Constraints
- READ-ONLY exploration. Do not modify source code.
- PROIBIÇÃO ABSOLUTA de executar `npm run typecheck` ou `npm run build` sob qualquer circunstância.
- Produce handoff report at `.agents/teamwork/teamwork_preview_explorer_survey_1/handoff.md`.
