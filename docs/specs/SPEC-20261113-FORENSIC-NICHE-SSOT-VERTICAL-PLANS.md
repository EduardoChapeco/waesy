# SPEC-20261113: Auditoria Forense Total, Biblioteca Semântica SSOT por Nicho & Sistemas Verticais Modulares

**Status:** Approved for Wave Execution (Waves 1–5)  
**Data:** 2026-11-13  
**Escopo Normativo:** `AGENTS.md` (B.1–B.51), `docs/design/DESIGN.md`, `docs/design/DESIGN-LINT.md`, `.agents/skills/niche-matrix/SKILL.md`, `.agents/skills/gap-hunter/SKILL.md`, `.agents/skills/recursive-audit/SKILL.md`, `.agents/skills/security-guard/SKILL.md`

---

## 1. Matriz Forense de Quebras, Gaps e Achados (Fase 1)

Varredura automatizada sobre **460 rotas** (`_store.*`: 165, `workspace.*`: 199, `admin-master.*`: 38, `api.*`: 31, outras: 27), **370 arquivos BFF**, **605 migrations SQL** e componentes de domínio:

| ID | Camada | Evidência Concreta / Local | Severidade | Causa Raiz & Impacto | Correção Planejada |
|---|---|---|---|---|---|
| **F-01** | Domain / SSOT | `vertical-manifest.ts` (7 verticais), `niche-manifest.ts` (10), `niche-semantics.ts` (17), `catalog-niche-context.ts` (`"vehicles"` != `"automotive"`), `niche-dictionary.ts` (`"clinica"` != `"healthcare"`), `business-segments.ts` (26) | **P0** | 5 taxonomia desconexas geram vazamento inter-vertical (B12) e ausência de sistemas próprios para Salões, Barbearias, Estética, Odonto, Psicologia, Vet/Pet, Contabilidade, Oficina, Educação | Unificar SSOT hierárquico: `CanonicalVerticalId` (7 macro) -> `UnifiedNicheId` (21 nichos especializados) -> `VerticalPlanSku` (10 SKUs vendáveis), preservando aliases legados |
| **F-02** | Domain / Logic | `src/lib/niches/niche-semantics.ts` (`resolveRegistryEntry`, `getNicheSemantics`) | **P0** | Colisões por substring: `"barbearia"` casa `.includes("bar")` -> **Gastronomia**; `"produtos"` -> `.includes("produt")` -> **Events**; `"ultrassom"` -> **Rental**; `"autocuidado"` -> **Vehicles**; `hasFashionKeyword(storeName)` sobrescreve `store.segment` explícito; `isFoodBusiness` ignora `market_perishables` | Substituir `.includes()` frouxo por normalização canônica exata + fronteiras de palavra (`\b`) com prioridade determinística e respeito absoluto ao nicho explícito |
| **F-03** | SQL / Constraint | `supabase/migrations/20260929160000` vs `20261013000001` vs `20270326000000` | **P0** | `stores.plan_tier` mantém `CHECK (plan_tier IN ('FREE_MVP', 'WAESY_MAX'))`, quebrando `updateStorePlanTier` (`'free'`, `'starter'`, `'professional'`, `'enterprise'`); `stores.subscription_tier` nasceu com `DEFAULT 'enterprise'` liberando tudo sem contrato | Migration `20270404000000`: corrigir constraint `plan_tier`, normalizar `subscription_tier`, adicionar `primary_niche_id`, `enabled_niches`, `vertical_sku`, `subscription_status`, `trial_ends_at`, `billing_cycle`, `quota_overrides` e tabela `platform_vertical_plans` |
| **F-04** | BFF / Governance | `module-plan-governance.ts`, `store-modules.functions.ts`, `modules.functions.ts`, `billing.functions.ts` | **P0** | Split-brain entre 3 fontes de plano/módulos; apenas 4 serviços verificam entitlement (`admin-team`, `store-modules`, `whatsapp-*`); catálogo, agenda, OS, CRM e IA sem barreira Zero-Trust; troca de plano não gera fatura/proration | Unificar motor `resolveStoreWorkspaceCapabilities` + `assertStoreEntitlement`; aplicar cotas em catálogo/equipe/WhatsApp/IA; sincronizar add-ons e emitir fatura automática em `platform_invoices` |
| **F-05** | Full-Stack Feature Órfã | `src/services/service-orders.functions.ts` (`listServiceOrders`, `createServiceOrder`) | **P1** | Tabela `service_orders` e BFF implementados com **0 chamadores UI** em `src/`; faltam campos de placa/chassi/km/checklist/técnico para Oficinas & Assistências | Estender SQL `service_orders` + evoluir BFF (`updateServiceOrderStatus`, campos automotivos/OS) + criar rota `/workspace/ordens-servico` integrada na sidebar |
| **F-06** | Navigation / Isolation | `src/lib/workspace-navigation.ts`, `src/routes/workspace.tsx` | **P1** | Filtro `enabled_modules` na sidebar compara slugs legados (`"pos"`, `"delivery"`) e ignora `CommercialModuleId`s, `vertical_sku` e `subscription_status`; rota `/workspace` não alerta inadimplência/trial expirado | Conectar `workspace-navigation.ts` ao SSOT de capacidades + `resolveStoreWorkspaceCapabilities`; exibir banner defensivo no Workspace quando suspenso/trial expirado |
| **F-07** | Onboarding & Provisioning | `onboarding.functions.ts`, `company-mvp.functions.ts`, `workspace.onboarding.index.tsx` | **P1** | `workspace.onboarding.index.tsx` declara apenas 4 cópias hardcoded (`tourism`, `restaurant`, `services`, `retail`); `provisionBusiness` usa `if (niche.includes(...))` limitado e não cria `chat_departments`, `vertical_sku`, `trial_ends_at` nem configurações iniciais por nicho | Usar `onboardingBlueprint` do SSOT para provisionar categorias, `chat_departments` padrão do nicho, `primary_niche_id`, `vertical_sku` e trial na criação da empresa |
| **F-08** | Route Hardcodes & UI Gaps | `workspace.catalogo.*`, `workspace.clientes.index.tsx`, `workspace.orcamentos.novo.tsx`, `workspace.pedidos.index.tsx`, `NewClientWizard.tsx`, `_store.agendar.$id.tsx`, `_store.marketplace.index.tsx`, `_store.produto.$slug.tsx`, `niche-operational-guard.tsx` | **P1** | **75** checagens inline `nicheId === "..."` espalhadas; `NewClientWizard` exibe etapa "Saúde & Segmento" mesmo em varejo/auto; `_store.agendar.$id` tem mapa de 7 categorias hardcoded; `booking_appointments` sem campos persistidos de fórmulas químicas/checklist | Consumir flags/campos do SSOT (`capabilities`, `dynamicFields`); adaptar `NewClientWizard`, `workspace.agenda.*`, `_store.agendar.$id`, `niche-operational-guard` e `universal-seo-head.ts` |
| **F-09** | Error Masking & DX | Loaders/services com `.catch(() => [])` / `null` (249 ocorrências em rotas) e Client direto em 4 rotas `api.*` | **P1** | Loaders de gestão (`admin-master.faturas`, `admin-master.lojas`, `admin-master.modulos`, `workspace.pedidos`, `workspace.clientes`, `workspace.catalogo.produtos`) ocultam falhas reais atrás de estado vazio | Capturar erro explícito no loader (`loaderError`) nas superfícies críticas de gestão exibindo `<ErrorState onRetry />` honesto ao invés de lista vazia silenciosa |

---

## 2. Requisitos EARS (Easy Approach to Requirements Syntax)

### R1 — Taxonomia SSOT & Erradicação de Colisões (Onda 1)
- **Ubiquitous:** O sistema SHALL resolver qualquer identificador de segmento, nicho ouVertical através do módulo canônico `@/lib/niches/niche-manifest` + `@/lib/niches/niche-semantics`, mapeando todo `UnifiedNicheId` para um `CanonicalVerticalId` e para um `VerticalPlanSku` padrão.
- **Event-Driven:** WHEN uma loja possuir `primary_niche_id`, `segment` ou `niche` explícito (ex.: `"barbearia"`, `"salao"`, `"clinica_estetica"`, `"oficina"`, `"odonto"`), THE resolution engine SHALL classificar o nicho sem colisões de substring (`"barbearia"` != `"gastronomy"`, `"produtos"` != `"events"`, `"autocuidado"` != `"automotive"`) e sem sobrescrever o nicho explícito pelo nome fantasia da empresa.
- **State-Driven:** WHILE qualquer UI de Workspace, Catálogo, Agenda, CRM, Copilot/SDR ou SEO estiver sendo renderizada para uma loja, THE UI SHALL derivar nomenclaturas, `capabilities`, `dynamicFields`, `copilotProfile`, `seoProfile` e `onboardingBlueprint` do SSOT sem `if (nicheId === ...)` hardcoded fora dos adaptadores canônicos.

### R2 — Planos Verticais Standalone, Add-ons & Entitlements 4 Camadas (Ondas 2 e 3)
- **Ubiquitous:** O banco Postgres e a camada BFF SHALL suportar sistemas verticais independentes (`platform_vertical_plans` e `stores.vertical_sku`, `primary_niche_id`, `enabled_niches[]`) além de add-ons modulares (`CommercialModuleId`), respeitando isenção exclusiva dos tenants oficiais da plataforma (`isStorePlanExempt`).
- **Unwanted Behavior:** IF uma loja exceder a cota do seu plano/vertical (`maxStaffUsers`, `maxWhatsAppInstances`, `maxCatalogItems`, `maxMonthlyAiCalls`) ou estiver com `subscription_status IN ('suspended', 'canceled')` ou módulo/vertical não contratado, THEN the BFF SHALL rejeitar a mutação com erro claro em português sem depender de bloqueio apenas no client.
- **Event-Driven:** WHEN um administrador da loja ou Admin Master alterar `planTier`, `verticalSku` ou ativar/desativar um `moduleId` add-on pago, THE BFF SHALL atualizar `stores` de forma sincronizada (sem divergência entre colunas) e registrar o lançamento de cobrança/proration correspondente em `platform_invoices` quando aplicável.

### R3 — Provisionamento Real de Onboarding & Fluxos Especializados (Ondas 3 e 4)
- **Event-Driven:** WHEN uma nova empresa for provisionada via `provisionBusiness` ou `fastRegisterCompany`, THE BFF SHALL atribuir `primary_niche_id`, `enabled_niches`, `vertical_sku`, `subscription_status = 'trialing'` (14 dias), categorias iniciais e departamentos padrão de atendimento (`chat_departments`) derivados do `onboardingBlueprint` do nicho no SSOT.
- **Event-Driven:** WHEN uma loja dos nichos `automotive`, `services` ou assistência técnica abrir `/workspace/ordens-servico`, THE interface SHALL operar CRUD real sobre `service_orders` (placa, modelo/equipamento, odômetro/chassi, checklist, peças, mão de obra e status) com os 4 estados canônicos (dados, skeleton, empty honesto, erro + retry) e zero containeritis.

### R4 — Integridade Visual, Mobile & Regressões (Onda 5)
- **Ubiquitous:** Toda interface nova ou modificada SHALL atender `AGENTS.md` (zero `!important`, zero hex/rgb literal, zero classes arbitrárias `-[...]`, múltiplos de 4px, `h-11 min-h-11` mobile, `:focus-visible`, zero Containeritis/card-dentro-de-card).
- **Verification:** A entrega somente será considerada concluída após aprovação de suítes Vitest cobrindo paridade SSOT, colisões semânticas, onboarding multi-nicho, enforcement positivo/negativo de cotas e regressão de OS + `check:schema`, `check:bff`, `check:migration-inventory`, `check:tokens`, `check:cycles`, `lint:design`, `audit:buttons`, `typecheck`, `build` e registro em `docs/design/DECISIONS.md`.

---

## 3. Plano de Execução Atômica em Ondas

1. **Onda 1 — SSOT de Nichos & Biblioteca Semântica Unificada (`src/lib/niches/*`, `src/lib/architecture/vertical-manifest.ts`, `src/hooks/*`)**
2. **Onda 2 — Migration SQL & RLS (`supabase/migrations/20270404000000_unified_niche_systems_vertical_plans_and_entitlements.sql`)**
3. **Onda 3 — Engine de Entitlements BFF, Billing/Invoices, Onboarding & Enforcements (`src/lib/architecture/module-plan-governance.ts`, `src/services/*`)**
4. **Onda 4 — Navegação Dinâmica, Isolamento Vertical, UI Nichos/OS (`/workspace/ordens-servico`), Upgrade Planos & Admin Master, Fix `.catch` Silencioso**
5. **Onda 5 — Testes Vitest, Auditorias & Build Completo + `DEC-493`**
