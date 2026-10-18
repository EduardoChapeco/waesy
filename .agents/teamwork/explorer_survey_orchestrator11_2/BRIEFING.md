# BRIEFING — 2026-10-18T09:50:00Z

## Mission
Investigate Requirement R2: Hybrid BYOK Routing vs Platform Background with Invisible Quarantine and 429 Failover to Master Key Pools.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigator, analyzer, synthesizer
- Working directory: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\explorer_survey_orchestrator11_2
- Original parent: 2e600c46-95e2-4963-8431-c31ea9d5365f
- Milestone: Survey & Discovery for Requirement R2

## 🔒 Key Constraints
- Read-only investigation — do NOT implement or modify product source code.
- Follow AGENTS.md contract and prohibitions.
- Write findings to handoff.md in working directory.
- Communicate with parent via send_message.

## Current Parent
- Conversation ID: 2e600c46-95e2-4963-8431-c31ea9d5365f
- Updated: 2026-10-18T09:29:31Z

## Investigation State
- **Explored paths**:
  - `src/services/api-orchestrator.functions.ts` (key pools, rotation, cooldown, executeUnifiedAiCall)
  - `src/services/secret-vault.functions.ts` (AES-256-GCM vault, getActiveSecretForProvider)
  - `src/services/ai-core-gateway.functions.ts` (port 2.0, circuits, telemetry, candidate execution)
  - `src/services/ai-quotas-and-byok.functions.ts` (quota limits, plan tiers, byok fallback)
  - `src/services/mining/*` (editorial-squad, datajud-harvester, automated-harvest)
  - `supabase/migrations/` (20260813213000, 20260826040000, 20261018080000, 20261206000000)
  - `src/services/ai-task-aptitude-and-byok-isolation.test.ts`
  - `src/services/copilot-keypool-quarantine.test.ts`
  - `src/services/ai-core-gateway.test.ts`
- **Key findings**:
  - BYOK keys are stored in `secret_vault`, `tenant_ai_providers`, and `integration_credentials`.
  - Platform background tasks use `isSystemTask: true`, `feature: "mining_*"`, or lack `storeId`/`ownerId`.
  - `getAllActiveKeysForProvider` had potential BYOK leakage if called with `ownerId` and lacked `storeId` & cooldown check.
  - Transparent 429 failover to Master Key Pool is implemented in `executeUnifiedAiCall` loop, but in-memory quarantine scoping needed alignment with tenant `store_id`.
  - `public.api_key_pools` schema contains scoped quarantine (`quarantine_scope`, `quarantine_until`, `quarantine_reason`) and RPC `claim_healthy_api_keys_for_provider`.
- **Unexplored areas**:
  - None within Requirement R2 scope.

## Key Decisions Made
- Confirmed full mapping of the 6 investigation items.
- Formulated architecture for zero-leakage BYOK isolation, tenant-scoped 429 quarantine, and instant failover to Admin Master Pool.

## Artifact Index
- DISPATCH.md — Stored dispatch instruction
- BRIEFING.md — Working memory and identity
- progress.md — Liveness heartbeat
- handoff.md — Final structured report
