# BRIEFING — 2026-11-04T04:02:00Z

## Mission
Investigate backend and BFF infrastructure to plan end-to-end real persistence for static/mock features (R3), mapping tables, RLS, Server Functions, and Vitest testing strategy.

## 🔒 My Identity
- Archetype: explorer
- Roles: Survey Explorer 3 — BFF Contracts, Server Functions, Supabase & Database Architecture
- Working directory: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\explorer_survey_3
- Original parent: 71cb6393-bf04-4e51-946b-1dd9ac61e734
- Milestone: Survey & Discovery

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Write ONLY to working directory
- Follow AGENTS.md Invariants, especially B.25 (full parameter destructuring and defensive handling), multi-tenant isolation, RLS Deny-by-default

## Current Parent
- Conversation ID: 71cb6393-bf04-4e51-946b-1dd9ac61e734
- Updated: 2026-11-04T04:02:00Z

## Investigation State
- **Explored paths**: `src/services/` (160 files), `supabase/migrations/` (580 files), `src/routes/workspace.*`, `scripts/` audit/contract checks.
- **Key findings**: 794 tables declared, 641 used in BFF, 0 missing tables. Route view modes (R2) are currently held in ephemeral React `useState()`. Proposed `workspace_user_view_preferences` table with RLS + BFF contracts. Operational gaps identified in `booking.functions.ts` (audit timestamps), `kanban-config.functions.ts` (defaults for agenda/orders/CRM), and UI routes currently bypassing real tables for picking and KDS.
- **Unexplored areas**: None within Survey Explorer 3 scope; ready for implementation planning.

## Key Decisions Made
- Architecture defined: `workspace_user_view_preferences` table with compound unique constraint `(store_id, profile_id, module)` and Zero-Trust RLS.
- Defined BFF functions in `src/services/workspace-view-preferences.functions.ts` compliant with Invariant B.25.
- Defined extension of `KANBAN_DEFAULTS` for appointments, orders, and CRM leads.
- Defined audit logging completion for `updateAppointmentStatus`.
- Authored 5-component `handoff.md`.

## Artifact Index
- `DISPATCH.md` — incoming dispatch records
- `BRIEFING.md` — persistent working memory (<100 lines)
- `progress.md` — liveness heartbeat
- `handoff.md` — 5-component handoff report for parent orchestrator
