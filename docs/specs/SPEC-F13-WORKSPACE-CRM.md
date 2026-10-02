# SPEC-F13 — Workspace: CRM de Clientes Real (Lista Paginada, Detalhe e LTV Calculado)

## 1. Identificação e Metadados
- **ID:** SPEC-F13-WORKSPACE-CRM
- **Fase:** F13 (Plano de Estabilização E2E — Pilar 4: Workspace Pro)
- **Status:** Aprovada
- **Data:** 2026-10-02
- **Autor:** BigTech Engineering & Architecture Board (Antigravity Agent)
- **SSOT Relacionados:** `AGENTS.md`, `DESIGN.md`, `DESIGN-LINT.md`, `PROXIMOS_PLANOS_EXECUCAO.md`, `SPEC-F11-WORKSPACE-ORDERS-MANAGEMENT.md`.

---

## 2. Contexto e Escopo Delimitado
O módulo de CRM de Clientes no Workspace Pro (`src/routes/workspace.crm.tsx` e `src/routes/workspace.clientes.index.tsx`) consolida a carteira de clientes B2C e B2B de lojas credenciadas.
Esta especificação ratifica e estabiliza os contratos do CRM com dados reais do Supabase (M01: Zero Mocks):
1. **Listagem Paginada (`listCustomersFn` / `listCustomers`):** Busca keyset em `customers_crm` com fallback em `workspace_members`, filtros por status, canal e texto, e cálculo servidor do Lifetime Value (LTV) em centavos inteiros via agregação de pedidos pagos em `orders`.
2. **Visão 360 do Cliente (`getCustomerDetailFn` / `getCustomer360`):** Detalhe individual do cliente, histórico completo de pedidos (`orders`), documentos (`customer_documents`) e linha do tempo de eventos.
3. **Isolamento de Loja (`assertStoreAccess`):** Proibição estrita de vazamento de contatos, dados de compras e LTV entre lojistas concorrentes.

---

## 3. Requisitos Funcionais em Sintaxe EARS

### 3.1 Requisitos Ubíquos (Ubiquitous Requirements)
- **EARS-U01:** O sistema SHALL calcular o LTV (`ltvCents`) de cada cliente somando exclusivamente pedidos com status transacional concluído (`paid`, `processing`, `ready_for_pickup`, `shipped`, `delivered`, `completed`) da tabela `orders`.
- **EARS-U02:** O sistema SHALL exigir que o operador pertença a papéis autorizados de equipe (`owner`, `admin`, `manager`, `seller`, `support`) via `assertStoreAccess` antes de expor qualquer dado cadastral.
- **EARS-U03:** O sistema SHALL consumir dados nativos de `customers_crm`, `orders` e `customer_documents` no Supabase, proibindo dados sintéticos ou clientes fictícios (M01: Zero Mocks).

### 3.2 Requisitos Orientados a Eventos (Event-driven Requirements)
- **EARS-E01:** QUANDO o operador buscar por termo textual em `listCustomersFn`, O sistema SHALL filtrar simultaneamente por `full_name`, `email`, `phone`, `document` e `legal_name` via `or(ilike)`.
- **EARS-E02:** QUANDO o detalhe 360 do cliente for requisitado via `getCustomerDetailFn`, O sistema SHALL resolver o cliente e associar todos os seus pedidos ordenados por `created_at DESC`.

### 3.3 Requisitos de Estado (State-driven Requirements)
- **EARS-S01:** ENQUANTO um cliente possuir documentos com data de expiração (`expires_at`) anterior à data atual, O sistema SHALL sinalizar `docAlerts.expired > 0`.
- **EARS-S02:** ENQUANTO um cliente não possuir pedidos registrados em `orders`, O sistema SHALL computar `orderCount = 0` e `ltvCents = 0`.

### 3.4 Tratamento de Comportamentos Indesejados (Unwanted Behaviors)
- **EARS-W01:** SE um operador requisitar dados de um cliente vinculado a outra loja, ENTÃO O sistema SHALL lançar erro de autorização ("Cliente não encontrado na base").
- **EARS-W02:** SE a consulta não encontrar clientes nem em `customers_crm` nem em `workspace_members`, ENTÃO O sistema SHALL retornar lista vazia `[]` para que a UI renderize o `<EmptyState />` honesto.

---

## 4. Definition of Done & Critérios de Aceite
- [ ] Exportação canônica de `listCustomersFn` e `getCustomerDetailFn` em `src/services/crm.functions.ts`.
- [ ] Suíte de testes unitários verdes em `src/services/crm.functions.test.ts`.
- [ ] 0 violações de design lint na catraca (`node scripts/design-lint.mjs --ratchet`).
- [ ] 0 erros de compilação TypeScript (`npm run typecheck`).
- [ ] Build de produção gerando worker Cloudflare Pages (`npm run build`).
- [ ] Registro canônico em `docs/design/DECISIONS.md` (`DEC-139`).
