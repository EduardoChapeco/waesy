# PLANO MESTRE DE EXECUÇÃO HOLÍSTICA, AUDITORIA FORENSE E MICROFASES (WAESY ECOSYSTEM)

**Data de Emissão:** 22 de Outubro de 2026  
**Status do Documento:** SSOT Canônico de Engenharia e Roadmap Executável  
**Repositório:** `waesy`  
**Conformidade:** `AGENTS.md` (B.1 a B.45), WCAG 2.2 AA, Apple HIG & macOS System App  

---

## 1. Visão Executiva & Princípios Inegociáveis

Este plano consolida o inventário de completude de ponta a ponta da plataforma Waesy. O objetivo é erradicar simulações, código morto, tabelas desconectadas e interfaces puramente estáticas, transformando cada subsistema em um fluxo comercial e operacional plenamente transacional.

### 1.1 Invariantes Supremas de Engenharia
1. **Zero Simulação:** Nenhuma tela, formulário ou métrica pode exibir dados estáticos, contadores fixos ou mocks quando o backend real estiver disponível. Se não há dados, renderiza-se empty state honesto.
2. **Design Bidirecional Nativo:**
   - **Mobile (< 600px):** Ergonomia padrão iOS/Android. Touch targets de no mínimo 44x44px (`h-11 min-h-11`), safe-area inferior (`pb-safe pb-24`), sem overflow horizontal (`no-scrollbar`), ações em `TetrisActionGrid` e ausência de ruído decorativo.
   - **Desktop ($\ge$ 840px):** Densidade equilibrada padrão macOS/Linear. Anéis de foco acessíveis (`:focus-visible:ring-2`), comandos diretos, atalhos e tipografia limpa.
3. **Integridade de Esquema (Cláusula Pétrea):** Terminantemente proibido `DROP TABLE`, `DROP COLUMN` ou `TRUNCATE`. Tabelas com 0 linhas são contratos estruturais a serem conectados.
4. **Governança Multi-Agente & Concorrência:** Modificações ocorrem estritamente no escopo da microfase ativa, sem mutações cruzadas em módulos vizinhos sob edição paralela.

---

## 2. Matriz Geral de Execução das 18 Microfases

| Microfase | Domínio Arquitetural | Escopo & Vulnerabilidades Mapeadas | Estado Atual |
|---|---|---|---|
| **Microfase 1** | Identidade & Tenant Context | Blindagem Zero-Trust de `setTenantContext`, erradicação de auto-owner espúrio e barreira de `workspace_members`. | **CONCLUÍDA & TESTADA (`9d7a9e86`)** |
| **Microfase 2** | Onboarding & Criação de Lojas | `createStore`, unicidade de slug sem randoms, vinculação de `context_profile_id` e rollback atômico anti-zumbi. | **CONCLUÍDA & TESTADA (DEC-297)** |
| **Microfase 3** | Catálogo & Produtos Básicos | Unificação de mutações em `catalog.functions.ts`, sincronização atômica de `product_variants` e estoque real. | **PRÓXIMA (Fase Ativa)** |
| **Microfase 4** | Classificados & Nichos Canônicos | Mapeamento 1:1 de `upsertClassified`, isolamento de nichos (Invariante B.37) e ciclo de validade (30/60/90 dias). | Planejada |
| **Microfase 5** | Carrinho & Persistência Local/Server | Sincronização guest $\leftrightarrow$ auth (`mergeGuestCart`), anti-multi-tenant split e cálculo server-side. | Planejada |
| **Microfase 6** | Checkout & Endereços (Zero-Amnesia) | Validação Mod-11 CPF/CNPJ, snapshot imutável em `orders.shipping_address_snapshot` e cofre de endereços. | Planejada |
| **Microfase 7** | Pagamentos & Webhooks de Gateway | Idempotência server-side (`order_id + method`), webhook Pix/Cartão e transição `PENDING` $\to$ `PAID`. | Planejada |
| **Microfase 8** | Pedidos & Gestão no Workspace | Máquina de estados finitos (`pending` $\to$ `delivered`), ações do lojista, timeline de eventos e push. | Planejada |
| **Microfase 9** | Logística, Frete & Áreas de Entrega | `business-location-picker`, cálculo server-side de raio/bairros sem bypass do cliente e taxas auditadas. | Planejada |
| **Microfase 10** | Clientes & CRM do Lojista | Listagem real via `orders` / `profiles`, histórico de compras e métricas sem dados fictícios. | Planejada |
| **Microfase 11** | Painel Financeiro & Ledger | Fluxo de caixa derivado de liquidações reais, extrato paginado e integridade matemática do Ledger. | Planejada |
| **Microfase 12** | Equipe & Permissões RBAC | Convites via `workspace_members`, validação estrita de 9 papéis e revogação imediata de credenciais. | Planejada |
| **Microfase 13** | Configurações da Loja & Horários | Persistência em `stores.business_hours`, expedientes semanais e exibição de aberto/fechado em tempo real. | Planejada |
| **Microfase 14** | Vitrine Pública da Loja | Rota SSR `_store.loja.$slug`, catálogo por categoria, header nativo e status operacional em tempo real. | Planejada |
| **Microfase 15** | Módulo de Mobilidade (Waesy Go) | Cálculo server-side obrigatório de tarifas e distâncias, taxa fixa de R$ 0,99 e barreira de CPF. | Planejada |
| **Microfase 16** | Módulo de Turismo & Viagens | Cotações com dual-write, rooming list, comissões de operadoras (D+30) e Saga compensatória. | Planejada |
| **Microfase 17** | Pós-Venda & Devoluções (RMA) | Ciclo de trocas/devoluções, upload de comprovantes em storage isolado e mensagens auditadas. | Planejada |
| **Microfase 18** | Governança, Audit Logs & Telemetria | Gravação centralizada em `audit_logs`, telemetria sem PII e verificação de integridade RLS universal. | Planejada |

---

## 3. Diagnóstico Forense: "O Que Parece Certo, Mas Não Está"

### 3.1 Checkout Fragmentado em Múltiplos Arquivos
- **Diagnóstico:** A lógica de checkout divide-se entre `checkout.functions.ts`, `marketplace-checkout.functions.ts` e `multi-store-checkout.functions.ts`. A tela `_store.checkout.tsx` consome funções legadas enquanto novos testes apontam para `marketplace-checkout`.
- **Ação de Correção:** Unificar o entrypoint em `src/services/checkout.functions.ts`, descontinuando métodos concorrentes e garantindo a persistência do snapshot imutável do endereço.

### 3.2 Mutações de Produto Dispersas
- **Diagnóstico:** A criação de produtos (`createProduct`) está replicada em 4 arquivos (`admin-catalog`, `catalog`, `cms`, `workspace-catalog`), enquanto `product.functions.ts` contém apenas busca por slug.
- **Ação de Correção:** Consolidar todas as mutações em `src/services/catalog.functions.ts` com validação Zod para variantes, estoque e fotos.

### 3.3 Duplicação nos Serviços de Pedidos
- **Diagnóstico:** `order.functions.ts` (28 server functions de operações) e `orders.functions.ts` (3 server functions com schemas Zod tipados) operam em paralelo com tipagens divergentes.
- **Ação de Correção:** Reexportar as funções canônicas em módulo unificado, eliminando dependências circulares e unificando o enum `ORDER_STATUS_VALUES`.

### 3.4 Pagamentos sem Idempotência Estrita
- **Diagnóstico:** A confirmação de pagamentos Pix opera via rotas com polling passivo sem trava de idempotência server-side, permitindo múltiplas chamadas concorrentes.
- **Ação de Correção:** Implementar trava baseada em `order_id + payment_method + attempt_number` e webhook criptografado.

### 3.5 Compressão de Layout Mobile
- **Diagnóstico:** Telas com grades `grid-cols-2` ou `grid-cols-4` estáticas espremem cartões abaixo de 44px em telas compactas.
- **Ação de Correção:** Adotar `TetrisActionGrid` e quebra vertical natural com padding mínimo de 16px nas bordas da viewport.

---

## 4. Detalhamento de Execução por Microfase

---

### MICROFASE 1: Identidade & Tenant Context (Zero-Trust)
- **Status:** CONCLUÍDA & COMMITADA (`9d7a9e86`)
- **Tabelas Envolvidas:** `profiles`, `stores`, `workspace_members`
- **Contratos BFF:** `setTenantContext`, `getIdentity` em `src/services/identity.functions.ts`
- **Entrega:**
  - Barreira Zero-Trust impedindo alternância de tenant para usuários não autorizados em `workspace_members`.
  - Limpeza imediata de cookies residuais na desconexão (`waesy_active_context=civil`).
  - 100% de testes verdes em `tenant-context-zero-trust.test.ts`.

---

### MICROFASE 2: Onboarding & Criação Atômica de Lojas
- **Status:** CONCLUÍDA & VALIDADA (DEC-297)
- **Tabelas Envolvidas:** `organizations`, `stores`, `workspace_members`, `profiles`
- **Contratos BFF:** `createStore` em `src/services/identity.functions.ts`, `provisionBusiness` em `src/services/onboarding.functions.ts`
- **Interface UI:**
  - Nova rota canônica: `src/routes/_store.conta.lojas.nova.tsx` com formulário bidirecional Apple HIG, preview em tempo real de slug e alvos de toque de 44px (`h-11 min-h-11`).
  - Botão "Nova Loja" em `src/routes/_store.conta.lojas.tsx` roteado para a criação nativa.
- **Regras Mandatórias:**
  1. Vinculação atômica de `context_profile_id = userId` e `is_active = true` em `stores`.
  2. Registro obrigatório do criador em `workspace_members` com `role: 'owner'`.
  3. Rollback atômico: se o vínculo em `workspace_members` falhar, a loja e organização são excluídas imediatamente (Zero Lojas Zumbis).
  4. Resolução de slug limpo via `resolveUniqueStoreSlug` sem números aleatórios espúrios.
- **Verificação:** Suíte automatizada `microphase2-store-onboarding-tenant.test.ts` cobrindo 100% dos ramos.

---

### MICROFASE 3: Catálogo & Produtos Básicos
- **Status:** PRÓXIMA (Fase Ativa de Execução)
- **Tabelas Envolvidas:** `products`, `product_variants`, `product_images`, `categories`
- **Contratos BFF:** Consolidar em `src/services/catalog.functions.ts`:
  - `createProduct(CreateProductInput)`
  - `updateProduct(UpdateProductInput)`
  - `listStoreProducts({ storeId, categoryId, search, status, page, limit })`
  - `deleteProduct({ productId, storeId })`
- **Campos Obrigatórios do Schema:**
  - `name`: string (mínimo 2 caracteres)
  - `slug`: string determinística única por loja
  - `price_cents`: integer $\ge 0$
  - `promotional_price_cents`: integer opcional $\ge 0$
  - `stock_on_hand`: integer $\ge 0$
  - `sku`: string opcional
  - `category_id`: uuid referenciando `categories(id)`
  - `store_id`: uuid referenciando `stores(id)`
  - `images`: array de URLs válidas (primeira imagem como capa em `products.image_url`)
- **Interface UI:**
  - `src/routes/workspace.catalogo.produtos.novo.tsx`: Formulário simplificado e silencioso com upload de fotos, seleção de categoria, preço e estoque.
  - Grade mobile com inputs empilhados confortáveis (`h-11`) e botão de ação primário fixo no rodapé (`pb-safe`).
- **Critérios de Aceite:**
  - [ ] Teste unitário comprovando inserção atômica de produto e variantes.
  - [ ] Rejeição de preços negativos no banco e no schema Zod.
  - [ ] Zero dependência de funções legadas de catálogo em `cms.functions.ts`.

---

### MICROFASE 4: Classificados & Nichos Canônicos
- **Status:** Planejada
- **Tabelas Envolvidas:** `classifieds`, `classified_media`, `classified_attributes`
- **Contratos BFF:** `src/services/classifieds.functions.ts`:
  - `upsertClassified`, `getClassifiedDetail`, `listClassifieds`
- **Regras Mandatórias:**
  - Isolamento estrito de nichos (Invariante B.37): atributos de Veículos (Fipe, KM, Câmbio) ou Imóveis (Quartos, Vagas) não podem vazar para Turismo ou Serviços.
  - Resolução via `canonical-specs-resolver.ts`.
  - Ciclo de vida com expiração determinística (30, 60 ou 90 dias) e controle de renovação.
- **Interface UI:**
  - `src/routes/_store.classificados.$id.tsx`: Unificação do showcase editorial sem templates concorrentes (Invariante B.36).
  - Cards squircles sem truncamento textual (`break-words text-wrap`, Invariante B.38).

---

### MICROFASE 5: Carrinho & Persistência Local/Server
- **Status:** Planejada
- **Tabelas Envolvidas:** `carts`, `cart_items`
- **Contratos BFF:** `src/services/cart.functions.ts`:
  - `getCart`, `addToCart`, `removeFromCart`, `updateCartItemQty`, `mergeGuestCart`
- **Regras Mandatórias:**
  - Trava anti-multi-tenant: aviso claro na UI quando itens de lojistas distintos forem adicionados, oferecendo bifurcação ou finalização individual.
  - `mergeGuestCart` automático no login do usuário vinculando a sessão anônima ao `customer_id`.
  - Cálculo de subtotal estritamente server-side.
- **Interface UI:**
  - `src/routes/_store.carrinho.tsx`: Drawer e tela cheia mobile com resumo de itens, cálculo de frete e CTA primário de 44px.

---

### MICROFASE 6: Checkout & Endereços (Zero-Amnesia)
- **Status:** Planejada
- **Tabelas Envolvidas:** `orders`, `order_items`, `user_addresses`
- **Contratos BFF:** `src/services/checkout.functions.ts`:
  - `processCheckout`, `validateDeliveryLocationGPS`
- **Regras Mandatórias:**
  - Validação Mod-11 de CPF/CNPJ server-side.
  - Snapshot imutável gravado em `orders.shipping_address_snapshot`.
  - Invariante Zero-Amnesia: novo endereço utilizado no checkout é salvo automaticamente em `user_addresses`.
  - Barreira de dívida ativa no CPF (Invariante B.24).
- **Interface UI:**
  - `src/routes/_store.checkout.tsx`: Fluxo progressivo em 3 etapas (Identificação $\to$ Entrega $\to$ Pagamento) com prevenção de perda de dados no reload.

---

### MICROFASE 7: Pagamentos & Webhooks de Gateway
- **Status:** Planejada
- **Tabelas Envolvidas:** `payment_transactions`, `orders`, `audit_logs`
- **Contratos BFF:** `src/services/payment.functions.ts`:
  - `initiatePaymentTransaction`, `handlePaymentWebhook`
- **Regras Mandatórias:**
  - Idempotência server-side com chave `order_id + payment_method + attempt_number`.
  - Webhook seguro validando assinatura HMAC antes de alterar status do pedido.
  - Transição de estados finitos auditada em `audit_logs`.
- **Interface UI:**
  - Modal Pix com QR Code copiável, contador regressivo e auto-detecção de liquidação em tempo real sem refresh manual.

---

### MICROFASE 8: Pedidos & Gestão no Workspace
- **Status:** Planejada
- **Tabelas Envolvidas:** `orders`, `order_timeline_events`, `order_dispatches`
- **Contratos BFF:** `src/services/order.functions.ts`:
  - `listOrders`, `getOrderById`, `updateOrderStatus`, `assignDriverToOrder`
- **Regras Mandatórias:**
  - Máquina de estados: `pending` $\to$ `confirmed` $\to$ `preparing` $\to$ `dispatched` $\to$ `delivered`.
  - Proibido pular estados operacionais sem justificativa registrada.
  - Disparo de eventos na timeline para consulta pelo cliente.
- **Interface UI:**
  - Kanban e lista operacional no Workspace com filtros por status e badges visuais sem prolixidade.

---

### MICROFASE 9: Logística, Frete & Áreas de Entrega
- **Status:** Planejada
- **Tabelas Envolvidas:** `shipping_rates`, `delivery_zones`, `stores`
- **Contratos BFF:** `src/services/shipping.functions.ts`:
  - `calculateShipping`, `saveDeliveryZones`
- **Regras Mandatórias:**
  - Cálculo server-side baseado em polígonos/raios de entrega ou faixas de CEP.
  - Proibição de taxa de frete originada pelo cliente sem validação no banco.
- **Interface UI:**
  - Editor de taxas de entrega no Workspace com mapa ou seleção por bairros.

---

### MICROFASE 10: Clientes & CRM do Lojista
- **Status:** Planejada
- **Tabelas Envolvidas:** `orders`, `profiles`, `customer_notes`
- **Contratos BFF:** `src/services/crm.functions.ts`:
  - `listStoreCustomers`, `getCustomerProfile`
- **Regras Mandatórias:**
  - Dados derivados estritamente de pedidos e cadastros reais da loja.
  - Isolamento multi-tenant estrito: lojistas não têm visibilidade de compras de clientes em outras lojas.
- **Interface UI:**
  - Painel de clientes com ticket médio, frequência e canal de contato WhatsApp direto.

---

### MICROFASE 11: Painel Financeiro & Ledger
- **Status:** Planejada
- **Tabelas Envolvidas:** `store_token_wallets`, `financial_ledger`, `bank_accounts`
- **Contratos BFF:** `src/services/finance.functions.ts`:
  - `getStoreFinancialOverview`, `requestPayout`
- **Regras Mandatórias:**
  - Preservação da integridade matemática: `Saldo = SUM(Entradas) - SUM(Saídas)`.
  - Separação estrita entre saldo disponível e saldo a liquidar (D+30).
- **Interface UI:**
  - Cockpit financeiro com extrato paginado e demonstrativo de taxas Waesy.

---

### MICROFASE 12: Equipe & Permissões RBAC
- **Status:** Planejada
- **Tabelas Envolvidas:** `workspace_members`, `profiles`, `invitations`
- **Contratos BFF:** `src/services/team.functions.ts`:
  - `inviteTeamMember`, `updateMemberRole`, `removeMember`
- **Regras Mandatórias:**
  - Suporte aos papéis: `owner`, `admin`, `manager`, `seller`, `finance`, `stock`, `content`, `support`.
  - Bloqueio de auto-remoção do último `owner` da loja.
- **Interface UI:**
  - Lista de colaboradores com badges de função e modal de convite por e-mail.

---

### MICROFASE 13: Configurações da Loja & Horários
- **Status:** Planejada
- **Tabelas Envolvidas:** `stores`
- **Contratos BFF:** `src/services/store.functions.ts`:
  - `getStoreSettings`, `saveStoreSettings`, `saveWorkingHours`
- **Regras Mandatórias:**
  - Persistência estruturada em `stores.business_hours` (dias, turnos e intervalos).
  - Cálculo de status aberto/fechado respeitando fuso horário local.
- **Interface UI:**
  - Editor visual de horários em `workspace.configuracoes.loja.tsx`.

---

### MICROFASE 14: Vitrine Pública da Loja
- **Status:** Planejada
- **Tabelas Envolvidas:** `stores`, `categories`, `products`, `classifieds`
- **Contratos BFF:** `src/services/catalog.functions.ts`:
  - `getStorePublicProfile`
- **Regras Mandatórias:**
  - Carregamento SSR otimizado via slug canônico (`_store.loja.$slug.tsx`).
  - Hero com dados reais da loja (endereço sanitizado, telefone, logo, banner).
  - Trifurcação de layout conforme categoria (Invariante B.32).
- **Interface UI:**
  - Vitrine pública com catálogo filtrável por abas e busca em tempo real.

---

### MICROFASE 15: Módulo de Mobilidade (Waesy Go)
- **Status:** Planejada
- **Tabelas Envolvidas:** `mobility_requests`, `customer_debt_ledger`, `courier_profiles`
- **Contratos BFF:** `src/services/mobility.functions.ts`:
  - `calculateCategorizedMobilityOptions`, `requestRideOrDelivery`
- **Regras Mandatórias:**
  - Taxa fixa de R$ 0,99 por corrida (Invariante B.23).
  - Tolerância máxima de 3 minutos de espera pelo passageiro (Invariante B.24).
  - Cálculo de tarifa exclusivamente server-side via telemetria.
- **Interface UI:**
  - Console do cliente em 4 abas (`_store.conta.mobilidade.tsx`) com tracking e recibo fiscal.

---

### MICROFASE 16: Módulo de Turismo & Viagens (Travel OS)
- **Status:** Planejada
- **Tabelas Envolvidas:** `tourism_trips`, `travel_quotes`, `travel_rooming_allocations`, `travel_operator_commissions`
- **Contratos BFF:** `src/services/tourism.functions.ts`:
  - `requestTravelQuote`, `saveTourRoomingAllocation`, `createOperatorCommission`
- **Regras Mandatórias:**
  - Protocolo determinístico (`COT-YYYY-XXXXX`).
  - Alocação normalizada de passageiros em quartos (single, double, triple).
  - Controle de comissões sob regra D+30 e reacomodações ANAC 400.
- **Interface UI:**
  - Kanban de cotações no workspace e portal do viajante com dossiê completo.

---

### MICROFASE 17: Pós-Venda & Devoluções (RMA)
- **Status:** Planejada
- **Tabelas Envolvidas:** `rma_cases`, `rma_messages`, `rma_attachments`
- **Contratos BFF:** `src/services/rma.functions.ts`:
  - `createRmaCase`, `updateRmaStatus`, `sendRmaMessage`
- **Regras Mandatórias:**
  - Upload seguro de fotos em bucket de storage isolado com RLS.
  - Histórico de mensagens imutável com registro de remetente (cliente vs loja).
- **Interface UI:**
  - Central de pós-venda no Workspace e painel do cliente em `/conta/pedidos`.

---

### MICROFASE 18: Governança, Audit Logs & Telemetria
- **Status:** Planejada
- **Tabelas Envolvidas:** `audit_logs`, `system_errors`, `marketplace_surfaces`
- **Contratos BFF:** `src/services/master.functions.ts`:
  - `recordAuditLog`, `listAuditLogs`
- **Regras Mandatórias:**
  - Sanitização estrita de dados sensíveis (PII, senhas, tokens de pagamento).
  - Registro de todas as mutações administrativas no Admin Master.
- **Interface UI:**
  - Visualizador de logs com filtros por ator, entidade e data.

---

## 5. Roteiro Operacional de Execução Sequencial

1. **Cada microfase constitui uma entrega atômica e autônoma:**
   `[Schema / Migration] ↔ [BFF / Server Function] ↔ [Schemas Zod] ↔ [TanStack Route / UI Bidirecional] ↔ [Testes Vitest] ↔ [Design Lint]`
2. **Ciclo Fechado Obrigatório:**
   - Reproduzir o cenário ou gap via teste automatizado.
   - Implementar código exclusivamente nos arquivos do módulo.
   - Validar testes verdes (`npm test`).
   - Validar catraca de design (`npm run lint:design` com Exit Code 0).
   - Gerar commit semântico rastreável.
   - Apresentar evidências e solicitar aprovação antes de iniciar a microfase seguinte.
