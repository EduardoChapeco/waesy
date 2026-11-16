# Ledger de Evidencias — Isolamento Vertical, Landings Editaveis com Midia & Auth/Workspace Isolado (2026-11-16)

## 1. Snapshot e Escopo

- **Data/hora (ISO, fuso):** `2026-11-16T07:48:00-03:00`
- **Repositorio:** `EduardoChapeco/waesy`
- **Branch Inicial:** `release/prod-20261113-fullpage-chat-copilot` -> merge e entrega em `main` / `origin`
- **Spec ativa:** `docs/specs/SPEC-20261116-VERTICAL-ISOLATION-EDITABLE-LANDINGS.md` (`DEC-508`)

## 2. Remediações Concluídas

- Isolamento real de Workspace e planos (`multi-brand-engine.ts` com normalizacao `professional -> pro`, `SKU_CAPABILITY_MODULES`, `canAccessWorkspaceGroup` + `workspace-navigation.ts` para `signflow`, `omnipage`, `talk`, `turis`, `tableway`, `wowbook`, `lexcloud`, `passhub`, `talentlink` + `workspace-shell.tsx`).
- Sincronizacao completa de subsistemas (`vertical-subsystems.ts` + SQL `20270522000000_vertical_landing_cms_and_niche_plans.sql`), tabelas `platform_landing_pages` e `platform_landing_sections` com `FORCE ROW LEVEL SECURITY` e politicas `cms-media`.
- Landings nichadas isoladas e 100% editaveis (`/sistemas`, `/sistemas/$slug`, subdominios em `_store.index.tsx` / `server.ts`, editor `/admin-master/landings` com upload de midia via `MediaUploader`/`BidirectionalMediaUploader`, CRUD de seções, módulos e pacotes/planos).
- Conexao ponta a ponta Landing -> `/painel` Auth Split -> `/criar-negocio` / `fast-company-onboarding.tsx` -> `onboarding.functions.ts` / `company-mvp.functions.ts` persistindo `brand_origin`, `vertical_sku` e `waesy_marketplace_enabled`.

## 3. Verificacoes Executadas (Pre-Deploy)

- `lint:design` + `contrast-audit`: `2346` arquivos | `P0: 0`, `P1: 0`, `P2: 0`, `P3: 0`, `DL-16/17` aprovados (`0` debitos).
- Static integrity (`check:schema`, `check:bff`, `check:migration-inventory`, `check:tokens`, `check:types-ssot`, `check:cycles`, `check:naming`, `audit:buttons`, `audit:secrets`): todos aprovados (`628` migrations, `684` refs, `0` leaks).
- Vitest (`task-1692`, 14 arquivos / 100 testes): `14 passed (100 tests, 0 failed, 0 skipped)`.
- `typecheck` (`tsc --noEmit`): nao concluido neste turno por travamento do processo no ambiente Windows (ignorado para commit/deploy conforme autorizacao explicita do usuario).
- Build + `check:route-budget` + deploy Supabase + deploy Cloudflare Pages registrados na sequencia de entrega.
