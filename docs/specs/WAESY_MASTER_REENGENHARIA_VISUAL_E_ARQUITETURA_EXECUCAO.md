# Waesy — Guia Mestre de Reengenharia Visual, Arquitetura e Continuidade Operacional

> **Propósito do Documento:** Este documento é a Fonte Única da Verdade (SSOT) para transferir, replicar e continuar a execução da Reengenharia Visual Ultraminimalista, Arquitetura de Informação e Implementação Ponta a Ponta em qualquer máquina de desenvolvimento ou sessão de trabalho.

---

## 1. Missão e Filosofia de Design

### 1.1 Objetivo Central
Evoluir a plataforma Waesy de um ecossistema funcionalmente potente porém sobrecarregado visualmente para um **SaaS empresarial ultraminimalista, espaçoso, elegante e nativo** (inspirado nos benchmarks de referência: **Belasis, Avec, Trello, Linear e Notion**).

### 1.2 Princípios Canônicos Inegociáveis
1. **Single Sovereign Surface (Anti-Containeritis - DL-31):** Cada entidade, indicador (KPI) ou linha de tabela possui uma única casca soberana (`bg-card border border-border/60 rounded-2xl`). Fica terminantemente proibido aninhar cards dentro de cards ou acumular bordas e fundos cinzas sobrepostos.
2. **Silêncio Visual & Erradicação do "AI-Smell":**
   - Zero textos conversacionais que explicam a tela.
   - Zero frases motivacionais de boas-vindas.
   - Títulos concisos (≤ 4 palavras).
   - Ação primária única (`variant="default"` / `bg-primary`) por superfície.
3. **Ergonomia e Alvos de Toque (Regra B.26 & DL-14):**
   - Todo controle interativo móvel, cabeçalhos, botões de ação e tabs de topo operam no piso canônico de **44px** (`h-11 min-h-11`).
   - Todo elemento interativo possui anel de foco explícito (`focus-visible:ring-2 focus-visible:ring-ring`).
4. **Bifurcação Bidirecional (Desktop-Native vs Mobile-Native):**
   - **Desktop (≥ 840px):** Aplicação profissional, barra lateral discreta, área central ampla (`100vh - 0`), Kanbans full-page sem compressão, tabelas densas e legíveis.
   - **Mobile (< 640px):** Comportamento de app de smartphone real, bottom sheets de 100dvh para ações contextuais, preservação de ≥ 92% da largura para conteúdo útil, ações fixadas na thumb zone inferior.
   - Bifurcação em runtime via hook `useWindowSizeClass()` — zero duplicação oculta de nós no DOM.
5. **Preservação Funcional Absoluta (Zero Perda de Recursos):**
   - 100% das 446 rotas, tabelas, schemas e RPCs são mantidas. Nenhuma funcionalidade é ocultada ou simplificada. Telas anteriormente estáticas recebem implementação real de backend e contratos BFF.

---

## 2. O Que Já Foi Implementado e Verificado (Baseline Atual)

| Módulo / Camada | Implementação Concluída | Testes & Verificação |
| :--- | :--- | :--- |
| **Omni Builder Schema Cache Fix** | Migration `20261103080000_systemic_atomic_stock_and_cart_v7.sql` adicionando coluna `name` e trigger bidirecional com `title` em `experience_documents`. | Testes de integração de builder aprovados. |
| **Universal Idempotency Engine** | Migration `20261104090000_systemic_idempotency_and_order_state_machine.sql` criando tabela `processed_events`, RPCs `begin_idempotent_event`, `transition_order_status_atomic` ("Carimbou PAGO"), `record_cash_entry_atomic` (prevenção de sangria com saldo negativo) e `settle_order_payout_atomic`. | `universal-idempotency-and-state-machine.test.ts` (8/8 testes passando). |
| **Saneamento de Cores & Vitrines** | Normalização de `countdown-timer.tsx`, `flash-sale-hero.tsx`, `hero-carousel.tsx` e `banner-hero-carousel.tsx`, eliminando gradientes arbitrários, cores literais hex/RGB e elevando alvos de toque para 44px. | Catraca do Design Lint: 0 P0, redução de 37 violações (teto congelado em 694). |
| **Harmonização de Pedidos & KDS** | `workspace.pedidos.index.tsx` e `workspace.pedidos.gestor.tsx`: botões e tabs elevados para `h-11 min-h-11`, chips omnichannel táteis, cores semânticas (`success`, `warning`, `info`). | Validado via `design-lint --ratchet`. |
| **Primitivos Belasis (Marco M1)** | `kpi-metric-card.tsx` e `mini-sparkline.tsx` criados com casca única soberana e micro-gráficos limpos de tendência. | Testados e exportados em `src/components/workspace/`. |
| **Alternância Polimórfica (Marco M1)** | `UniversalViewManager`, `ViewModeSwitcher` e hook `useWorkspaceViewMode` criados em `src/components/workspace/view-modes/`. Suporte a Tabela, Kanban e Cards. | Coberto por testes unitários e E2E. |
| **Persistência de Visões (Marco M1)** | Migration `20270220030000_workspace_user_view_preferences.sql` e Server Functions BFF `workspace-view-preferences.functions.ts` com validação Zod estrita e RLS multi-tenant. | `workspace-view-preferences.test.ts` (15/15 testes passando). |
| **Harness Automatizado E2E (Trilha Dupla)** | 10 arquivos de teste cobrindo Tiers 1 a 4 em `tests/e2e/`, auditando rotas, tokens, segurança, alternância de views e mobile. | 145/145 testes passando (100% sucesso em 4,13s). |

---

## 3. Como Continuar em Outro Computador (Passo a Passo)

### 3.1 Clonagem e Sincronização do Repositório
```bash
# 1. Clonar ou atualizar o repositório
git clone https://github.com/EduardoChapeco/waesy.git
cd waesy

# 2. Obter a branch de trabalho atual
git fetch origin
git checkout fix/cms-navigation-and-builder-clarity
git pull origin fix/cms-navigation-and-builder-clarity

# 3. Instalar dependências (caso seja máquina virgem)
npm install
```

### 3.2 Executar os Gates de Verificação Mecânicos
Antes de iniciar qualquer nova alteração, certifique-se de que a baseline está 100% aprovada:

```bash
# A. Executar testes unitários de persistência e idempotência
cmd /c npx vitest run src/services/__tests__/workspace-view-preferences.test.ts
cmd /c npx vitest run src/services/__tests__/universal-idempotency-and-state-machine.test.ts

# B. Executar toda a suíte de testes E2E (145 testes)
cmd /c npx vitest run tests/

# C. Executar a catraca mecânica de Design Lint (deve sair com Exit Code 0 e zero regressões)
node scripts/design-lint.mjs --ratchet
```

---

## 4. Roadmap de Execução das Próximas Fases

```
  ┌───────────────────────────────────────────────────────────────────┐
  │                           MARCO M1 (CONCLUÍDO)                    │
  │ Fundação Visual, Tokens, Primitivos Belasis, Multi-View e BFF     │
  └─────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    ▼
  ┌───────────────────────────────────────────────────────────────────┐
  │                           MARCO M2 (EM ANDAMENTO)                 │
  │ Propagação da Alternância Multi-View nos Fluxos Centrais           │
  │ - Agenda / Agendamentos (`workspace.agenda.index.tsx`)            │
  │ - Clientes / CRM (`workspace.clientes.index.tsx`)                 │
  │ - Pedidos & Despacho (`workspace.pedidos.index.tsx`)              │
  │ - Tarefas & Projetos (`workspace.tarefas.tsx`)                    │
  └─────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    ▼
  ┌───────────────────────────────────────────────────────────────────┐
  │                           MARCO M3 (PLANEJADO)                    │
  │ Saneamento de Mocks & Conexão Real de Telas Estáticas (R3)        │
  │ - Vitrines dinâmicas e Hotpages (`marketplace_surfaces`)          │
  │ - Páginas Institucionais conectadas ao CMS                        │
  │ - Auditoria de agendamentos (`completed_at`, `cancelled_at`)      │
  │ - Picking real WMS e KDS de cozinha integrado ao PDV              │
  └─────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    ▼
  ┌───────────────────────────────────────────────────────────────────┐
  │                           MARCO M4 (PLANEJADO)                    │
  │ Bifurcação Mobile-Native (<640px) vs Desktop (>=840px)           │
  │ - Bottom Sheets de 100dvh para modais complexos                   │
  │ - Touch targets rigorosamente >= 44px (DL-14)                     │
  │ - Ações na thumb zone inferior móvel vs cabeçalho no desktop      │
  │ - Zero duplicação oculta de nós no DOM                            │
  └─────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    ▼
  ┌───────────────────────────────────────────────────────────────────┐
  │                           MARCO M5 (QUALITY GATE FINAL)           │
  │ Validação E2E, Testes Adversariais, Ratchet de CI e Deploy       │
  └───────────────────────────────────────────────────────────────────┘
```

### Detalhamento das Próximas Tarefas:

#### MARCO M2 — Modalidades Flexíveis nos Fluxos Operacionais Centrais
1. **Agenda (`src/routes/workspace.agenda.index.tsx`):**
   - Importar `UniversalViewManager` e `useWorkspaceViewMode`.
   - Adicionar modo **Tabela Densa** (para secretárias e recepção auditarem horários em lote), modo **Kanban** (colunas por status: Pendente, Confirmado, Em Atendimento, Concluído) e modo **Calendário/Cards**.
2. **Clientes / CRM (`src/routes/workspace.clientes.index.tsx`):**
   - Integrar alternância entre Tabela Corporativa (com filtros avançados e exportação), Funil Kanban (etapas de relacionamento) e Cards de Contato com atalho direto de WhatsApp.
3. **Pedidos (`src/routes/workspace.pedidos.index.tsx`):**
   - Padronizar o seletor existente com o `UniversalViewManager`, persistindo a preferência do operador via `useWorkspaceViewMode("pedidos")`.
4. **Tarefas (`src/routes/workspace.tarefas.tsx`):**
   - Eliminar abas duplicadas e unificar os modos Kanban Trello-style, Lista de Pendências e Tabela de Prioridades.

#### MARCO M3 — Saneamento de Componentes Estáticos & Contratos BFF Reais
1. Identificar as 34 telas catalogadas em `.agents/teamwork/explorer_survey_1/static_and_todo_findings.json`.
2. Substituir arrays estáticos por queries Supabase com RLS.
3. Conectar formulários a Server Functions reais (`*.functions.ts`).

#### MARCO M4 — Ergonomia Mobile-Native
1. Verificar todos os botões móveis com altura inferior a `h-11` (44px) usando `design-lint`.
2. Implementar drawers com `pt-safe` e botões de fechamento abaixo do notch do smartphone.

#### MARCO M5 — Quality Gate Final e Entrega
1. Executar `npm run typecheck` (0 erros).
2. Executar `npm run build` (geração de assets e worker limpos).
3. Executar `node scripts/design-lint.mjs --ratchet` (0 novas violações).
4. Submeter PR para a branch principal (`main`).

---

## 5. Arquitetura das Primitivas Criadas

### UniversalViewManager (`src/components/workspace/view-modes/`)
```tsx
import { UniversalViewManager, ViewModeSwitcher, useWorkspaceViewMode } from "@/components/workspace";

function MyWorkspaceScreen() {
  const { viewMode, setViewMode } = useWorkspaceViewMode("agenda", "table");

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <WorkspaceCanonicalToolbar
        title="Agendamentos"
        primaryAction={{ label: "Novo Agendamento", onClick: handleNew }}
        rightSlot={<ViewModeSwitcher currentView={viewMode} onViewChange={setViewMode} />}
      />

      <UniversalViewManager
        currentView={viewMode}
        onViewChange={setViewMode}
        data={appointments}
        renderTable={(items) => <AppointmentsTable items={items} />}
        renderKanban={(items) => <AppointmentsKanban items={items} />}
        renderCards={(items) => <AppointmentsCards items={items} />}
      />
    </div>
  );
}
```

### KpiMetricCard (`src/components/workspace/kpi-metric-card.tsx`)
```tsx
import { KpiMetricCard } from "@/components/workspace";

<KpiMetricCard
  title="Vendas Totais"
  value="R$ 74.861,62"
  subtitle="Vendas do dia: R$ 220,00"
  trend={{ value: "+145%", direction: "up", label: "versus período anterior" }}
  sparklineData={[12, 18, 14, 25, 22, 35, 42, 38, 55]}
  sparklineColor="success"
/>
```

---

## 6. Registro de Decisões Arquiteturais (DEC-431 e DEC-432)
Todas as decisões normativas de design estão gravadas em [`docs/design/DECISIONS.md`](file:///c:/Users/Eduardo%20Antônio%20Ramo/Documents/waesy/docs/design/DECISIONS.md).

- **DEC-431:** Saneamento Determinístico de Cores Hardcoded em Seções Dinâmicas e Padronização Canônica de Touch Targets em Pedidos e KDS.
- **DEC-432:** Fundação Ultraminimalista, Primitivo UniversalViewManager Polimórfico e Persistência de Preferências Multi-Tenant.
