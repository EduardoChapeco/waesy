# Project: Waesy Ultraminimalist Platform Re-Engineering & End-to-End Architecture

## Architecture
- **Ultraminimalist Design & Information Architecture (Belasis / Avec / Trello)**:
  - Adopção estrita do princípio *Single Sovereign Surface*: cada cartão de métrica (KPI), linha de dados ou entidade possui uma única casca soberana (`bg-card border border-border/60 rounded-2xl`), eliminando radicalmente o aninhamento de cartões dentro de cartões (Containeritis, DL-31) e margens/paddings acumulados.
  - Paleta com 90% de silêncio visual acromático (`--canvas`, `--surface`), restringindo cores a micro-acentos semânticos em badges translúcidos (10% de opacidade com borda de 20%) e sparklines limpos.
  - Títulos ultra-diretos (≤ 4 palavras) e botões de ação concisos (≤ 3 palavras), erradicando qualquer prolixidade textual ou "AI-smell" (DL-19 a DL-24).
- **Modalidades Flexíveis de Visualização (R2)**:
  - Componente universal e polimórfico `UniversalViewManager<T>` nos 4 módulos operacionais primários (`Agenda`, `Clientes/CRM`, `Pedidos/Vendas`, `Tarefas`):
    - *Tabela (`table`)*: Visão corporativa de alta densidade, ordenação por colunas, multi-seleção, formatação mono-espaçada (`font-mono tabular-nums`).
    - *Kanban (`kanban`)*: Quadro de colunas por estágio (`FullViewportKanban` / `NicheKanbanBoard`), contadores visuais e avanço de status em 1 clique ou drag-and-drop.
    - *Cards (`cards`)*: Grade de squircles limpos com avatares, metadados ricos e ações rápidas (ex.: WhatsApp).
  - Persistência multi-tenant de preferências em banco de dados (`workspace_user_view_preferences`), com fallback para `localStorage` e sincronização bidirecional na query string do TanStack Router (`?view=table|kanban|cards`). Atalhos de teclado (`1`, `2`, `3`).
- **Preservação Funcional Integral & Implementação End-to-End (R3)**:
  - Preservação de 100% das 446 rotas mapeadas no inventário mestre.
  - Erradicação de fallbacks sintéticos, arrays hardcoded e dados estáticos nos 34 pontos identificados, conectando-os aos serviços BFF reais (`src/services/*`) e tabelas Supabase com RLS estrito.
  - Completude de auditoria nas Server Functions (preenchimento de `completed_at/by`, `no_show_marked_at/by`, `cancelled_by/reason/at` em `booking.functions.ts`).
  - Sincronização real do checklist de picking (`wms.functions.ts`) e KDS (`pdv.functions.ts`).
- **Bifurcação Congelada Mobile Native (<640px) vs Desktop Native (>=840px)**:
  - *Mobile*: Alvos de toque mínimos de 44x44px (DL-14), ações principais ancoradas na thumb zone inferior (`sticky bottom-safe`), conversão de diálogos para Bottom Sheets de 100dvh, padding lateral defensivo de 12-16px garantindo ≥92% de largura útil para o conteúdo.
  - *Desktop*: Trilho de navegação lateral, cabeçalho de ação no topo, master-detail / split-view, tabelas de 36-40px por linha.
  - Bifurcação em runtime via hook `useWindowSizeClass()` — zero duplicação de nós no DOM via CSS.
- **Governança Zero-Trust & Invariante B.25**:
  - Toda nova Server Function e mutação cirúrgica com schema Zod completo, desestruturação total de parâmetros no corpo da função e tratamento defensivo para campos opcionais/nulos.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Single Sovereign Surface Tokens & Foundations | Eliminar Containeritis (DL-31), padding acumulado e sombras utilitárias decorativas; estabelecer superfícies únicas de 1 camada | M1 | Survey 2 (Design Explorer) |
| 2 | Belasis/Trello Canonical Metric & View Primitives | Criar primitivos `KpiMetricCard`, `MiniSparkline` e `ViewModeSwitcher` de alta fidelidade visual | M1 | Survey 2 (Design Explorer) |
| 3 | Polymorphic UniversalViewManager Component | Implementar componente canônico `UniversalViewManager` suportando modos Table, Kanban e Cards com atalhos de teclado | M1 | Survey 2 (Design Explorer) |
| 4 | Database Migration & BFF for View Preferences | Criar tabela `workspace_user_view_preferences` (RLS) e contrato BFF `workspace-view-preferences.functions.ts` (B.25) | M1 | Survey 3 (BFF Explorer) |
| 5 | Vitest Suite for View Preferences Contract | Escrever suíte de testes unitários em `src/services/__tests__/workspace-view-preferences.test.ts` cobrindo multi-tenant e Zod | M1 | Survey 3 (BFF Explorer) |
| 6 | Flexible View Modes for Agenda & Appointments | Integrar `UniversalViewManager` na Agenda (`workspace.agenda.index.tsx`): Tabela densa, Kanban de status e Cards de horário | M2 | Survey 1 & 2 |
| 7 | Flexible View Modes for Customers / CRM | Integrar `UniversalViewManager` em Clientes (`workspace.clientes.index.tsx`): Tabela corporativa, Funil Lead CRM e Cards de contato | M2 | Survey 1 & 2 |
| 8 | Flexible View Modes for Orders & Dispatch | Integrar `UniversalViewManager` em Pedidos (`workspace.pedidos.index.tsx`): Tabela contábil, Kanban por nicho e Cards de despacho | M2 | Survey 1 & 2 |
| 9 | Flexible View Modes for Tasks & Projects | Unificar abas em `workspace.tarefas.tsx` integrando `UniversalViewManager` e eliminando tab duplicada `my-day` | M2 | Survey 1 & 2 |
| 10 | Kanban Defaults Extension for Domains | Adicionar estágios padrão para `appointments`, `orders` e `customers` em `src/services/kanban-config.functions.ts` | M2 | Survey 3 (BFF Explorer) |
| 11 | Static Elements Remediation in Vitrines & Hotpages | Substituir `HOTPAGE_THEMES` hardcoded em `_store.destaques.$slug.tsx` por consulta a `marketplace_surfaces`, removendo emojis/estrelas | M3 | Survey 1 (Inventory Explorer) |
| 12 | Institutional Pages Backend Connection | Vincular páginas estáticas textuais (`about`, `sobre`, `contact`, `privacy`) à tabela de páginas institucionais no CMS | M3 | Survey 1 (Inventory Explorer) |
| 13 | Appointment Status Audit Fields Hardening | Atualizar `updateAppointmentStatus` em `booking.functions.ts` para persistir `completed_at/by`, `no_show_marked_at/by`, `cancelled_at/by` | M3 | Survey 3 (BFF Explorer) |
| 14 | Real WMS Picking & PDV Kitchen Wiring | Conectar checklist de pedidos com `wms.functions.ts` e cartões de KDS em `workspace.pdv.cozinha.tsx` com `pdv.functions.ts` | M3 | Survey 3 (BFF Explorer) |
| 15 | Static Arrays & Fallbacks Purge in Workspace | Eliminar arrays hardcoded em `automacoes`, `b2b`, `cms.paginas`, `turismo` e conectar a taxonomias dinâmicas do banco | M3 | Survey 1 (Inventory Explorer) |
| 16 | Touch Targets & Mobile Ergonomics Floor (DL-14) | Assegurar alvo tátil mínimo de 44x44px (`h-11 min-h-11`) em todos os botões e controles no ecossistema mobile | M4 | Survey 2 (Design Explorer) |
| 17 | Bottom Sheets Conversion & Safe-Areas | Converter diálogos mobile para Bottom Sheets de 100dvh com pull-to-dismiss e utilitários de safe-area (`pt-safe`, `pb-safe`) | M4 | Survey 2 (Design Explorer) |
| 18 | Thumb Zone Bottom Actions vs Desktop Header | Fixar ações primárias na barra inferior no mobile e no cabeçalho de ação no desktop sem sobreposição | M4 | Survey 2 (Design Explorer) |
| 19 | DOM Bifurcation via useWindowSizeClass | Eliminar duplicação de DOM `block md:hidden` através de renderização condicional em nível de componente React | M4 | Survey 2 (Design Explorer) |
| 20 | Dual-Track E2E Test Suite Creation (Tiers 1-4) | Desenvolver suíte abrangente de testes E2E opacos cobrindo as 446 rotas, alternância de views e integridade transacional | M5 | Top-Level Dual Track |
| 21 | TypeScript Compilation Quality Gate | Executar `cmd /c npm run typecheck` com 100% de sucesso (Exit Code 0, zero erros) | M5 | Top-Level Acceptance Criteria |
| 22 | Production Build Quality Gate | Executar `cmd /c npm run build` gerando assets e worker sem erros (Exit Code 0) | M5 | Top-Level Acceptance Criteria |
| 23 | Design Lint Ratchet Quality Gate | Executar `node scripts/design-lint.mjs --ratchet` garantindo zero novas violações P0/P1 | M5 | Top-Level Acceptance Criteria |
| 24 | Adversarial Hardening (Tier 5) & Victory Audit | Executar testes adversariais de estresse e auditoria forense final de integridade antes da entrega ao usuário | M5 | Top-Level Final Phase |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Fundação Ultraminimalista, Design System & Primitivos de Visualização | Features 1, 2, 3, 4, 5: Single Sovereign Surface, KpiMetricCard, UniversalViewManager, migration workspace_user_view_preferences, BFF e testes unitários | none | COMPLETED |
| 2 | M2: Modalidades Flexíveis de Visualização nos Fluxos Operacionais (R2) | Features 6, 7, 8, 9, 10: Integração de Table/Kanban/Cards na Agenda, Clientes, Pedidos e Tarefas, mais estágios padrão de Kanban | M1 | COMPLETED |
| 3 | M3: Saneamento de Componentes Estáticos, Contratos BFF & Persistência Real (R3) | Features 11, 12, 13, 14, 15: Eliminação de dados hardcoded em 34 telas, hotpages dinâmicas, auditoria de agendamentos, picking real e KDS | M1 | PLANNED |
| 4 | M4: Bifurcação Congelada Mobile Native (<640px) vs Desktop Native (>=840px) | Features 16, 17, 18, 19: Alvos táteis de 44px (DL-14), Bottom Sheets de 100dvh, thumb zone inferior mobile e eliminação de duplicação de DOM | M2, M3 | PLANNED |
| 5 | M5: Suíte E2E, Quality Gate Final & Prova de Integridade Forense | Features 20, 21, 22, 23, 24: Testes E2E (Tiers 1-4), typecheck limpo, build limpo, design-lint ratchet, Tier 5 adversarial e Victory Audit | M1, M2, M3, M4 | PLANNED |

---

## Interface Contracts

### 1. View Preferences Contract (`src/services/workspace-view-preferences.functions.ts`)
- **Schema & DTO**:
  ```ts
  export const WorkspaceViewPreferenceSchema = z.object({
    store_id: z.string().uuid(),
    module: z.enum(["agenda", "clientes", "pedidos", "tarefas", "financeiro", "turismo"]),
    view_mode: z.enum(["table", "kanban", "cards", "calendar"]),
    column_settings: z.record(z.any()).optional().default({}),
    sort_field: z.string().nullable().optional(),
    sort_direction: z.enum(["asc", "desc"]).nullable().optional(),
    filters: z.record(z.any()).optional().default({}),
  });
  ```
- **Functions**:
  - `getWorkspaceViewPreference({ store_id, module })`: Retorna preferência salva ou fallback seguro.
  - `saveWorkspaceViewPreference(payload)`: Upsert idempotente no Supabase com isolamento de tenant.

### 2. Universal View Manager Contract (`src/components/workspace/view-modes/universal-view-manager.tsx`)
- **Props**:
  ```ts
  export interface UniversalViewManagerProps<T> {
    currentView: "table" | "kanban" | "cards";
    onViewChange: (mode: "table" | "kanban" | "cards") => void;
    data: T[];
    renderTable: (items: T[]) => React.ReactNode;
    renderKanban: (items: T[]) => React.ReactNode;
    renderCards: (items: T[]) => React.ReactNode;
    emptyState?: React.ReactNode;
    isLoading?: boolean;
    renderSkeleton?: () => React.ReactNode;
  }
  ```

### 3. Belasis KPI Metric Card Contract (`src/components/workspace/kpi-metric-card.tsx`)
- **Props**:
  ```ts
  export interface KpiMetricCardProps {
    title: string;
    value: string | number;
    subValue?: string;
    icon: React.ElementType;
    trendDirection?: "up" | "down" | "neutral";
    trendText?: string;
    sparklineData?: number[];
    sparklineColor?: string;
    tooltip?: string;
    className?: string;
  }
  ```

### 4. Appointment Status Audit Contract (`src/services/booking.functions.ts`)
- **Signature update**:
  ```ts
  export async function updateAppointmentStatus({
    id,
    status,
    completed_by,
    no_show_marked_by,
    cancelled_by,
    cancellation_reason,
  }: UpdateAppointmentStatusParams): Promise<AppointmentResult>;
  ```

---

## Code Layout
- `supabase/migrations/`: Migrações SQL e políticas RLS (`20270220000000_workspace_user_view_preferences.sql`).
- `src/services/`: Server Functions BFF (`workspace-view-preferences.functions.ts`, `booking.functions.ts`, `kanban-config.functions.ts`, `wms.functions.ts`).
- `src/services/__tests__/`: Suítes de testes unitários Vitest.
- `src/components/workspace/view-modes/`: `universal-view-manager.tsx`, `view-mode-switcher.tsx`.
- `src/components/workspace/`: `kpi-metric-card.tsx`, `workspace-canonical-toolbar.tsx`.
- `src/components/shell/`: `app-shell.tsx`, `mobile-nav.tsx`, `top-bar.tsx`.
- `src/routes/workspace.*`: 189 rotas de gestão operacional (`agenda`, `clientes`, `pedidos`, `tarefas`, `index`).
- `src/routes/_store.*`: 165 rotas públicas de vitrine (`destaques`, páginas institucionais).
- `docs/design/`: Tokens de design, regras visuais e decisões de arquitetura (`DECISIONS.md`).
