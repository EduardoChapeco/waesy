# SPEC-20261115-ECOSYSTEM-SECURITY-MODULAR-VERTICALS

- **Data:** 2026-11-15
- **Status:** Aprovado para Execucao End-to-End
- **Escopo:** Auditoria completa, blindagem Zero-Trust (RLS + Triggers SQL + BFF), controle exclusivo Admin Master sobre planos/modulos/papeis/aprovacoes (usuarios, membros e workspaces), arquitetura desmembrada multi-dominio dos subsistemas verticais (`pro`, `marketplace`, `classificados`, `noticias`, `go`, `talk`, `copilot`, etc.), Guia DNS GoDaddy/Cloudflare Pages, Landing Page Comercial em `waesy.com.br` com aba "Waesy Marketplace" e Hub Waesy unificado entre apps.

## 1. Requisitos em Sintaxe EARS

### Wave S1 — Blindagem SQL, Triggers Anti-Escalada e Tabelas de Governanca Global
- **REQ-S1-01 (Protecao de Colunas Sensiveis em `profiles`):** When qualquer cliente autenticado sem `service_role` tentar atualizar `role`, `is_verified`, `verified_badge_url`, `approval_status`, `user_plan_tier`, `enabled_modules`, `disabled_modules`, `commission_rate` em `public.profiles` via PostgREST, the PostgreSQL trigger `protect_profile_sensitive_columns()` shall abortar a transacao com `RAISE EXCEPTION`.
- **REQ-S1-02 (Protecao de Colunas Sensiveis e JSONB em `stores`):** When qualquer cliente sem `service_role` tentar atualizar `is_platform_root`, `is_active`, `approval_status`, `plan_tier`, `subscription_tier`, `vertical_sku`, `subscription_status`, `trial_ends_at`, `billing_cycle`, `enabled_niches`, `enabled_modules`, `quota_overrides`, `primary_niche_id`, `brand_origin` ou chaves reservadas de governanca em `stores.settings` (`plan_tier`, `subscription_tier`, `vertical_sku`, `active_modules`, `enabled_modules`, `subscription_status`, `blocked_due_to_debt`, `approval_status`), the PostgreSQL trigger `protect_store_sensitive_columns()` shall bloquear a mutacao.
- **REQ-S1-03 (Governanca Individual de Usuario/Membro & Catalogo de Subsistemas Verticais):** The system shall prover colunas aditivas de aprovacao/plano/modulos em `public.profiles` e `public.stores`, bandeiras globais em `public.platform_brand_settings` (`root_experience_mode`, `require_company_approval`, `require_user_approval`) e tabela SSOT `public.platform_vertical_subsystems` com RLS restrito para mutacao exclusiva de `public.is_platform_admin()`.

### Wave S2 — Erradicacao de Escalacao `identity.role === "admin"` & Travas Zero-Trust no BFF
- **REQ-S2-01 (Helper Canonico Exclusivo Master):** `isPlatformAdminIdentity()` em `src/lib/identity-core.ts` shall reconhecer exclusivamente `platform_admin`, `master`, `admin_master`, `superadmin` ou `isPlatformAdmin === true`, rejeitando terminantemente role de loja `"admin"` ou `"owner"`.
- **REQ-S2-02 (Bloqueio Total de Auto-Upgrade e Bypass Master nos BFFs):** Toda server function administrativa global (`modules.functions.ts`, `ai-quotas-and-byok.functions.ts:upgradeStoreToWaesyMax`, `ads.functions.ts:upgradeStoreToWaesyMax`, `portal-completo.functions.ts`, `courier-verification.functions.ts`, `marketplace-compliance.functions.ts`, `affiliates.functions.ts:approveStoreInvoiceDiscount/listPendingInvoiceTokenDiscounts`, `immutable-ledger.functions.ts`, `classifieds.functions.ts`, `news.functions.ts`, `system-onboarding.functions.ts`) shall exigir `requirePlatformAdmin()` ou `isPlatformAdminIdentity(identity)`.
- **REQ-S2-03 (Higienizacao de Settings e Fail-Closed):** `_savePublicProfile` e `_saveStoreSettings` (`store.functions.ts`) shall remover qualquer chave reservada de plano/modulo/divida/aprovacao enviada pelo lojista; `updateStoreProfileFn` shall exigir vinculo real na loja alvo (`identity.store_id === data.storeId` ou `workspace_members` daquela loja); `canAccessModule` (`multi-brand-engine.ts`) shall operar em fail-closed (`starter` como fallback neutro, bloqueando lojas suspensas/nao aprovadas) em vez de `"enterprise"` aberto.
- **REQ-S2-04 (Enforcement de Modulos Globais e Aprovacao no Workspace):** `getStoreActiveModules` (`modules.functions.ts`), `workspace.tsx` e `WorkspaceShell` shall ocultar/bloquear modulos desativados globalmente em `platform_modules_config`, desabilitados para a empresa/usuario ou quando a empresa/usuario possuir `approval_status !== 'approved'` / `is_active === false`.

### Wave V1 — Desmembramento Multi-Dominio, Painel Subsistemas Admin Master & Guia GoDaddy
- **REQ-V1-01 (Registro SSOT de Subsistemas Verticais & Roteamento Host HTTP):** `src/lib/vertical-subsystems.ts` e `src/server.ts` shall resolver o header `Host` de cada subdominio (`waesy.com.br`, `pro.waesy.com.br`, `marketplace.waesy.com.br`, `classificados.waesy.com.br`, `noticias.waesy.com.br`/`news.waesy.com.br`, `go.waesy.com.br`, `talk.waesy.com.br`, `copilot.waesy.com.br`, `studio.waesy.com.br`, `places.waesy.com.br`, `admin.waesy.com.br` e verticais standalone `turis`, `tableway`, `wowbook`, `passhub`, `lexcloud`, `talentlink`, `signflow`), reescrevendo `/` para a rota canonica do app completo correspondente mantendo sessao `.waesy.com.br` unificada em cookies (`identity.functions.ts` + `context-auth.ts`).
- **REQ-V1-02 (Painel Admin Master de Subsistemas Verticais + Guia DNS GoDaddy):** `/admin-master/subsistemas` (`src/routes/admin-master.subsistemas.tsx`) + `/admin-master/usuarios` + `/admin-master/lojas` shall dar ao Admin Master controle total sobre subsistemas, subdominios, modo da raiz `waesy.com.br`, aprovacao de empresas/usuarios, planos manuais de usuarios/lojas, visibilidade de modulos e instrucoes passo-a-passo copiaveis de DNS na GoDaddy + Cloudflare Pages Custom Domains.

### Wave V2 — Landing Comercial `waesy.com.br` (Aba Waesy Marketplace) & Hub Waesy Unificado
- **REQ-V2-01 (`waesy.com.br` Landing Comercial Multi-Abas):** Quando acessado na raiz `waesy.com.br/` com modo `landing_vendas` ativo, `_store.index.tsx` shall renderizar `WaesySalesLanding` com foco comercial, demonstracao de todos os modulos/funcionamento, `Waesy Pro All-in-One`, vitrine dos `Subsistemas Verticais`, planos e aba dedicada `"Waesy Marketplace"` com dados reais e link direto para o app `/marketplace` (`marketplace.waesy.com.br`).
- **REQ-V2-02 (Hub Waesy Cross-App Identitario):** `WaesyHubLauncher` (`src/components/shell/waesy-hub-launcher.tsx`) integrara `TopBar`, `GlobalMenuHub` e `WorkspaceShell` para oferecer atalho rapido entre todos os apps completos mantendo a mesma identidade visual Waesy.

## 2. Escopo de Arquivos Autorizados

### Criacao
- `docs/specs/SPEC-20261115-ECOSYSTEM-SECURITY-MODULAR-VERTICALS.md`
- `docs/audits/LEDGER-20261115-SECURITY-VERTICALS.md`
- `supabase/migrations/20270521000000_governance_rls_user_plans_and_subsystems.sql`
- `src/lib/vertical-subsystems.ts`
- `src/services/vertical-subsystems.functions.ts`
- `src/components/admin/godaddy-dns-guide-card.tsx`
- `src/components/admin/user-governance-modal.tsx`
- `src/routes/admin-master.subsistemas.tsx`
- `src/components/shell/waesy-hub-launcher.tsx`
- `src/components/landing/waesy-sales-landing.tsx`
- `src/components/landing/waesy-sales-tabs.tsx`
- `src/services/security-vertical-governance.test.ts`

### Edicao Cirurgica
- `src/lib/identity-core.ts`
- `src/lib/context-auth.ts`
- `src/lib/multi-brand-engine.ts`
- `src/server.ts`
- `src/services/identity.functions.ts`
- `src/services/modules.functions.ts`
- `src/services/ai-quotas-and-byok.functions.ts`
- `src/services/ads.functions.ts`
- `src/services/portal-completo.functions.ts`
- `src/services/courier-verification.functions.ts`
- `src/services/marketplace-compliance.functions.ts`
- `src/services/affiliates.functions.ts`
- `src/services/immutable-ledger.functions.ts`
- `src/services/news.functions.ts`
- `src/services/classifieds.functions.ts`
- `src/services/store.functions.ts`
- `src/services/master.functions.ts`
- `src/services/system-onboarding.functions.ts`
- `src/services/__tests__/wave-c3-bff-integrity.test.ts`
- `src/components/shell/top-bar.tsx`
- `src/components/shell/global-menu-hub.tsx`
- `src/components/shell/utility-cluster.tsx`
- `src/components/workspace/workspace-shell.tsx`
- `src/routes/workspace.tsx`
- `src/routes/_store.index.tsx`
- `src/routes/admin-master.tsx`
- `src/routes/admin-master.lojas.tsx`
- `src/routes/admin-master.usuarios.tsx`
- `tests/e2e/routes/route-inventory.test.ts`
- `docs/design/DECISIONS.md`
