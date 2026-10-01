# KILLLIST.md — Matriz de Desativação, Adaptação e Migração Segura (P03)

**Data de Ratificação:** 2026-10-01  
**Escopo:** Invariantes M01, M03, M10 e Check C26.  
**Regra Fundamental:** NÃO EXCLUIR NADA PRECIPITADAMENTE. Esta matriz documenta a ordem cirúrgica de migração de imports, transição de tabelas coluna a coluna e redirecionamento de rotas.

---

## 1. Classificação das Peças Redundantes

### CLASSE A: O QUE MORRE (Código Morto / Zero Consumidores)
Arquivos que já não possuem importadores ativos e cuja remoção tem impacto zero no bundle:

| Arquivo Alvo | Dono Canônico Substituto | Consumidores Atuais | Ação Programada |
|---|---|---|---|
| `src/services/crm.ts` | `src/services/crm.functions.ts` | 0 arquivos | Remoção segura após backup na quarentena. |
| `src/services/quotes.ts` | `src/services/tourism.functions.ts` | 0 arquivos | Remoção segura (apenas reexportava 1 linha). |

---

### CLASSE B: O QUE MIGRA (Redirecionamento de Imports)
Arquivos que são importados mas cujas chamadas devem ser transpostas para o serviço canônico:

| Arquivo Alvo | Dono Canônico Substituto | Consumidores Mapeados | Plano de Transposição de Imports |
|---|---|---|---|
| `src/services/ticket.functions.ts` | `src/services/support-tickets.functions.ts` | `src/routes/_store.conta.suporte.tsx:13` | Incorporar as funções cliente (`listCustomerTickets`, `createCustomerTicket`, `sendTicketMessage`) em `support-tickets.functions.ts` e alterar o import em `_store.conta.suporte.tsx`. |
| `src/services/boarding.ts` | `src/services/travel-departures.functions.ts` | `src/types/infotravel.ts`<br>`src/services/infotravel.ts` | Redirecionar os tipos `BoardingCard` e `ChecklistItem` para `@/types/travel-departures.ts`. |

---

### CLASSE C: O QUE VIRA ADAPTADOR TEMPORÁRIO (UI / Componentes)
Componentes que duplicavam estrutura visual e que serão convertidos em cascas finas (adapters) que consomem a primitiva canônica:

| Componente Alvo | Primitiva Canônica | Linhas Atuais | Linhas após Adapter | Benefício Visual e Arquitetural |
|---|---|---|---|---|
| `src/components/tasks/task-kanban.tsx` | `src/components/workspace/kanban/full-viewport-kanban.tsx` | 158 linhas | ~45 linhas | Elimina 110 linhas de código duplicado de colunas, adota layout 100dvh e contadores tabulares padrão. |
| `src/components/eventos/evento-kanban.tsx` | `src/components/workspace/kanban/full-viewport-kanban.tsx` | 400 linhas | ~90 linhas | Remove renderização manual de colunas mantendo a regra de negócios de `events.functions.ts`. |
| `src/services/proposals.ts` | `src/services/travel-proposal.functions.ts` | 312 linhas | ~20 linhas | Manter apenas re-exportações estritas de tipos para o `ProposalStudio` até a unificação dos templates na Fase 5. |

---

## 2. Plano de Migração de Dados Coluna a Coluna (Zero Perda de Dados)

### Migração M-01: Suporte ao Cliente (`ticket.functions.ts` → `support-tickets.functions.ts`)
Ambos os serviços já utilizam a tabela canônica `support_tickets`. Não é necessária migração DDL de colunas:
- `support_tickets.id` ↔ `id` (UUID estável)
- `support_tickets.customer_id` ↔ `identity.id` (Profile UUID)
- `support_tickets.store_id` ↔ `identity.store_id` (Multi-tenant isolation)
- `support_tickets.subject` ↔ `subject`
- `support_tickets.status` ↔ `status` (aberto, em_atendimento, resolvido, fechado)
- `support_tickets.context_type` ↔ `context_type` (order, rma, general)

### Migração M-02: Kanban de Tarefas (`workspace_tasks` → `workspace_kanban_stages`)
Os estágios do kanban de tarefas mapeiam diretamente para os estágios configuráveis:
- `workspace_tasks.status` = `todo` ↔ `workspace_kanban_stages.stage_key` = `todo`
- `workspace_tasks.status` = `in_progress` ↔ `workspace_kanban_stages.stage_key` = `in_progress`
- `workspace_tasks.status` = `review` ↔ `workspace_kanban_stages.stage_key` = `review`
- `workspace_tasks.status` = `done` ↔ `workspace_kanban_stages.stage_key` = `done`

---

## 3. Ordem de Execução Cirúrgica por Etapas

1. **Etapa 1:** Atualização de imports em `src/routes/_store.conta.suporte.tsx` para `support-tickets.functions.ts`.
2. **Etapa 2:** Conversão de `src/components/tasks/task-kanban.tsx` em adapter de `FullViewportKanban`.
3. **Etapa 3:** Conversão de `src/components/eventos/evento-kanban.tsx` em adapter de `FullViewportKanban`.
4. **Etapa 4:** Remoção dos arquivos órfãos Classe A (`crm.ts`, `quotes.ts`) após homologação.
5. **Etapa 5:** Execução da suíte de testes e typecheck com zero regressões.
