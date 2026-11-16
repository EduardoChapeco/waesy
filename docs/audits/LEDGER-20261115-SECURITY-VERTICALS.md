# Ledger de Evidencias — Auditoria Global de Seguranca, Governanca Master & Subsistemas Verticais (`2026-11-15`)

## 1. Snapshot e Escopo

- **Data/hora (ISO, fuso):** `2026-11-15T23:57:00-03:00`
- **Repositorio:** `EduardoChapeco/waesy`
- **Branch/HEAD:** `release/prod-20261113-fullpage-chat-copilot` / `67125cb3b582a38424fd389741bcabde7ce83555`
- **Worktree:** Mudancas previas da onda `COPILOT-MANUS-LEVEL-EVOLUTION` preservadas integralmente (10/10 suites Vitest aprovadas + `lint:design` 0 violacoes).
- **Spec ativa:** `docs/specs/SPEC-20261115-ECOSYSTEM-SECURITY-MODULAR-VERTICALS.md`

## 2. Preflight de Leitura

- Lidos integralmente antes de mutar codigo:
  - `AGENTS.md`, `skills/waesy-integrity-auditor/SKILL.md`, `.agents/skills/security-guard/SKILL.md`, `.agents/skills/niche-matrix/SKILL.md`
  - `supabase/migrations/20260829220000_security_hardening_rls_phase1.sql`, `20261002000002_s21_performatic_rls.sql`, `20270213000000_civil_data_hardening_cpf_immutability.sql`, `20270404000000_unified_niche_systems_vertical_plans_and_entitlements.sql`, `20260906000001_rbac_customer_default_and_store_owner_trigger.sql`
  - `src/lib/identity-core.ts`, `src/lib/identity.server.ts`, `src/lib/auth-guards.server.ts`, `src/lib/server-access.ts`, `src/lib/multi-brand-engine.ts`, `src/lib/tenant.server.ts`, `src/lib/context-auth.ts`, `src/server.ts`
  - `src/services/{modules,ai-quotas-and-byok,ads,portal-completo,courier-verification,marketplace-compliance,affiliates,immutable-ledger,classifieds,news,store,master,store-modules,multi-brand,system-onboarding,billing}.functions.ts`
  - `src/routes/{admin-master,admin-master.lojas,admin-master.usuarios,admin-master.modulos,admin-master.marca,admin-master.portal-completo,workspace,_store,_store.index,painel}.tsx`

## 3. Achados Baseline Reproduzidos (Antes das Mutacoes)

| ID | Severidade | Camada | Localizacao Exata | Causa-Raiz Confirmada |
|---|---|---|---|---|
| `SEC-01` | P0 | SQL / RLS | `20261002000002:224-233` + `20270213000000:14-75` | `profiles_update_canonical` permite `UPDATE` proprio no PostgREST e trigger de imutabilidade nao protege `role`, `is_verified` nem campos de plano/aprovacao (permite auto-promocao a `platform_admin` via browser REST). |
| `SEC-02` | P0 | SQL / RLS | `20260829220000:108-112` | `stores_update_owner` permite `get_store_role(id) IN ('owner','admin')` atualizar `public.stores` sem trigger `BEFORE UPDATE`, liberando mutacao direta de `plan_tier`, `vertical_sku`, `enabled_modules`, `subscription_status`, `is_active`, `is_platform_root` via cliente browser. |
| `SEC-03` | P0 | BFF Auth | `modules.functions.ts:87,119,159`, `courier-verification.functions.ts:339,378`, `marketplace-compliance.functions.ts:235`, `affiliates.functions.ts:859,885`, `immutable-ledger.functions.ts:223`, `portal-completo.functions.ts:89,117,144`, `news.functions.ts:497`, `classifieds.functions.ts:764,931,1765,2342,2384,3399` | Mecanismos de governanca global aceitam `identity.role === "admin"` (papel de funcionario de loja em `workspace_members`) e/ou `"owner"`, expondo operacoes Master e dados cross-tenant para lojistas comuns. |
| `SEC-04` | P0 | BFF Planos | `ai-quotas-and-byok.functions.ts:165-182` e `ads.functions.ts:1175-1200` | `upgradeStoreToWaesyMax` permite auto-upgrade gratuito pelo proprio `owner`/`admin` da loja sem passar pelo Admin Master. |
| `SEC-05` | P0 | BFF Mass Assignment | `store.functions.ts:304,353,590-621,1410-1413` e `multi-brand-engine.ts:638-646` | `_savePublicProfile` faz spread aberto de `settings`; `_saveStoreSettings` permite mutacao de `enabled_modules` quando `!hasExistingSegment`; `updateStoreProfileFn` confia em `identity.role === "owner"|"admin"` sem checar loja; `canAccessModule` faz fallback fail-open para `"enterprise"`. |
| `MOD-01` | P1 | Governanca Modulos | `modules.functions.ts:34-40` + `workspace.tsx` + `workspace-shell.tsx` | `getStoreActiveModules` trata `stores.enabled_modules` (`TEXT[]`) como objeto `{}` (`undefined !== false`), nao bloqueia empresas/usuarios nao aprovados (`approval_status` / `is_active`) e faltava controle manual de plano/modulos por usuario em `admin-master.usuarios.tsx`. |
| `DOM-01` | P1 | Dominios / Apps / Landing | `src/server.ts:76-106`, `multi-brand-engine.ts`, `_store.index.tsx` | Subdominios `pro`, `marketplace`, `classificados`, `noticias`, `go`, `talk`, `places`, `admin` nao tinham mapeamento dedicado; cookies de contexto (`context-auth.ts`, `identity.functions.ts`) não compartilhavam `.waesy.com.br`; `waesy.com.br/` servia vitrine local em vez da Landing Comercial + Aba Marketplace + Hub Waesy; Admin Master carecia de painel unificado de Subsistemas Verticais + Guia DNS GoDaddy/Cloudflare. |

## 4. Log de Execucao e Provas

- Ledger inicializado antes das mutacoes de seguranca e arquitetura vertical.
- `SEC-01` a `SEC-05`, `MOD-01` e `DOM-01` remediados em código, triggers SQL (`20270521000000_governance_rls_user_plans_and_subsystems.sql`) e UI Admin Master/Hub/Landing.
- Regressão adicional detectada e fechada durante testes: `assertStoreAccess` em `src/lib/identity-core.ts` agora valida `targetMembership` e papel ANTES de mutar `identity.store_id`; `canAccessModule` em `src/lib/multi-brand-engine.ts` preserva acesso explícito de `is_platform_root` mantendo fallback fail-closed `"starter"`; `waesy-hub-launcher.tsx` cobre estados Loading/Error/Empty (`DL-11/12/13` zero).
- Validação em curso/final pós-edição registrada em build/typecheck/lint/vitest (`security-vertical-governance.test.ts` 14/14, `admin-master-isolation.test.ts` 6/6, `admin-governance-plan-enforcement.test.ts` 5/5, `security-rbac-multitenant-isolation.test.ts` 12/12, `route-inventory.test.ts` 6/6, `multi-brand-engine.test.ts` 9/9).
- Migrações SQL `20270520000000` e `20270521000000` criadas localmente; aplicação no Supabase remoto (`jfuebqmltksyznovhlwa`) e deploy/DNS Cloudflare Pages + GoDaddy pendentes de confirmação/ação operacional do proprietário.
