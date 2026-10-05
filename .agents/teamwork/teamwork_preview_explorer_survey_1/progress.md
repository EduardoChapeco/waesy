# Progress — Explorer 1 (Survey: Persistence, RLS, Storage Buckets, Mock Eradication & Edge Telemetry)

Last visited: 2026-10-03T21:08:00Z

## Status
- [x] Phase 1: Database tables, migrations, RLS policies, schemas, foreign keys, indexes investigated.
  - 536 tables in public schema; 100% have RLS enabled (0 without RLS).
  - 28 tables have RLS enabled but 0 policies (deny-by-default).
  - 6 views have SECURITY DEFINER property without security_invoker.
  - 143 SECURITY DEFINER functions callable by anon role via RPC.
  - 19 functions with mutable search_path.
  - 422 unindexed foreign keys; 416 RLS initplan issues; 17 duplicate indexes.
- [x] Phase 2: 5 Storage Buckets & Media Uploaders audited.
  - 13 buckets in Supabase storage.
  - `covers` does NOT exist in storage.buckets; `classifieds` exists instead of `classified-media`.
  - CRITICAL SECURITY HOLE: 4 "Universal Media *" policies grant public (anonymous) SELECT, INSERT, UPDATE, DELETE over 9 buckets including private `legal-documents`!
  - Media Uploaders triple governance: `FileAttachmentUpload` supports all three, but `MediaUploader` and `ImageUpload` lack external URL input; `StoryHighlightUploader` lacks paste and URL.
- [x] Phase 3: Mock Eradication & Synthetic Data inventory completed.
  - `placehold.co` found in `src/components/admin/builder/MediaUploader.tsx`.
  - Unsplash active feature in `src/services/proposals.ts` and `src/components/tourism/studio/StudioUnsplashPicker.tsx`.
- [x] Phase 4: Edge Telemetry, Cloudflare Pages, Device Fingerprint & Persistence audited.
  - `cf-connecting-ip`, geo, threat_score, cf-ray captured in `src/lib/network-telemetry.server.ts`, but ASN is omitted.
  - `device_fingerprint` generated via Web Crypto SHA-256 canvas/webgl in `security-sentinel.ts`.
  - `lead_form_submissions` has full anti-flood (10min window, 8 spam, 20 reject) and persists full telemetry.
  - `pwa_telemetry` table schema lacks fingerprint/geo/asn, and `recordPwaInstallation` omits `ip_address`.
- [ ] Compiling comprehensive handoff report at `handoff.md`.
