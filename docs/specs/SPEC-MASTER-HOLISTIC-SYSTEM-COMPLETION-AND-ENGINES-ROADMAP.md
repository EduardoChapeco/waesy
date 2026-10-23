# SPEC-MASTER-HOLISTIC-SYSTEM-COMPLETION-AND-ENGINES-ROADMAP
## Roteiro Integrado de Conclusão Holística de Engines, Contratos BFF, Banco e Telas de Produção

- **Documento:** `docs/specs/SPEC-MASTER-HOLISTIC-SYSTEM-COMPLETION-AND-ENGINES-ROADMAP.md`
- **Autor:** Antigravity AI Engineering Board & Red Team
- **Data de Registro:** 2026-10-22
- **Status:** Aprovado para Execução Atômica Desacoplada (Anti-Colisão)
- **Versão:** 1.0.0
- **Repositório:** `https://github.com/EduardoChapeco/waesy.git`
- **Ambiente Alvo:** Produção (`https://usewaesy.pages.dev` / `https://waesy.com.br`)

---

## 1. Visão Geral & Diagnóstico Forense End-to-End

A auditoria transversal realizada entre o repositório atual (`waesy`) e o repositório de infraestrutura conceitual (`wider` - WAESY OS Core v0.74) evidenciou que o **Waesy** já possui uma infraestrutura enterprise robusta (791k LOC, 438 rotas tipadas, 571 services BFF e 538 migrations SQL). No entanto, existem **gaps de orquestração transversal** onde tabelas e schemas existem no banco de dados, contratos existem no BFF, mas o ciclo visual ou transacional na interface do usuário (UI) permanece parcial, desconectado ou sustentado por soluções improvisadas ("parece certo, mas não está").

Este plano estabelece a **fórmula canônica de integração em 4 camadas** para cada módulo:
```
[1. PostgreSQL + RLS] ──► [2. BFF Server Functions + Zod] ──► [3. Hooks & State] ──► [4. UI Adaptativa Apple HIG]
```

---

## 2. Inventário de Gaps: "O que Parece Certo, mas Não Está"

| Domínio Funcional | O que Existe no Banco de Dados | O que o BFF Executa | O que a Tela (UI) Faz Hoje | Causa Raiz do Gap |
| :--- | :--- | :--- | :--- | :--- |
| **KDS / Cozinha & Salão** | Tabelas canônicas `kds_orders`, `kds_order_items`, `kds_stations` com SLAs, status e tempos de preparo. | `order.functions.ts` possui endpoint genérico `listOrders()`. Não há service para `kds_orders`. | `workspace.pdv.cozinha.tsx` executa polling HTTP a cada 3 segundos (`refetchInterval: 3000`) e usa palavras-chave em texto livre ("pizza" = forno). | As tabelas especializadas de KDS estão **órfãs**; a tela lê a tabela geral de vendas sem suporte a Realtime. |
| **Adicionais na Vitrine Rápida** | `option_groups` e `option_values` vinculados por `product_option_groups`. Suporte a modificadores com cobrança de acréscimo. | `cart.functions.ts` já calcula `optionsTotalCents`, busca metadados e grava `selected_options`. | Quando o produto é conveniência/gastronomia (`ConvenienceShowcaseView`), a tela só exibe opções de texto plano (`prepOptions`), sem somar preço nem exibir grupos. | O componente `ProductOptionsCustomizer` existe, mas não havia sido montado dentro do `ConvenienceShowcaseView`. |
| **Algoritmo de Feed & Descoberta** | Tabelas de `posts`, `stores`, engajamento social e geolocalização (`stores.city`, coordenadas PostGIS). | `feed.functions.ts` roda uma query SQL plana com `.order("created_at", { ascending: false })`. | `_store.index.tsx` renderiza posts puramente por ordem cronológica decrescente. | O motor de recomendação inteligente (`smart-feed.engine.ts` do `wider` com funil Candidate → Scoring → Diversity) não foi compilado no BFF. |
| **Precificação Dinâmica & Lotes** | Colunas `compare_at_cents`, tabelas de `lots` de eventos e tarifas de mobilidade no Waesy Go. | Regras de cálculo espalhadas entre helpers de nicho e funções isoladas. | Formulários de checkout e pacotes calculam descontos em memória via funções locais estáticas. | Falta do motor centralizado `pricing-engine.functions.ts` que calcule regras temporais (happy hour, lotes de ingressos, VIP) no servidor. |
| **Checkout Multiloja & Endereço** | Migration `20270223000000_advanced_address_platform_mercadolivre_parity.sql` com tipo de via, ponto de referência e CEP. | `addresses.functions.ts` com validação de viabilidade de entrega e persistência canônica. | `_store.checkout.tsx` integra parcialmente `AddressCardHub`, mas faltam validações de tolerância de entrega expressa. | Falta de amarração final entre o snapshot do endereço no pedido (`orders.shipping_address`) e a telemetria do Waesy Go. |

---

## 3. Matriz de Microfases Atômicas (Execução Desacoplada)

Para garantir que múltiplos agentes e conversas atuem de forma simultânea sem conflitos de merge, cada entrega é delimitada de forma estrita:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        MAPA DE MICROFASES                              │
├─────────────────────┬──────────────────────────────────────────────────┤
│ Microfase 1 (M-01)  │ Adicionais & Modificadores no ConvenienceShowcase│
│ Microfase 2 (M-02)  │ KDS Cozinha Conectado a kds_orders + Realtime    │
│ Microfase 3 (M-03)  │ Motor Unificado de Precificação Dinâmica & Lotes │
│ Microfase 4 (M-04)  │ Motor de Ranking do Feed Social & Vitrines (RPC) │
│ Microfase 5 (M-05)  │ Snapshot Imutável de Modificadores no Checkout   │
│ Microfase 6 (M-06)  │ CMS Bilateral de Vitrines com Agendamento        │
│ Microfase 7 (M-07)  │ Auditoria de Design Tokens e Ratchet DL-15       │
└─────────────────────┴──────────────────────────────────────────────────┘
```

---

### Microfase 1: Conexão Bidirecional de Adicionais no `ConvenienceShowcaseView`
- **Problema:** Lojas de gastronomia, açaí, lanches e conveniência não conseguiam cobrar adicionais (ex: bacon +R$ 5, queijo extra +R$ 4) ao utilizar a vitrine rápida.
- **Tabelas / Colunas Envolvidas:** `public.option_groups`, `public.option_values`, `public.product_option_groups`.
- **Contrato BFF:** `getProductBySlug` já retorna `optionGroups: OptionGroup[]`.
- **Alteração na UI:**
  - `src/components/classifieds/convenience-showcase-view.tsx`:
    - Adicionar `optionGroups?: OptionGroup[]` em `ConveniencePreviewData`.
    - Manter estado local `selectedOptions: Record<string, string[]>`.
    - Calcular `optionsPriceModifierCents` via `useMemo`.
    - Somar o acréscimo dinâmico ao `baseUnitPriceCents`.
    - Renderizar `<ProductOptionsCustomizer>` com alvos táteis de 44px (`h-11 min-h-11`) e anéis de foco `:focus-visible:ring-2`.
    - Repassar as opções formatadas no payload de `createQuickOrder` e no WhatsApp.
  - `src/routes/_store.produto.$slug.tsx`:
    - Repassar `optionGroups: product.optionGroups` na prop `previewData` do `<ConvenienceShowcaseView>`.
- **Critério de Aceite:**
  - [ ] Selecionar um adicional com preço soma imediatamente o valor ao preço unitário e total na tela.
  - [ ] Pedido gerado exibe os adicionais selecionados no resumo e no WhatsApp.
  - [ ] Zero erros de compilação TypeScript (`npm run typecheck` Exit Code 0).

---

### Microfase 2: Conexão do KDS às Tabelas Canônicas (`kds_orders` & `kds_stations`)
- **Problema:** A tela de cozinha executa polling pesado na tabela geral de vendas e inventa estações via código estático, ignorando as praças configuradas pelo restaurante no banco.
- **Tabelas / Colunas Envolvidas:**
  - `public.kds_stations` (`id`, `store_id`, `name`, `slug`, `color_code`, `target_prep_time_minutes`, `assigned_categories`).
  - `public.kds_orders` (`id`, `store_id`, `order_id`, `table_id`, `daily_ticket_number`, `status`, `prep_started_at`, `total_prep_time_seconds`).
  - `public.kds_order_items` (`id`, `kds_order_id`, `station_id`, `product_name`, `quantity`, `modifiers` JSONB, `status`).
- **Contrato BFF:**
  - Criar `src/services/kds.functions.ts`:
    - `listKdsStationsFn({ storeId })`: Retorna as praças ativas cadastradas pelo restaurante.
    - `listKdsTicketsFn({ storeId, stationId, status })`: Retorna comandas e itens com modificadores.
    - `updateKdsItemStatusFn({ itemId, status, prepTimeSeconds })`: Atualiza o item individual.
    - `updateKdsTicketStatusFn({ ticketId, status })`: Conclui ou cancela a comanda.
- **Alteração na UI:**
  - `src/routes/workspace.pdv.cozinha.tsx`:
    - Substituir `listOrders` genérico por `listKdsTicketsFn`.
    - Eliminar `refetchInterval: 3000` (polling contínuo) e assinar o canal Supabase Realtime (`postgres_changes` no schema `public`, table `kds_orders`).
    - Renderizar as abas de estações dinamicamente a partir de `kds_stations`.
    - Exibir cada adicional do item em badges de alto contraste squircle.
- **Critério de Aceite:**
  - [ ] Comandas aparecem instantaneamente na tela da cozinha via WebSockets Realtime quando um pedido é confirmado.
  - [ ] Cada praça visualiza apenas os itens das categorias atribuídas a ela.
  - [ ] Finalizar o preparo registra `prep_time_seconds` real no banco.

---

### Microfase 3: Motor Unificado de Precificação Dinâmica & Lotes Progressivos
- **Problema:** Ingressos de eventos, corridas do Waesy Go e delivery não compartilham um motor unificado de regras temporais e de demanda.
- **Tabelas / Colunas Envolvidas:**
  - `public.ticket_lots` (`event_id`, `price_cents`, `available_qty`, `starts_at`, `ends_at`).
  - `public.orders` (`subtotal_cents`, `discount_cents`, `surcharge_cents`, `grand_total_cents`).
- **Contrato BFF:**
  - Criar `src/services/pricing-engine.functions.ts` adaptando a lógica do `pricing-engine.ts` do `wider`:
    - `calculateDynamicPriceFn({ basePriceCents, ruleType, conditions, customerContext })`.
    - Suporte a regras de:
      - `time_based`: Horários específicos (ex: almoço promocional, taxa de madrugada).
      - `demand_based`: Lotação ou estoque remanescente (virada automática de lote de ingressos).
      - `profile_based`: Descontos exclusivos para clientes VIP ou assinantes da cidade.
- **Alteração na UI:**
  - `src/routes/_store.checkout.tsx` e `src/components/commerce/price-display.tsx`:
    - Exibir o detalhamento explícito das regras aplicadas (ex: "Desconto Happy Hour: -15%", "Lote 2 Ativo").
- **Critério de Aceite:**
  - [ ] Virada de lote de ingressos ocorre de forma atômica no servidor quando o estoque daquele lote atinge 0.
  - [ ] Proibido permitir alteração de preço pelo front-end (blindagem Zero-Trust).

---

### Microfase 4: Motor de Ranking Inteligente do Feed Social & Vitrines (RPC)
- **Problema:** Vitrines e feeds públicos exibem itens por ordem cronológica pura, prejudicando lojas ativas e com alto engajamento da comunidade.
- **Tabelas / Colunas Envolvidas:**
  - `public.posts`, `public.stores`, `public.classifieds`.
  - Colunas de engajamento: `likes_count`, `comments_count`, `views_count`, coordenadas geográficas (`lat`, `lng`).
- **Contrato BFF / SQL:**
  - Criar migration `supabase/migrations/20270301000000_smart_feed_ranking_algorithm.sql`:
    - Função PostgreSQL `get_ranked_community_feed(p_user_id UUID, p_city TEXT, p_lat FLOAT, p_lng FLOAT, p_limit INT)`:
      - **Etapa 1 (Candidatos):** Filtrar publicações ativas da mesma comarca/região nas últimas 72 horas.
      - **Etapa 2 (Scoring):** Pontuação ponderada = (Recência × 0.3) + (Engajamento × 0.4) + (Proximidade Geográfica × 0.3).
      - **Etapa 3 (Diversidade):** Limitar no máximo 2 posts consecutivos do mesmo estabelecimento ou autor.
  - Atualizar `src/services/feed.functions.ts` para invocar a RPC com fallback resiliente para `.order("created_at")`.
- **Alteração na UI:**
  - `src/routes/_store.index.tsx` e componentes de feed:
    - Exibir indicador visual de proximidade ("Empresa do seu bairro" ou "Destaque na sua cidade").
- **Critério de Aceite:**
  - [ ] Feed prioriza publicações de alta relevância e proximidade sem gerar repetição monótona do mesmo autor.

---

### Microfase 5: Snapshot Imutável de Modificadores no Checkout e Pedidos
- **Problema:** Quando o produto é alterado pelo lojista após a compra, pedidos antigos correm risco de distorção caso os adicionais não estejam congelados em snapshot.
- **Tabelas / Colunas Envolvidas:**
  - `public.order_items`: Assegurar que `variant_attributes` ou coluna `modifiers_snapshot` JSONB guarde o histórico imutável:
    ```json
    [
      { "group": "Ponto da Carne", "option": "Ao Ponto", "price_cents": 0 },
      { "group": "Adicionais", "option": "Bacon Artesanal", "price_cents": 500 }
    ]
    ```
- **Contrato BFF:**
  - `src/services/checkout.functions.ts` e `src/services/order.functions.ts`:
    - Garantir que `createOrder` grave o array de modificadores com nome, valor e identificador no momento da transação.
- **Alteração na UI:**
  - `src/routes/_store.conta.pedidos.$id.tsx` e `src/routes/workspace.pedidos.$id.tsx`:
    - Renderizar os modificadores exatamente como foram contratados no dia da compra.
- **Critério de Aceite:**
  - [ ] O cliente e o lojista visualizam exatamente os complementos contratados, mesmo se o produto for editado ou desativado posteriormente.

---

### Microfase 6: CMS Bilateral de Vitrines com Agendamento Temporal
- **Problema:** Banners e seções de vitrine no `_store.*` precisam de espelho 100% editável no Admin Master, respeitando as regras `starts_at` e `ends_at`.
- **Tabelas / Colunas Envolvidas:** `public.marketplace_surfaces`, `public.marketplace_sections`, `public.hotpages`.
- **Contrato BFF:**
  - `src/services/marketplace.functions.ts`:
    - Injetar cláusula WHERE `.lte("starts_at", now()).gte("ends_at", now())` nas queries públicas de vitrine.
    - Omitir automaticamente da resposta seções vazias ou campanhas expiradas.
- **Alteração na UI:**
  - `src/routes/admin-master.curadoria.tsx` e `src/routes/admin-master.hotpages.tsx`:
    - Adicionar campos de agendamento de data de início e término com seletor nativo.
- **Critério de Aceite:**
  - [ ] Seção com data de término vencida deixa de ser exibida na página inicial sem quebrar a grade nem gerar Cumulative Layout Shift (CLS = 0).

---

### Microfase 7: Auditoria de Design Tokens e Erradicação dos DL-15 Restantes
- **Problema:** O Design Lint identificou 361 violações P0 de DL-15 remanescentes em elementos não-botão (`div` com `onClick`, links sem anel de foco).
- **Diretriz de Design:** AGENTS.md B.4, B.14 (Touch targets >= 44px) e WCAG 2.2 AA.
- **Ação:**
  - Varrer componentes onde `onClick` foi adicionado em elementos neutros:
    - Substituir por elemento semântico `<button type="button">` ou adicionar `role="button" tabIndex={0} onKeyDown={...}`.
    - Assegurar a classe canônica `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`.
    - Garantir altura mínima de toque `h-11 min-h-11`.
- **Critério de Aceite:**
  - [ ] `npm run lint:design` executa com 0 violações P0.

---

## 4. Regras de Não-Colisão para Múltiplos Agentes Ativos

Para prevenir que agentes paralelos sobreponham arquivos:
1. **Regra de Um Arquivo por Sessão:** Cada agente deve editar estritamente o arquivo de escopo atômico da sua microfase.
2. **Preflight com `git status -s`:** Antes de qualquer alteração, o agente deve verificar se o arquivo está limpo (`unmodified`) no worktree local. Se estiver modificado por outro processo, parar imediatamente e selecionar uma microfase desobstruída.
3. **Preservação de Linhas Finais e CRLF:** Utilizar codemods que preservem estritamente os line endings originais do arquivo.
4. **Zero Mocks:** Toda alteração deve se conectar a tabelas e colunas reais do PostgreSQL através do BFF.

---

## 5. Ordem de Execução Recomendada

```
M-01 (Adicionais na Vitrine)  ──►  M-05 (Snapshot no Checkout)  ──►  M-02 (KDS Cozinha Realtime)
            │                                                                  │
            ▼                                                                  ▼
M-03 (Pricing Engine Lotes)   ──►  M-04 (Smart Feed Ranking)    ──►  M-06 (CMS Bilateral)
                                                                               │
                                                                               ▼
                                                                     M-07 (Ratchet DL-15)
```
