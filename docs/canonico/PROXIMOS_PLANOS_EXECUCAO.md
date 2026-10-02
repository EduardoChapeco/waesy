# PROXIMOS_PLANOS_EXECUCAO.md — Protocolo Canônico de Execução Autônoma

> **Comando de Ativação Rápida:** Ao enviar o comando `"leia os proximos planos"`, a IA deve carregar este documento como Fonte Única de Instrução Operacional e executar sequencialmente todas as fases pendentes sem interrupção, sem mocks, sem fallbacks sintéticos e sem quebra de rotas de produção.

---

## 1. Contexto e Estado Atual do Sistema (SSOT)

| Parâmetro | Valor Canônico |
| :--- | :--- |
| **Projeto** | Waesy — Plataforma BigTech Multitenant de Comércio, Serviços e Gestão Local |
| **Commit HEAD** | `67773fe7` (2026-10-02) |
| **Fases Concluídas** | S01–S37 + F01–F03 |
| **Última Decisão Homologada** | `DEC-126` — Deploy de Produção + Auditoria dos 4 Pilares |
| **Próxima Fase** | **F04** — Ponte de Upgrade Classificados → Workspace (listing-promotion.functions.ts) |
| **TypeScript** | `npm run typecheck` — 0 erros |
| **Testes** | 167 arquivos, 1.088 testes verdes |
| **Design Lint** | Catraca aprovada (teto 37.710 violações) |
| **Produção** | `https://usewaesy.pages.dev/` — HTTP 200 em todas as rotas |
| **Banco de Dados** | Supabase PostgreSQL, RLS deny-by-default em 100% das tabelas |

---

## 2. As Quatro Leis Invioláveis do Repositório (AGENTS.md)

1. **Zero Mocks:** Todo dado provém de queries reais no Supabase via Server Functions (`src/services/`). Se inexistente, renderiza `<EmptyState />` ou `<Skeleton />`.
2. **Separação Rígida de Camadas:**
   - `src/components/`: UI. Proibido hex/rgb literal, estilos inline ou regras de negócio.
   - `src/services/`: BFF `createServerFn`. Proibido DOM ou componentes visuais.
   - `src/lib/`: Utilitários puros, schemas Zod, clientes de infraestrutura.
   - `src/routes/`: TanStack Router com loaders/actions via BFF exclusivamente.
3. **RLS e Segurança:** Toda tabela com RLS. Views com `security_invoker = true`. Subconsultas `(SELECT auth.uid())` em políticas.
4. **Produção Inviolável:** Nenhuma rota (`/`, `/status`, `/marketplace`, `/classificados`, `/places`, `/diretorio`, `/workspace`, `/admin-master`) pode sofrer regressão.

---

## 3. Os Quatro Pilares Canônicos (Arquitetura Semântica)

| Pilar | Rota | Perfil | Regra de Negócio |
| :--- | :--- | :--- | :--- |
| **Places** | `/places` e `/diretorio` | Consumidor final | Guia de estabelecimentos físicos com geo e reputação |
| **Classificados** | `/classificados` | Pessoa física e microcomércio informal | Anúncios avulsos, desapego, ciclo de 30 dias. PROIBIDO empresa formal |
| **Marketplace** | `/marketplace` | Empresa credenciada (Workspace Pro) | Vitrine rica e transacional com checkout e garantia |
| **Workspace / Painel Pro** | `/workspace` | Operador de loja | ERP e SaaS completo com assistente de upgrade de anúncios |

---

## 4. Fases do Plano Mestre de Estabilização dos 4 Pilares (F01–F24)

### ENTREGUES (homologadas)

| Fase | Status | Commit | Descrição |
| :--- | :--- | :--- | :--- |
| F01 | [x] | `2394c2e0` | Rota mãe `/marketplace` com 6 vitrines nichadas e selo Empresa Verificada |
| F02 | [x] | `3a72c43c` | Blindagem de `/classificados` — expurgo de empresas formais, foco em desapego |
| F03 | [x] | `67773fe7` | Rota `/places`, desambiguação `/diretorio` com banner dos 4 pilares |

---

### PENDENTES — EXECUTAR EM SEQUÊNCIA

#### F04 — Ponte Canônica de Upgrade: Classificados → Workspace
**Spec:** `docs/specs/SPEC-F04-UPGRADE-BRIDGE.md` (já registrada)

**Microfases:**
1. Criar `src/services/listing-promotion.functions.ts` exportando `promoteClassifiedToWorkspaceProductFn`:
   - Validação Zod: `{ classifiedId: z.string().uuid(), targetStoreId: z.string().uuid(), initialStockQuantity: z.number().int().min(0).default(0) }`
   - Verificar posse: `classified.author_profile_id === identity.id` e `assertStoreAccess(identity)`.
   - Clonar dados + galeria de imagens do `classifieds` para `products`, incluindo `promoted_from_classified_id`.
   - Atualizar o classified: `status = 'promoted'`, `promoted_to_product_id = <novo produto>`.
   - Emitir evento `classified.promoted_to_workspace` via `publishDomainEvent()`.
   - Garantir idempotência: se `promoted_to_product_id` já existir, retornar sucesso sem duplicar.
2. Criar `src/services/listing-promotion.functions.test.ts`:
   - Cenário 1: promoção bem-sucedida — produto criado, classified atualizado.
   - Cenário 2: rejeição por falta de permissão (`assertStoreAccess` lança).
   - Cenário 3: idempotência — segunda chamada com mesmo `classifiedId` retorna produto existente.
3. Migração SQL: `supabase/migrations/<ts>_classifieds_promoted_status.sql`
   - `ALTER TABLE public.classifieds ADD COLUMN IF NOT EXISTS promoted_to_product_id UUID REFERENCES public.products(id);`
   - `ALTER TABLE public.classifieds ADD COLUMN IF NOT EXISTS promoted_at TIMESTAMPTZ;`
   - `UPDATE public.classifieds SET status = 'promoted' WHERE workspace_entity_id IS NOT NULL;` (retrocompatibilidade).
   - Aplicar migração via MCP Supabase: `apply_migration`.
4. Verificar: `npm run typecheck` (0 erros), `npm run test` (sem regressões).
5. Registrar `DEC-127` em `docs/design/DECISIONS.md`.
6. Commit: `feat(F04): ponte canônica de upgrade classificados->workspace, listing-promotion.functions, migração e DEC-127`.

---

#### F05 — Componente `ClassifiedImportModal` no Workspace
**Objetivo:** Modal no Painel Pro para listar classificados do usuário e promover com 1 clique para o catálogo.

**Microfases:**
1. Criar `src/components/workspace/classified-import-modal.tsx`:
   - Estado: loading (skeleton), empty (sem classificados), lista (cards), erro.
   - Buscar `classifieds` do usuário via Server Function existente em `classifieds.functions.ts` (filtro: `author_profile_id = auth.uid()`, `status != 'promoted'`).
   - Botão "Importar para o catálogo" chama `promoteClassifiedToWorkspaceProductFn`.
   - Toast de sucesso com link para o produto criado. Toast de erro com mensagem real.
   - Touch targets >= 44px. Focus-visible em todos os controles. Contraste >= 4.5:1.
   - Zero hex literal, zero classes arbitrárias.
2. Integrar o modal no `src/routes/workspace/catalog.tsx` ou rota equivalente via botão de ação primária.
3. Verificar: `npm run typecheck` e `node scripts/design-lint.mjs --ratchet`.
4. Registrar `DEC-128`.
5. Commit: `feat(F05): ClassifiedImportModal no Workspace para upgrade com 1 clique`.

---

#### F06 — Testes E2E de Isolamento dos 4 Pilares
**Objetivo:** Suíte de testes garantindo que tenants não vazam entre os 4 pilares.

**Microfases:**
1. Criar `src/routes/_store.pillar-isolation.test.ts`:
   - Teste 1: anúncio de empresa formal não aparece em `/classificados`.
   - Teste 2: produto de Workspace não aparece em `/classificados` (pilares isolados).
   - Teste 3: lojas não credenciadas não têm acesso à vitrine do `/marketplace`.
   - Teste 4: `/places` retorna apenas estabelecimentos físicos com `is_physical_location = true`.
   - Teste 5: `promoted` classified não aparece mais no feed de `/classificados`.
2. Garantir todos os 5 testes verdes com mocks de identidade sem dados reais de produção.
3. Registrar `DEC-129`.
4. Commit: `test(F06): suíte de isolamento dos 4 pilares`.

---

#### F07 — Vitrine Pública do Marketplace (Cards de Produto com SSR)
**Objetivo:** Página `/marketplace/[slug]` com SSR completo e SEO canônico para cada vitrine de loja.

**Microfases:**
1. Criar `src/routes/_store.marketplace.$storeSlug.tsx`:
   - Loader com `getAnonServerClient()` buscando produtos da loja por `store_id` (via slug da loja).
   - Estado: loading (skeleton grid 3-col), empty, lista de produtos, erro.
   - Cada card com imagem (CanonicalMediaFrame), título (máx 3 linhas), preço e CTA "Ver produto".
   - Meta tags `og:title`, `og:description`, `canonical` geradas no loader.
2. Criar `src/routes/_store.marketplace.$storeSlug.test.ts`:
   - Teste 1: loja credenciada retorna produtos.
   - Teste 2: loja não credenciada redireciona ou retorna 404.
3. Verificar: `npm run typecheck` e `npm run build`.
4. Registrar `DEC-130`.
5. Commit: `feat(F07): vitrine pública marketplace SSR com SEO canônico`.

---

#### F08 — Checkout do Marketplace (Fluxo B2C Completo)
**Objetivo:** Implementar fluxo de checkout end-to-end para produtos do Marketplace.

**Microfases:**
1. Criar `src/routes/_store.marketplace.checkout.tsx`:
   - Wizard de 3 etapas: (1) Sacola de itens, (2) Endereço e frete, (3) Pagamento.
   - Integração com `checkout.functions.ts` existente.
   - Validação Zod em cada etapa via `CanonicalStepperWizard`.
2. Criar `src/services/marketplace-checkout.functions.ts`:
   - `createMarketplaceOrderFn` — cria pedido em `orders`, reserva estoque, emite evento `order.created`.
   - `calculateShippingFn` — calcula frete por peso/distância ou retorna `{ free: true }` para regras da loja.
3. Migração: `<ts>_marketplace_orders_and_shipping.sql` se necessário.
4. Testes unitários de criação de pedido e cálculo de frete.
5. Registrar `DEC-131`.
6. Commit: `feat(F08): checkout marketplace B2C com wizard de 3 etapas`.

---

#### F09 — Places: Detalhe do Estabelecimento com Reputação e Galeria
**Objetivo:** Página de detalhe `src/routes/_store.places.$placeSlug.tsx`.

**Microfases:**
1. Loader buscando `places` ou `stores` com `is_physical_location = true` e slug.
2. Renderização: header com imagem, nome, categoria, endereço e badge de verificação.
3. Galeria de fotos (CanonicalMediaFrame), avaliações/reputação (média + histórico).
4. Mapa embutido (lat/lng sem chave de API obrigatória — fallback para link OpenStreetMap).
5. CTA: "Como chegar", "Ligar" (tel: href), "Ver no mapa".
6. Estado de loading (skeleton), empty, erro.
7. Testes de renderização com dados reais.
8. Registrar `DEC-132`.
9. Commit: `feat(F09): detalhe de estabelecimento Places com reputação, galeria e mapa`.

---

#### F10 — Workspace: Dashboard KPI Real com Dados do DB
**Objetivo:** Dashboard do Painel Pro com KPIs reais (vendas, pedidos, clientes, receita) sem nenhum dado mock.

**Microfases:**
1. Criar `src/services/workspace-dashboard.functions.ts`:
   - `getDashboardKpisFn` — busca agregados do período (dia, semana, mês):
     - `orders` (total, valor, status),
     - `products` (ativos, inativos, sem estoque),
     - `customers_crm` (total, novos no período),
     - `financial_entries` (receita bruta, despesas, lucro).
   - `assertStoreAccess(identity)` obrigatório.
   - Retorno tipado com interface `DashboardKpisDTO`.
2. Refatorar `src/routes/workspace/dashboard.tsx` para consumir `getDashboardKpisFn`.
3. Verificar KpiTile renderizado com valor real (não `0` ou `undefined`).
4. Estado de loading com skeleton, empty honesto se sem dados.
5. Testes: `src/services/workspace-dashboard.functions.test.ts`.
6. Registrar `DEC-133`.
7. Commit: `feat(F10): dashboard KPI do Workspace com dados reais do Supabase`.

---

#### F11 — Workspace: Gestão de Pedidos Real (CRUD e Status)
**Objetivo:** Listar, filtrar e atualizar status de pedidos reais.

**Microfases:**
1. Criar `src/services/orders.functions.ts` (se não existe) com:
   - `listOrdersFn` — paginação keyset por `created_at DESC`, filtros por status.
   - `updateOrderStatusFn` — validação de transições de status, emissão de `order.status_changed`.
   - `getOrderDetailFn` — pedido completo com itens, cliente e histórico.
2. Rota `src/routes/workspace/orders.tsx`: lista com filtros, paginação, indicador de loading.
3. Rota `src/routes/workspace/orders.$orderId.tsx`: detalhe completo do pedido.
4. Testes unitários dos 3 server functions.
5. Registrar `DEC-134`.
6. Commit: `feat(F11): gestão de pedidos real no Workspace`.

---

#### F12 — Workspace: Catálogo de Produtos Real (CRUD Completo)
**Objetivo:** CRUD completo de produtos com mídia, variantes e estoque.

**Microfases:**
1. Criar `src/services/catalog.functions.ts`:
   - `listProductsFn` — keyset pagination, filtros por status/categoria.
   - `createProductFn` — Zod schema completo, validação de `store_id`.
   - `updateProductFn` — atualização parcial com validação de posse.
   - `archiveProductFn` — soft delete (status = 'archived').
2. Criar `src/components/workspace/product-form.tsx` com `CanonicalStepperWizard`.
3. Rota `src/routes/workspace/catalog.tsx`: lista de produtos com CRUD inline.
4. Testes unitários de criação, atualização e arquivamento.
5. Registrar `DEC-135`.
6. Commit: `feat(F12): CRUD completo de produtos no catálogo do Workspace`.

---

#### F13 — CRM de Clientes do Workspace (Lista Real)
**Objetivo:** Listar clientes reais com histórico de pedidos e métricas de lifetime value.

**Microfases:**
1. Criar `src/services/crm.functions.ts`:
   - `listCustomersFn` — keyset pagination, busca por nome/email/telefone.
   - `getCustomerDetailFn` — perfil, pedidos, LTV calculado no servidor.
2. Rota `src/routes/workspace/crm.tsx`: lista com busca, filtros e acesso ao detalhe.
3. Registrar `DEC-136`.
4. Commit: `feat(F13): CRM de clientes com dados reais no Workspace`.

---

#### F14 — Motor de Busca Universal (Classificados + Marketplace + Places)
**Objetivo:** Rota `/busca` com resultados unificados dos 3 pilares públicos.

**Microfases:**
1. Criar `src/services/search.functions.ts`:
   - `universalSearchFn(query, filters)` — busca paralela via `Promise.all` em `classifieds`, `products` e `stores`/`places`.
   - Retorno unificado `SearchResultDTO[]` com `type: 'classified' | 'product' | 'place'`.
   - Rate limiting obrigatório (via `src/lib/rate-limiter.ts`).
2. Criar `src/routes/_store.busca.tsx` com input de busca, filtros de pilar e resultados unificados.
3. Estado: loading (skeleton), empty (sem resultados), lista, erro de rede.
4. Registrar `DEC-137`.
5. Commit: `feat(F14): motor de busca universal unificando os 3 pilares públicos`.

---

#### F15 — Geolocalização e Filtros por Cidade/Bairro
**Objetivo:** Filtrar resultados de Places, Classificados e Marketplace por proximidade geográfica.

**Microfases:**
1. Criar migração com extensão PostGIS se não ativa: `CREATE EXTENSION IF NOT EXISTS postgis;`
2. Criar `src/services/geo-search.functions.ts`:
   - `geoSearchPlacesFn({ lat, lng, radiusKm })` — busca com `ST_DWithin`.
   - `geoSearchClassifiedsFn({ city, neighborhood })` — filtros textuais de localização.
3. Integrar controles de localização na UI do `/places` e `/busca`.
4. Registrar `DEC-138`.
5. Commit: `feat(F15): geolocalização e filtros por cidade e bairro`.

---

#### F16 — Notificações em Tempo Real (Supabase Realtime)
**Objetivo:** Notificações push no painel do Workspace para novos pedidos, mensagens e eventos.

**Microfases:**
1. Criar `src/services/notifications.functions.ts`:
   - `listNotificationsFn` — lista não lidas do usuário.
   - `markNotificationReadFn` — atualiza `read_at`.
2. Criar `src/components/workspace/notification-bell.tsx` com canal Supabase Realtime.
3. Migração: `notifications(id, profile_id, store_id, type, payload, read_at, created_at)` com RLS.
4. Registrar `DEC-139`.
5. Commit: `feat(F16): notificações em tempo real via Supabase Realtime no Workspace`.

---

#### F17 — Painel Financeiro Real (Receita, Despesas e Fluxo de Caixa)
**Objetivo:** Módulo financeiro completo com entradas e saídas reais.

**Microfases:**
1. Criar `src/services/financial.functions.ts`:
   - `listFinancialEntriesFn` — filtros por período, tipo e categoria.
   - `createFinancialEntryFn` — lançamento manual de receita/despesa.
   - `getCashFlowSummaryFn` — fluxo de caixa por período.
2. Rota `src/routes/workspace/financial.tsx`.
3. Registrar `DEC-140`.
4. Commit: `feat(F17): painel financeiro real com receita, despesas e fluxo de caixa`.

---

#### F18 — Suporte Interno: Módulo de Tickets com SLA
**Objetivo:** Módulo de chamados internos com categoria, prioridade e SLA por severidade.

**Microfases:**
1. Expandir `src/services/support-tickets.functions.ts` se já existe, ou criar do zero.
2. Rota `src/routes/workspace/support.tsx`: lista de tickets, filtro por status/prioridade.
3. Rota `src/routes/workspace/support.$ticketId.tsx`: detalhe com histórico de mensagens.
4. Registrar `DEC-141`.
5. Commit: `feat(F18): módulo de tickets de suporte com SLA no Workspace`.

---

#### F19 — Roadmap Vivo e Changelog Automatizado
**Objetivo:** `ROADMAP_VIVO.md` e `CHANGELOG.md` gerados deterministicamente do histórico de commits e DECs.

**Microfases:**
1. Criar `scripts/generate-changelog.mjs` — extrai commits e DECs e gera `CHANGELOG.md`.
2. Criar `docs/canonico/ROADMAP_VIVO.md` com status real de cada capacidade.
3. Adicionar ao CI (Bloco G — S47).
4. Registrar `DEC-142`.
5. Commit: `feat(F19): roadmap vivo e changelog automatizado`.

---

#### F20 — ADRs, Runbook de Operação e Dicionário de Domínio
**Objetivo:** Governança operacional completa.

**Microfases:**
1. Criar `docs/operacao/RUNBOOK.md` — deploy, rollback, rotação de chaves, resposta a incidentes.
2. Criar `docs/canonico/DICIONARIO_DOMINIO.md` — glossário ubíquo do ecossistema Waesy.
3. Atualizar `CONTRIBUTING.md` com guia definitivo para developers e agentes.
4. Registrar `DEC-143`.
5. Commit: `docs(F20): runbook, dicionário de domínio e guia de contribuição`.

---

#### F21 — Scanner de Órfãos, Duplicados e Dead Code no CI
**Objetivo:** `scripts/dead-code-detector.mjs` rodando no CI e bloqueando merges com código morto.

**Microfases:**
1. Criar `scripts/dead-code-detector.mjs` — detecta exports não importados, componentes duplicados.
2. Integrar no pipeline CI (`.github/workflows/ci.yml`).
3. Registrar `DEC-144`.
4. Commit: `feat(F21): scanner de órfãos e dead code no CI`.

---

#### F22 — CI Bloqueante Unificado (Typecheck + Lint + Tests + Build)
**Objetivo:** Pipeline CI em `/.github/workflows/ci.yml` com todas as gates obrigatórias.

**Microfases:**
1. Criar/atualizar `.github/workflows/ci.yml`:
   - Gate 1: `npm run typecheck` (Exit Code 0).
   - Gate 2: `node scripts/design-lint.mjs --ratchet` (0 P0/P1).
   - Gate 3: `npm run test` (0 falhas).
   - Gate 4: `npm run build` (bundle < 25 MB).
   - Gate 5: `node scripts/dead-code-detector.mjs` (0 órfãos).
2. Configurar para bloquear PR sem aprovação em todas as gates.
3. Registrar `DEC-145`.
4. Commit: `feat(F22): CI bloqueante unificado com 5 gates de qualidade`.

---

#### F23 — Auditoria de Segurança Final e RLS Abrangente
**Objetivo:** Varredura completa de segurança, RLS e proteção multi-tenant.

**Microfases:**
1. Executar skill `security-guard`: auditar 100% das tabelas com RLS, verificar policies por tenant.
2. Auditar todas as Server Functions: todas devem chamar `assertStoreAccess` ou `getServerIdentity`.
3. Varredura de SQL Injection: inputs parametrizados, sem concatenação de strings em queries.
4. Varredura de rate-limiting: todas as rotas públicas sensíveis devem ter rate limiter.
5. Registrar `DEC-146`.
6. Commit: `security(F23): auditoria completa de RLS, rate-limit e proteção multi-tenant`.

---

#### F24 — Selo Final de Conclusão do Plano Mestre
**Objetivo:** Homologação e fechamento do Plano Mestre de Estabilização dos 4 Pilares.

**Microfases:**
1. Executar ciclo completo de verificação:
   - `npm run typecheck` (0 erros).
   - `npm run test` (sem regressões).
   - `node scripts/design-lint.mjs --ratchet` (0 P0/P1).
   - `npm run build` (Exit Code 0).
2. Deploy de produção via Cloudflare Pages.
3. Validar HTTP 200 em todas as rotas públicas.
4. Registrar `DEC-147` — Selo Final do Plano Mestre.
5. Commit: `release(F24): Plano Mestre dos 4 Pilares concluído — Waesy v2.0`.

---

## 5. Blocos S38–S48 (Plano 5 — Documentação e Infraestrutura CI)

| Fase | Bloco | Descrição | Mapeada Para |
| :--- | :--- | :--- | :--- |
| S38 | F | Roadmap vivo com prova item a item | F19 |
| S39 | F | Backlog canônico em linguagem humana | Parte de F20 |
| S40 | F | ADRs, Runbook, Dicionário e CONTRIBUTING | F20 |
| S41 | F | FAQ e base de conhecimento por vertical | F20 |
| S42 | F | Changelog automatizado via script | F19 |
| S43 | F | Suporte com ticket, SLA e categoria | F18 |
| S44 | G | Registry de capacidades | F21 |
| S45 | G | Paridade ação-permissão-tool | F22 |
| S46 | G | Scanner de órfão e duplicado no CI | F21 |
| S47 | G | CI bloqueante unificado | F22 |
| S48 | G | Autoauditoria e selo final | F24 |

---

## 6. Procedimento de Execução para a IA Responsável

Quando receber `"leia os proximos planos"`, executar **estritamente nesta ordem**:

1. **Baseline:** Ler `docs/canonico/PROXIMOS_PLANOS_EXECUCAO.md` (este arquivo) e `docs/design/DECISIONS.md` (últimas 3 decisões).
2. **Identificar fase ativa:** A primeira fase da lista "PENDENTES" ainda sem commit correspondente.
3. **Ler a spec:** Se existir `docs/specs/SPEC-[FASE].md`, ler antes de qualquer código. Se não existir, criar a spec em EARS com entradas, saídas, invariantes e critérios de aceite.
4. **Executar multi-agente:** Lançar subagentes paralelos para pesquisa de código existente enquanto implementa. Usar `recursive-fix`, `security-guard` e `design-lint` skills.
5. **Verificação de 4 gates** (obrigatória após cada fase):
   ```
   npm run typecheck              # Exit Code 0
   npm run test                   # 0 falhas
   node scripts/design-lint.mjs --ratchet  # 0 P0/P1
   npm run build                  # Exit Code 0
   ```
6. **Registro e Commit:**
   - Adicionar `DEC-XXX` em `docs/design/DECISIONS.md`.
   - Marcar a fase com `[x]` neste documento.
   - `git add . && git commit -m "feat(FXX): [descrição]" && git push origin main`.
7. **Continuar:** Avançar para a próxima fase sem pausa.

---

**Última atualização:** 2026-10-02T13:14:00-03:00
**Commit de referência:** `67773fe7`
**Próxima fase imediata:** `F04 — listing-promotion.functions.ts`
