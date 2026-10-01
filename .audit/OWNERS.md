# OWNERS.md — Mapa Forense de Donos por Capacidade (Auditoria AST/Grep P02)

**Data:** 2026-10-01  
**Escopo:** Invariante M01 (Dono único por capacidade; duas implementações = falha crítica) e Check C26.  
**Método:** Varredura exaustiva por AST e busca sintática em `src/routes/`, `src/services/`, `src/components/` e `supabase/migrations/`.

---

## 1. Mapeamento das 11 Capacidades Fundamentais

### 1. KANBAN (Quadros Operacionais)
- **Implementações Encontradas:**
  1. `src/components/workspace/kanban/full-viewport-kanban.tsx` (90 linhas) — Primitiva canônica 100dvh, flexbox horizontal com scroll suave, slots de header, footer, empty state e contadores tabulares.
  2. `src/components/tasks/task-kanban.tsx` (158 linhas) — Implementação paralela com DOM de coluna duplicado (`w-[300px] sm:w-[320px]`, `backdrop-blur-xs`, `shadow-2xs`).
  3. `src/components/eventos/evento-kanban.tsx` (400 linhas) — Implementação específica de eventos acoplada ao serviço `events.functions.ts`.
  4. `src/routes/workspace.turismo.embarques.tsx` (1.009 linhas) — Pipeline de embarques com estágios sequenciais D-30 a D+1.
- **Tabelas de Banco Relacionadas:** `workspace_kanban_stages`, `event_kanban_boards`, `event_tasks`, `travel_departures`.
- **Dono Canônico Eleito:** `src/components/workspace/kanban/full-viewport-kanban.tsx`.
- **Justificativa:** Primitiva pura desacoplada de dados de domínio, aceitando genéricos `<T>`, com suporte a `columnWidthClass`, design tokens oficiais e comportamento responsivo 100dvh.
- **Ação de Migração (P03):** Refatorar `task-kanban.tsx` e `evento-kanban.tsx` para atuarem como adaptadores tipados sobre `FullViewportKanban`.

---

### 2. CRM & GESTÃO DE LEADS
- **Implementações Encontradas:**
  1. `src/services/crm.functions.ts` (350 linhas) — BFF soberano com Server Functions (`listLeads`, `createLead`, `updateLeadStage`, `listCustomers`), validação Zod e RLS.
  2. `src/services/crm.ts` (72 linhas) — Tipos e interfaces redundantes sem métodos de backend ativos e sem consumidores no código.
  3. `src/routes/workspace.crm.tsx` (580 linhas) — Superfície principal de CRM no workspace.
  4. `src/routes/m.lead.$leadId.tsx` (210 linhas) — Visualização mobile/externa de lead.
- **Tabelas de Banco Relacionadas:** `crm_leads`, `crm_stages`, `customers`, `customer_interactions`.
- **Dono Canônico Eleito:** `src/services/crm.functions.ts` + `src/routes/workspace.crm.tsx`.
- **Justificativa:** Camada BFF segura com validação de identidade e isolamento por workspace; `src/services/crm.ts` é órfão e deve ser eliminado na Kill List.
- **Ação de Migração (P03):** Marcar `src/services/crm.ts` para exclusão sem impacto.

---

### 3. ORÇAMENTOS E COTAÇÕES
- **Implementações Encontradas:**
  1. `src/services/travel-proposal.functions.ts` (450 linhas) — Motor multicenário, cálculo de markup, margens e geração de links de proposta.
  2. `src/services/quotes.functions.ts` (120 linhas) — Funções de cotação turística legadas.
  3. `src/services/quotes.ts` (7 linhas) — Apenas reexporta `tourism.functions.ts`.
  4. `src/routes/workspace.turismo.cotacoes.tsx` (1.009 linhas) — Interface de criação e triagem de cotações com OCR e IA.
- **Tabelas de Banco Relacionadas:** `travel_quotes`, `travel_proposals`, `travel_proposal_items`.
- **Dono Canônico Eleito:** `src/services/travel-proposal.functions.ts` + `src/routes/workspace.turismo.cotacoes.tsx`.
- **Justificativa:** `travel-proposal.functions.ts` engloba tanto a cotação inicial quanto o versionamento de propostas complexas.
- **Ação de Migração (P03):** Redirecionar consumidores de `quotes.functions.ts` para o motor unificado e desativar `quotes.ts`.

---

### 4. PROPOSTAS COMERCIAIS
- **Implementações Encontradas:**
  1. `src/services/travel-proposal.functions.ts` (450 linhas) — Motor oficial com hash de integridade e aceite digital.
  2. `src/services/proposals.ts` (312 linhas) — Arquivo que reexporta `travel-proposal.functions.ts`, mas mantém declarações locais de tipos (`Flight`, `Hotel`, `Tour`).
  3. `src/routes/workspace.turismo.propostas.index.tsx` (378 linhas) — Catálogo de propostas emitidas.
  4. `src/routes/workspace.turismo.propostas.$id.tsx` (620 linhas) — Tela pública do passageiro para aceite e assinatura.
- **Tabelas de Banco Relacionadas:** `travel_proposals`, `travel_proposal_versions`, `proposal_signatures`.
- **Dono Canônico Eleito:** `src/services/travel-proposal.functions.ts`.
- **Justificativa:** Concentra regras transacionais de expiração, duplicação e conversão de proposta em viagem.
- **Ação de Migração (P03):** Mover as tipagens de `proposals.ts` para `@/types/travel-proposals.ts` e transformar `proposals.ts` em shim transitório.

---

### 5. RESERVAS
- **Implementações Encontradas:**
  1. `src/routes/workspace.reservas.tsx` (910 linhas) — Interface exclusiva do nicho gastronômico (salão, mesas, comandas, floor plan).
  2. `src/services/reservations.functions.ts` (280 linhas) — Gestão de mesas e reservas de salão.
  3. `src/components/booking/*` (450 linhas) — Componentes de reserva turística e hospedagem.
  4. `src/services/travel-lifecycle.functions.ts` (180 linhas) — Função `convertProposalToTrip` que cria viagens a partir de propostas aceitas.
- **Tabelas de Banco Relacionadas:** `store_reservations`, `restaurant_tables`, `travel_bookings`, `trips`.
- **Dono Canônico Eleito:**
  - Gastronomia/Restaurante: `src/routes/workspace.reservas.tsx` + `src/services/reservations.functions.ts`.
  - Turismo/Hotelaria: Rota canônica nova `src/routes/workspace.turismo.reservas.tsx` + `src/services/travel-booking.functions.ts`.
- **Justificativa:** A rota `/workspace/reservas` atual foi acoplada ao modelo de restaurante. O nicho de turismo necessita de uma superfície soberana para reservas de aéreo e hotelaria.
- **Ação de Migração (P03):** Criar a rota especializada `workspace.turismo.reservas` e isolar o domínio gastronômico.

---

### 6. VIAGENS (ITINERÁRIOS & DIRETÓRIO)
- **Implementações Encontradas:**
  1. `src/routes/viajante.viagem.$id.tsx` (254 linhas) — Portal do passageiro 360 (atualmente com dados estáticos a sanear).
  2. `src/routes/workspace.turismo.viagens.tsx` / `workspace.turismo.viagens.$id.tsx` — Painel operacional de viagens emitidas.
  3. `src/services/travel-catalog.functions.ts` (410 linhas) — Catálogo de destinos, pacotes e itinerários.
- **Tabelas de Banco Relacionadas:** `travel_trips`, `travel_destinations`, `travel_itineraries`.
- **Dono Canônico Eleito:** `src/services/travel-catalog.functions.ts` + `src/routes/workspace.turismo.viagens.tsx`.
- **Justificativa:** Modelo consolidado com suporte a múltiplos destinos, fotos de alta resolução e controle de vagas.
- **Ação de Migração (P03):** Eliminar hardcodes em `viajante.viagem.$id.tsx` conectando-o diretamente ao serviço.

---

### 7. EMBARQUES & OPERAÇÃO DE VOO
- **Implementações Encontradas:**
  1. `src/routes/workspace.turismo.embarques.tsx` (1.009 linhas) — Kanban de embarques com estágios D-30 a D+1 e checklist.
  2. `src/components/tourism/boarding/CardDetailPanel.tsx` (480 linhas) — Drawer canônico de passageiro e bilhete.
  3. `src/services/travel-departures.functions.ts` (390 linhas) — Lógica de cálculo de estágios, parsing de bilhetes e uploads de documentos.
  4. `src/services/boarding.ts` (52 linhas) — Reexportador legado.
- **Tabelas de Banco Relacionadas:** `travel_departures`, `travel_departure_checklists`, `travel_boarding_documents`.
- **Dono Canônico Eleito:** `src/services/travel-departures.functions.ts` + `src/routes/workspace.turismo.embarques.tsx`.
- **Justificativa:** Módulo 100% aderente ao fluxo operacional de agências de turismo.
- **Ação de Migração (P03):** Desativar `boarding.ts` após redirecionar eventuais imports residuais.

---

### 8. CONTRATOS & DOCUMENTOS JURÍDICOS
- **Implementações Encontradas:**
  1. `src/services/contracts.functions.ts` (380 linhas) — Motor geral de minutas, hashing SHA-256 e canvas de assinatura digital.
  2. `src/services/travel-contract.functions.ts` (260 linhas) — Especialização turística com injeção de passageiros e roteiro.
  3. `src/routes/workspace.contratos.index.tsx` (290 linhas) — Gestor geral de contratos.
  4. `src/routes/workspace.turismo.contratos.index.tsx` (295 linhas) — Gestor turístico de contratos de viagem.
- **Tabelas de Banco Relacionadas:** `contracts`, `contract_signatures`, `contract_templates`, `travel_contracts`.
- **Dono Canônico Eleito:** `src/services/contracts.functions.ts` (Motor) com `travel-contract.functions.ts` como extensão de nicho.
- **Justificativa:** Toda assinatura digital e integridade de arquivo passam pelo mesmo hash criptográfico.

---

### 9. FINANCEIRO & OBRIGAÇÕES
- **Implementações Encontradas:**
  1. `src/services/financial-obligations.functions.ts` (339 linhas) — Gestão de contas a pagar/receber, conciliação e RBAC (`requireFinance`).
  2. `src/routes/workspace.financeiro.caixa.index.tsx` (450 linhas) — Livro caixa operacional.
- **Tabelas de Banco Relacionadas:** `financial_obligations`, `cash_shifts`, `cash_movements`.
- **Dono Canônico Eleito:** `src/services/financial-obligations.functions.ts` + `workspace.financeiro.caixa.index.tsx`.
- **Justificativa:** Conformidade com padrões de auditoria contábil e isolamento estrito por loja.

---

### 10. SUPORTE & ATENDIMENTO AO CLIENTE
- **Implementações Encontradas:**
  1. `src/services/support-tickets.functions.ts` (310 linhas) — Central de atendimento do workspace com SLA e prioridades.
  2. `src/services/ticket.functions.ts` (242 linhas) — Portal do cliente para abertura de chamados.
  3. `src/routes/workspace.suporte.tsx` (410 linhas) — Painel do operador de suporte.
  4. `src/routes/_store.conta.suporte.tsx` (380 linhas) — Painel do consumidor final.
- **Tabelas de Banco Relacionadas:** `support_tickets`, `ticket_messages`.
- **Dono Canônico Eleito:** `src/services/support-tickets.functions.ts` (BFF unificado unindo visão cliente e operador).
- **Justificativa:** As duas pontas gravam na mesma tabela `support_tickets`. Ter duas Server Functions separadas gera assimetria de tipos.
- **Ação de Migração (P03):** Unificar as Server Functions de `ticket.functions.ts` dentro de `support-tickets.functions.ts`.

---

### 11. TAREFAS OPERACIONAIS
- **Implementações Encontradas:**
  1. `src/services/tasks.functions.ts` (290 linhas) — BFF de tarefas com atribuição a membros e estados.
  2. `src/routes/workspace.tarefas.tsx` (520 linhas) — Interface de tarefas com visualização em lista, calendário e kanban.
- **Tabelas de Banco Relacionadas:** `workspace_tasks`, `task_checklists`.
- **Dono Canônico Eleito:** `src/services/tasks.functions.ts` + `src/routes/workspace.tarefas.tsx`.
- **Justificativa:** Módulo unificado e estável, com zero duplicatas de backend.

---

## 2. Resumo de Donos e Resolução do Check C26

| Capacidade | Dono Canônico Soberano | Itens na Kill List / Suprimidos |
|---|---|---|
| **Kanban** | `src/components/workspace/kanban/full-viewport-kanban.tsx` | `task-kanban.tsx`, `evento-kanban.tsx` (viram adaptadores) |
| **CRM** | `src/services/crm.functions.ts` | `src/services/crm.ts` (desativação direta) |
| **Orçamentos** | `src/services/travel-proposal.functions.ts` | `src/services/quotes.ts`, `quotes.functions.ts` |
| **Propostas** | `src/services/travel-proposal.functions.ts` | `src/services/proposals.ts` (vira shim de tipos) |
| **Reservas** | `src/services/reservations.functions.ts` (Geral) | Criação da bifurcação canônica de turismo |
| **Viagens** | `src/services/travel-catalog.functions.ts` | Saneamento dos hardcodes em `viajante.viagem.$id.tsx` |
| **Embarques** | `src/services/travel-departures.functions.ts` | `src/services/boarding.ts` (desativação) |
| **Contratos** | `src/services/contracts.functions.ts` | N/A (motor canônico unificado) |
| **Financeiro** | `src/services/financial-obligations.functions.ts` | N/A (motor canônico unificado) |
| **Suporte** | `src/services/support-tickets.functions.ts` | `src/services/ticket.functions.ts` (incorporação ao canônico) |
| **Tarefas** | `src/services/tasks.functions.ts` | N/A (motor canônico unificado) |
