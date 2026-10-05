# Project Plan: Deep E2E Forensic Audit & Refactoring

## 1. Survey Phase (Step 0)
Dispatch 3 specialized Explorers (`teamwork_preview_explorer`) to independently examine the repository against the requirements in `ORIGINAL_REQUEST.md`:
- **Explorer 1 (Persistence, Storage & Telemetry)**:
  - Scope: Database tables, schemas, constraints, RLS policies (multi-tenant/civil), Supabase storage buckets (`avatars`, `covers`, `classified-media`, `product-media`, `brand-assets`), triple media governance (Supabase upload, URL, Ctrl+V clipboard paste). Search for hardcoded mock images/Unsplash/synthetic data across the codebase. Cloudflare headers, device fingerprinting, anti-spam telemetry.
- **Explorer 2 (BFF, Server Functions & Business Logic)**:
  - Scope: `src/services/*.functions.ts`, authentication/authorization (`getServerIdentity`, `requireAdmin`), Zod validation schemas, closed allowlists for public products/classifieds (protecting NCM, CEST, cost, margin), AI onboarding pipeline (Firecrawl, Steel.dev, Gemini 2.5 Flash, squads) in `stores`, `brand_kits`, `brand_dna_profiles`, and BOM deduction in service orders and POS transactions.
- **Explorer 3 (Routes, 15 Niches & Design Systems)**:
  - Scope: `src/routes/` across all 15 niches and 4 macro-archetypes (A: Transactional/Retail/Food; B: High Spec/Vehicles/Real Estate/Tourism; C: Services/HR; D: Social/Creators/Events). Mobile HIG touch targets (>=44px), bottom action bars, sheet/drawer vs Desktop 12-col Bento Grid with golden ratio. Regra B.8 compliance (headings <= 6 words, no conversational cards, no emojis).

## 2. Synthesis & Architecture (PROJECT.md)
Consolidate findings into `PROJECT.md` at project root with:
- Architecture & module boundaries
- Complete Feature Inventory mapped to Milestones
- Code layout and write ownership boundaries
- Interface contracts

## 3. Milestone Execution (Milestones 1 to 5)
For each milestone:
- Iteration loop: Explorers (3) -> Worker (1) -> Reviewers (2) -> Challengers (2) -> Forensic Auditor (1)
- Binary veto on Auditor integrity report
- Strict execution of `node scripts/design-lint.mjs`, unit tests with Vitest on touched files, semantic inspection, git diff.
- ABSOLUTE PROHIBITION of `npm run typecheck` or `npm run build`.
- Document decisions in `docs/design/DECISIONS.md`.

## 4. Final Verification & Closure
Run design-lint, check git diffs, ensure zero regressions, compile final audit report, and notify Sentinel.
