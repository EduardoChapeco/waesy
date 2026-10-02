# SPEC-F11: Workspace — Gestão de Pedidos Real (CRUD Completo e Status)

## 1. Metadados e Controle Normativo
- **Fase:** F11 (Workspace Pro: Gestão de Pedidos Real).
- **Plano:** Plano Mestre de Estabilização e Desentrelaçamento dos 4 Pilares.
- **Autoridade:** BigTech Executive Board & Red Team.
- **Invariantes:** M01 (Zero Mocks), M02 (SSR / Hidratação Limpa), M03 (Auditabilidade Transacional), M10 (Isolamento Multi-Tenant estrito via `assertStoreAccess`), WCAG 2.2 AA.

---

## 2. Requisitos em Sintaxe EARS

### [REQ-F11-01] Listagem e Paginação Keyset de Pedidos Reais
- **EARS (Quando acionado):** QUANDO o operador solicitar a lista de pedidos (`listOrdersFn`), O SISTEMA DEVE consultar a tabela `orders` filtrando estritamente pelo `store_id` da loja ativa, ordenando por `created_at DESC`, suportando filtro opcional por `status` e paginação keyset via `cursor`.

### [REQ-F11-02] Detalhe Profundo do Pedido
- **EARS (Quando acionado):** QUANDO o operador solicitar os detalhes de um pedido (`getOrderDetailFn`), O SISTEMA DEVE retornar o pedido completo com seus itens associados (`order_items`), cliente (`customer_snapshot`), comprovantes de entrega e histórico de transição.

### [REQ-F11-03] Transição Segura e Auditada de Status
- **EARS (Quando acionado):** QUANDO o operador alterar o status do pedido (`updateOrderStatusFn`), O SISTEMA DEVE validar se a transição é permitida na máquina de estados, persistir em `orders`, atualizar timestamps correspondentes (`paid_at`, `prep_started_at`, `shipped_at`, `delivered_at`) e registrar a operação para auditabilidade.

### [REQ-F11-04] Isolamento Multi-Tenant Estrito
- **EARS (Ubíquo):** Toda operação de listagem, consulta e mutação DEVE validar o contexto de autenticação do operador e sua autorização na loja alvo via `assertStoreAccess`.

---

## 3. Critérios de Aceite e Métricas
1. `src/services/orders.functions.ts` exporta `listOrdersFn`, `getOrderDetailFn`, `updateOrderStatusFn`.
2. Suíte de testes `src/services/orders.functions.test.ts` cobrindo listagem, detalhe, validação de transição e isolamento de tenant.
3. Compatibilidade e paridade com `workspace.pedidos.index.tsx` e `workspace.pedidos.$id.tsx`.
4. `node scripts/design-lint.mjs --ratchet` Exit Code 0 (0 regressões visuais).
5. `npm run typecheck` Exit Code 0.
