# SPEC-F18: Suporte Interno — Módulo de Tickets com SLA

## 1. Contexto e Escopo
A Fase F18 consolida o módulo de chamados internos de suporte técnico no Workspace Pro.
O sistema provê abertura de chamados estruturados por lojistas e operadores com categorias de atendimento, prioridades calibradas, cálculo determinístico de SLA e histórico encadeado de mensagens, sem dados simulados (M01: Zero Mocks).

## 2. Requisitos EARS

### [REQ-F18-01] Listagem e Filtro de Chamados com SLA
- **Quando** o operador do Workspace consultar os chamados de suporte da sua loja,
- **o sistema DEVE** retornar os tickets reais da tabela `operator_support_tickets` através de `listSupportTicketsFn`, permitindo filtragem por `status` ("all", "open", "in_progress", "resolved", "closed") e ordenação por atualização recente.

### [REQ-F18-02] Abertura de Ticket com Categorização e SLA Calibrado
- **Quando** o operador abrir um novo chamado em `createSupportTicketFn`,
- **o sistema DEVE** validar os campos obrigatórios via Zod (`store_id`, `subject` >= 4 chars, `category`, `initial_message` >= 5 chars), derivar código único identificador (`ticket_code`), calcular a data limite de SLA (`sla_due_at`) baseada nos minutos de SLA (`sla_minutes`), persistir o chamado e criar a primeira mensagem na tabela `operator_support_messages`.

### [REQ-F18-03] Detalhe de Chamado e Thread de Mensagens
- **Quando** o operador visualizar um chamado em `getSupportTicketDetailsFn`,
- **o sistema DEVE** validar o acesso à loja (`assertStoreAccess`), retornar os metadados do chamado e a coleção ordenada de mensagens da thread (`operator_support_messages`).

### [REQ-F18-04] Envio de Resposta e Atualização de Status
- **Quando** o operador enviar uma nova mensagem via `addSupportTicketMessageFn` ou atualizar o status via `updateSupportTicketStatusFn`,
- **o sistema DEVE** validar autorização, persistir a nova mensagem, atualizar o carimbo `updated_at` do ticket pai e registrar a transição de estado.

## 3. Invariantes e Regras Pétreas
- **Zero Mocks (M01):** Todos os dados residem estritamente em `operator_support_tickets` e `operator_support_messages`.
- **Isolamento de Tenant:** Um operador só pode acessar e responder chamados pertencentes à sua `store_id`, a menos que detenha a role `platform_admin`.
- **Prevenção de Mensagens Vazias:** Respostas devem possuir no mínimo 2 caracteres válidos.
- **Qualidade e Design Lint:** 0 erros no typecheck, 0 regressões na catraca do design lint, 0 falhas nos testes unitários e build de produção aprovado.

## 4. Critérios de Aceite
- [ ] `src/services/support-tickets.functions.ts` exporta `listSupportTicketsFn`, `getSupportTicketDetailsFn`, `createSupportTicketFn`, `addSupportTicketMessageFn`, `updateSupportTicketStatusFn`.
- [ ] Suíte de testes `src/services/support-tickets.functions.test.ts` cobrindo validações de schema, cálculo de SLA e regras de permissão.
- [ ] 4 Gates de qualidade aprovados: vitest, design-lint --ratchet, typecheck, build.
