# SPEC-20261116-VERTICAL-ISOLATION-EDITABLE-LANDINGS — Isolamento Pleno de Sistemas Verticais, Landings 100% Editáveis com Mídia & Conexão Auth/Planos por Nicho

- **Status:** APROVADA PARA EXECUÇÃO
- **Data:** `2026-11-16`
- **Escopo:** Subsistemas verticais/nichados (`turis`, `wowbook`, `tableway`, `passhub`, `lexcloud`, `talentlink`, `signflow`, `omnipage`, `pro`, `talk`, `studio`, `autocenter`, `imobiliaria`, `varejo`, `marketplace`, `classificados`, `noticias`, `go`, `places`, `copilot`, `explorer`, `waesy`), isolamento de módulos e planos no Workspace + Onboarding, Landing Pages modulares 100% editáveis com upload de mídia no Admin Master e conexão completa ao fluxo Login/Cadastro Split.

## 1. Diagnóstico Verificado e Lacunas Encontradas

1. **Dessincronia do Catálogo Vertical (`vertical-subsystems.ts` vs DB vs `BRAND_VERTICALS_REGISTRY` vs `VERTICAL_PLAN_CATALOG`):**
   - A migration `20270521000000` semeou `passhub`, `lexcloud`, `talentlink`, `signflow`, mas o catálogo TypeScript `CANONICAL_VERTICAL_SUBSYSTEMS` omitia essas marcas além de sistemas nichados como `omnipage`, `autocenter`, `imobiliaria` e `varejo`.
2. **Bug Crítico de Isolamento & Acesso Modular no Workspace (`multi-brand-engine.ts` + `workspace-shell.tsx` + `workspace-navigation.ts`):**
   - `SUBSCRIPTION_TIERS_REGISTRY` não tratava `"free"` nem o alias `"professional"` (`VERTICAL_PLAN_CATALOG` salva `baseTier: "professional"`), provocando fallback indevido para `"starter"`.
   - `workspace-shell.tsx` invocava `canAccessModule(store, group.id)` diretamente com `group.id` (`"overview"`, `"gastro-catalog"`, `"tourism-crm"`, `"automotive-workshop"`, `"legal"`), causando ocultamento ou inconsistência de grupos estruturais fora da lista literal `includedModules`.
   - Lojas criadas sob uma vertical (`turis`, `tableway`, `wowbook`, `lexcloud`, `signflow`, `omnipage`, `talk`) nem sempre persistiam `brand_origin` / `waesy_marketplace_enabled` de isolamento e `resolveWorkspaceNavigation` não priorizava integralmente o foco estrito da marca vertical quando `brand_origin` estava definido.
3. **Ausência de Landings Verticais Isoladas e CMS Editável com Seções + Upload de Mídia:**
   - Domínios verticais (`turis.`, `tableway.`, `wowbook.`, `pro.`, etc.) reescreviam a raiz `/` para `/painel` (tela fria de autenticação) ou `waesy.com.br/` exibia texto estático no Hero/Planos de `WaesySalesLanding`, violando `AGENTS.md` B.20 (bilateralidade 100% CMS). Não existiam rotas públicas `/sistemas` / `/sistemas/$slug` nem editor Master de seções/planos/módulos/upload de mídia por landing.

## 2. Requisitos em Sintaxe EARS

1. **UBIQUITOUS — Isolamento Real de Sistemas Verticais & Correção de Entitlements:**
   - O motor unificado em `src/lib/multi-brand-engine.ts`, `src/lib/vertical-subsystems.ts` e `src/lib/workspace-navigation.ts` SHALL isolar estritamente os módulos exibidos no Workspace e nas Landing Pages para cada vertical/nicho (`turis`, `tableway`, `wowbook`, `passhub`, `lexcloud`, `talentlink`, `signflow`, `omnipage`, `autocenter`, `imobiliaria`, `varejo`, `talk`, `studio`, `pro`, além dos apps `marketplace`, `classificados`, `noticias`, `go`, `places`, `copilot`, `explorer`), corrigindo o mapeamento `professional -> pro`, planos `VERTICAL_PLAN_CATALOG`, grupos essenciais (`overview`, `settings`, `support-desk`) e foco por `brand_origin`.
2. **STATE-DRIVEN — Landing Pages Nichadas Isoladas (`/sistemas/$slug` & Subdomínios `*.waesy.com.br`):**
   - WHEN um visitante acessar `/sistemas/$slug` ou a raiz `/` de um subdomínio vertical dedicado (ex: `turis.waesy.com.br`, `wowbook.waesy.com.br`, `tableway.waesy.com.br`, `lexcloud.waesy.com.br`, `passhub.waesy.com.br`, `talentlink.waesy.com.br`, `signflow.waesy.com.br`, `omnipage.waesy.com.br`, `pro.waesy.com.br`, `talk.waesy.com.br`, `studio.waesy.com.br`), o sistema SHALL suprimir 100% do `AppShell` (`TopBar`, `ContextSidebar`, `MobileNav`, `WaesyCopilotDrawer`), renderizar `<PublicLandingHeader />` contextualizado e exibir a `<VerticalLandingView />` contendo EXCLUSIVAMENTE os módulos daquela vertical, seções editáveis com mídia/vídeo e os pacotes/planos específicos do nicho.
   - WHEN acessar `/sistemas` (`_store.sistemas.index.tsx`), o sistema SHALL listar todos os sistemas individuais Waesy agrupados por foco operacional (Verticais SaaS Isolados, Suites Corporativas e Apps Públicos) com busca e link direto para cada landing.
   - WHEN acessar `/` no domínio principal `waesy.com.br` com `root_experience_mode = "landing_vendas"`, `<WaesySalesLanding />` SHALL consumir os dados e seções editáveis da landing `"waesy"` no CMS (Hero, Mídia/Vídeo, Seções Modulares, Planos, FAQ) mantendo o Hub Waesy e a aba `Waesy Marketplace` com links para `/sistemas/$slug` e `/explorer`.
3. **EVENT-DRIVEN — CMS 100% Editável no Admin Master (`/admin-master/landings` & `/admin-master/subsistemas`) com Seções e Upload de Mídia:**
   - WHEN o Admin Master acessar `/admin-master/landings` (ou clicar "Editar Landing & Mídia" em `/admin-master/subsistemas`), o painel SHALL permitir selecionar qualquer landing (`waesy` ou qualquer subsistema vertical), editar todos os textos do Hero, CTAs, Logo, Imagem Split do Login, Mídia Desktop/Mobile e Vídeo via `<MediaUploader />` / `<BidirectionalMediaUploader />` (upload real para Supabase Storage via `uploadMediaUniversal`), gerenciar CRUD/ordenação/ativação de seções modulares (`platform_landing_sections`), editar módulos isolados do nicho e editar pacotes/planos específicos da vertical, protegendo toda mutação com `requirePlatformAdmin()` e políticas RLS `is_platform_admin()`.
4. **EVENT-DRIVEN — Ligação Ponta a Ponta: Landing -> Auth Split (Login/Cadastro) -> Onboarding -> Workspace Isolado:**
   - WHEN um visitante clicar nos CTAs de qualquer Landing Vertical ("Começar Agora", "Assinar Plano X", "Entrar"), o sistema SHALL navegar para `/painel?vertical=<slug>&sku=<sku>&niche=<niche>&billing=<ciclo>&aba=cadastro` (ou `aba=login`) mantendo o layout Split Desktop (Formulário à Esquerda / Imagem da Vertical à Direita) e Mobile Nativo passo a passo anti-jank, pré-configurar nicho + SKU + `brand_origin` + `waesy_marketplace_enabled` default ao chegar em `/criar-negocio` e persistir o isolamento completo na criação da empresa (`onboarding.functions.ts` / `company-mvp.functions.ts`).

## 3. Contrato de Arquivos & Modularização

- **Migration SQL Aditiva:**
  - `supabase/migrations/20270522000000_vertical_landing_cms_and_niche_plans.sql` (sincroniza `platform_vertical_subsystems`, cria `platform_landing_pages` e `platform_landing_sections` com `FORCE ROW LEVEL SECURITY` e garante políticas do bucket `cms-media`).
- **Camada Pura (`src/lib/`):**
  - `src/lib/vertical-subsystems.ts` (expande subsistemas com metadados de vertical/nicho/SKU/landingPath; <= 450L dados puros)
  - `src/lib/vertical-landing-presets.ts` (tipos DTO e presets ricos específicos por sistema/nicho isolado; <= 280L por bloco ou helpers compactos)
  - `src/lib/multi-brand-engine.ts` (fix `professional -> pro`, `free`, `canAccessWorkspaceGroup`, SKUs)
  - `src/lib/workspace-navigation.ts` (isolamento estrito por `brand_origin` em `turis`, `tableway`, `wowbook`, `lexcloud`, `passhub`, `talentlink`, `signflow`, `omnipage`, `talk`)
  - `src/lib/navigation-registry.ts` (inclui `/sistemas` e `/sistemas/*` em `isEditorialMarketingRoute`)
- **Camada BFF (`src/services/`):**
  - `src/services/vertical-landings.functions.ts` (queries públicas por slug/host + CRUD Admin Master autenticado com Zod + audit log)
  - `src/services/onboarding.functions.ts` & `src/services/company-mvp.functions.ts` (suporte a `brandOrigin` e `waesyMarketplaceEnabled`)
- **Camada UI Modular (`src/components/`, limite <= 250L por componente):**
  - `src/components/landing/vertical-landing-hero.tsx`
  - `src/components/landing/vertical-landing-sections.tsx`
  - `src/components/landing/vertical-landing-plans.tsx`
  - `src/components/landing/vertical-landing-view.tsx`
  - `src/components/admin/landing-cms/admin-landing-hero-form.tsx`
  - `src/components/admin/landing-cms/admin-landing-sections-editor.tsx`
  - `src/components/admin/landing-cms/admin-landing-modules-plans-editor.tsx`
  - `src/components/landing/waesy-sales-landing.tsx` & `waesy-sales-tabs.tsx` (conectados às landing pages e CMS)
  - `src/components/workspace/workspace-shell.tsx` (usa `canAccessWorkspaceGroup`)
  - `src/components/onboarding/fast-company-onboarding.tsx` (pré-seleção `vertical`/`segment`/`sku`)
  - `src/components/shell/public-landing-header.tsx` (link para `/sistemas`)
- **Rotas (`src/routes/`, limite <= 300L em novas rotas):**
  - `src/routes/_store.sistemas.index.tsx`
  - `src/routes/_store.sistemas.$slug.tsx`
  - `src/routes/admin-master.landings.tsx`
  - Edits cirúrgicos: `src/routes/_store.index.tsx`, `src/routes/_store.tsx`, `src/routes/painel.tsx`, `src/routes/_store.entrar.tsx`, `src/routes/_store.cadastro.tsx`, `src/routes/_store.criar-negocio.tsx`, `src/routes/admin-master.tsx`, `src/routes/admin-master.subsistemas.tsx`, `src/server.ts`.

## 4. Critérios de Aceite

1. Design Lint `npm.cmd run lint:design` com `P0: 0`, `P1: 0`, `P2: 0`, `P3: 0`, `DL-16/17` aprovado.
2. `npm.cmd run typecheck` Exit Code 0 e `npm.cmd run build` + `check:route-budget` (`dist/_worker.js <= 25.00 MB`) Exit Code 0.
3. `check:schema`, `check:bff`, `check:migration-inventory`, `check:tokens`, `check:types-ssot`, `check:cycles`, `check:naming`, `audit:buttons`, `audit:secrets` 100% aprovados.
4. Suíte Vitest cobrindo isolamento de navegação Workspace por vertical/plano (`professional`/`starter`), roteamento por subdomínio, renderização de landing isolada por nicho, contratos de upload/seções editáveis CMS, Auth Split verticalizado e inventário de rotas (`tests/e2e/routes/route-inventory.test.ts`).
