# Plan — Orchestrator 6

## Objective
Deliver Telemetria 360º & Governança Master (R1 to R5) adhering strictly to AGENTS.md, DESIGN.md, and Project Pattern.

## Strategy
1. **Survey (Phase 0)**:
   - Spawn 3 Explorers in parallel:
     - Explorer 1: Inspect existing database schema, migrations, RLS patterns in `supabase/migrations/` and auth tables.
     - Explorer 2: Inspect existing BFF server functions in `src/services/` (`getServerIdentity`, `requireAdmin`, Zod schemas, SHA-256 patterns).
     - Explorer 3: Inspect Master Admin `src/routes/admin-master.usuarios.tsx` and civil routes `src/routes/_store.conta.*.tsx` for layout, tokens, tab patterns, and design lint.
2. **PROJECT.md & Decomposition (Phase 1)**:
   - Merge findings into `PROJECT.md` Feature Inventory & Architecture.
   - Decompose into Milestones M1 through M5.
3. **Execution & Gate Loop (Phases 2-5)**:
   - M1: Data Migration (Worker -> Reviewer x2 -> Challenger x2 -> Auditor -> Gate)
   - M2: BFF Server Functions (Worker -> Reviewer x2 -> Challenger x2 -> Auditor -> Gate)
   - M3: Master Admin 360º Dossiê UI (Worker -> Reviewer x2 -> Challenger x2 -> Auditor -> Gate)
   - M4: Consumer "Minha Atividade" UI (Worker -> Reviewer x2 -> Challenger x2 -> Auditor -> Gate)
   - M5: Test Suite, Design Lint Ratchet, Production Build & Cloudflare Pages Deploy.
