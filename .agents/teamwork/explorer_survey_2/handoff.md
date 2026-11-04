# Handoff Report — Ultraminimalist Design & Flexible View Modes Architecture

**Agent**: Survey Explorer 2 — Ultraminimalist Design & View Modes Architect (Belasis/Avec/Trello)  
**Date**: 2026-11-04  
**Working Directory**: `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\explorer_survey_2\`  
**Context**: Master Architectural Survey for Requirements R1 (Ultraminimalist Reengineering & Information Architecture) and R2 (Flexible View Modes: Table, Kanban, Cards List).

---

## 1. Observation

### 1.1. Empirical Analysis of Reference Materials

#### 1.1.1. Reference Image: Belasis — Painel (`media_1793761531092_91bf4759.png`)
Direct visual inspection reveals the definitive SaaS ergonomic standard for beauty, wellness, and appointment management:
- **Navigation & Brand Pillar (Left Rail / Sidebar)**:
  - Deep royal blue/indigo background with clear visual hierarchy.
  - Header cluster: clean logo (`belasis`), notification badge (`2`), chat/WhatsApp trigger, help circle, and sidebar collapse control.
  - User identity chip: Avatar circle (`be`), "Olá / Meu perfil" with subtle dropdown arrow.
  - Branch selector: High-contrast pill (`SM Studio M / PROFISSIONAL`).
  - Primary Action Button: Pill-shaped `Novo +` with crisp white background, placed prominently at the top of the menu tree.
  - Menu Items: Tree items with thin stroke icons and clean right arrows/chevrons; contextual badges (e.g., `novo` on "Comissões").
  - Footer: Discreet version indicator (`v5.4.50`).
- **Main Workspace Canvas**:
  - Background: Crisp, subtle neutral canvas (`#F8FAFC` / `--canvas`).
  - Page Header: Large bold title (`Todas as filiais`), accompanied on the right by exactly two controls: an outline filter button (`Filtrar`) and a filled primary button (`Atualizar`).
  - Date Range Header Strip: Pill container with date range (`20 abr, 2026 → 04 mai, 2026`) and info tooltip trigger.
  - KPI Metric Strip (3 sovereign cards in a 3-column row):
    - *Card 1 (Vendas totais)*: Circular blue icon badge, huge readable metric value (`US$ 74.861,62`), daily sub-stat (`Vendas do dia US$ 220,00`), and outline pill badge (`↑ 145% VERSUS PERÍODO ANTERIOR`).
    - *Card 2 (Agendamentos)*: Circular calendar icon badge, bold stat (`323`), smooth sparkline area chart in blue gradient, and growth badge (`↑ 40% TAXA DE CRESCIMENTO`).
    - *Card 3 (Comandas)*: Circular order receipt badge, bold stat (`167`), smooth sparkline area chart in purple gradient, and conversion badge (`41% TAXA DE CONVERSÃO`).
    - *Geometry*: Each KPI card is a **single sovereign surface** (`rounded-2xl`, subtle border, zero card-in-card nesting, generous 20-24px internal padding).
  - Operational Analysis Section:
    - Tab bar: Clean text tabs (`Agendamentos` [active blue with bottom bar] vs `Comandas` [inactive muted]).
    - Split-View: Left panel with visit trends bar chart (`Tendência de Visitas`) with rounded top bars; Right panel with appointment ranking (`Ranking de agendamentos`) displaying circular rank numbers (1, 2, 3 in blue; 4, 5, 6, 7 in neutral), clean labels, and right-aligned counts (`88`, `53`, `35`...).
    - Floating contextual chat widget in bottom right corner.

#### 1.1.2. Trello with Inbox and Planner (`newpasta/3832819-0-90293000-1743055572-Trello-with-Inbox-and-Planner.webp`)
- **Docked Mode Switcher (Floating Segmented Pill)**:
  - Centered at the bottom of the viewport: 4 distinct mode icons: `Inbox`, `Calendar / Planner`, `Board / Kanban`, and `Table / Grid`.
  - Immediate, friction-free toggling without page reloading or jarring layout shifts.
- **Visual Silence & Soft Pastels**:
  - Calendar items use light pastel tints (soft mint green, lavender, peach, sky blue) with 1px borders, avoiding heavy solid dark backgrounds.
  - Left Inbox panel provides a calm vertical card queue with date pills (`Apr 25` in soft yellow).
  - Clear whitespace (16px to 24px) separating columns and cards.

#### 1.1.3. Adobe XD Trello Redesign Concept (`newpasta/adobe-xd-trello-redesign-concept.jpg` & `adobe-xd-trello-mobile-resdesign.jpg`)
- **Desktop Board**:
  - Header contains search input, board selector, team avatars with counter badge (`+44`), and secondary menu.
  - Column containers are clean, light gray surfaces with subtle headers, item count, and "+ Add new card" footer.
  - Cards feature discrete horizontal color tag indicators, avatar group stacks, and right-aligned activity icons (comments, likes).
- **Mobile Native Layout**:
  - Eliminates horizontal board scrolling fatigue by transforming the board into a focused card feed with horizontal category pills.
  - Sticky navigation with clean touch targets (>=44px), card details showing rich metadata without line wrapping clutter.

#### 1.1.4. Olist / Tiny ERP Modern UI (`0fb605_17e7de9bd820423f83ce54924db5e983~mv2.png`, `0fb605_bb97d704cffe47078d31b7e30aa0f4ee~mv2.png`, `6af900143054055.62882577624d4.png`, `tinyerp8.jpg`)
- **Two-tier Collapsible Sidebar**: Primary module icons/labels on tier 1; contextual sub-menus on tier 2.
- **Breadcrumbs & Action Header**: Clean path indicators (`início = vendas pedidos de venda`), single primary pill button (`incluir pedido` / `incluir produto`), secondary dropdown (`mais ações ...`).
- **Segmented Status Counters (Tab Strip)**:
  - Displays count per status tab: `todos 412`, `simples 311`, `kits 00`, `variações 254`, `fabricado`.
  - Active tab indicated by high-contrast black/colored underline and dot indicator.
- **Data Table Ergonomics**:
  - Checkbox column, `...` quick-action trigger, product thumbnail in rounded container, clear SKU/Title/Price columns, tabular numeric formatting (`font-mono tabular-nums`).
  - Selected row gets a gentle blue wash (`#ebf3fe` / `--accent-soft`).
  - Contextual slide-over drawer / sheet on the right (e.g., `Cotar fretes`, `Buscador de boletos`) that opens without pushing or collapsing the underlying table.

#### 1.1.5. Mercos B2B (`hero-sistemas.png`)
- Clear architectural bifurcation:
  - **Desktop**: Wide grouped rows/cards with prominent `+ Criar pedido / Orçamento` button, grouped by date sections ("Hoje").
  - **Mobile**: Focused single-column card list with clear status pills ("Orçamento", "Concluído", "Faturado"), bold currency values, and thumb-friendly spacing.

#### 1.1.6. Native Sales Mobile App (`app-sales.png`)
- True thumb-zone interaction: horizontal category pills, single-surface product cards with squircle thumbnails, SKU codes, stock indicators, and embedded quantity steppers (`-` / `+`), anchored by a sticky bottom checkout bar.

---

### 1.2. Existing Design System Audit (`docs/design/` & `src/`)

1. **Foundations in `docs/design/DESIGN.md`**:
   - Outlines 7 Visual Principles: Visual Silence, Immediate Hierarchy, Controlled Density, Progressive Disclosure, Design for Reading, Whitespace as Structural Element, Semantic Color.
   - 12 Architectural Layers (01. Foundation up to 12. Builder Blocks).
   - Strict Design Lint Rules DL-01 to DL-32 in `scripts/design-lint.mjs`.
   - Ratchet mechanism enforced via `node scripts/design-lint.mjs --ratchet` (Baseline: 694 total violations, 0 P0, 688 P1 historical debt).
2. **Layout Adaptivity in `docs/design/LAYOUT-ADAPTIVE.md`**:
   - Establishes Window Size Classes:
     - `Compact`: `< 600px` (Mobile Native App Shell: thumb navigation, Bottom Sheets 100dvh).
     - `Medium`: `600px .. 839px` (Tablet Hybrid).
     - `Expanded`: `>= 840px` (Desktop Native App System: 4-column Bento/Tetris, Master-Detail, dense data tables).
   - Strict prohibition of DOM duplication via CSS classes (e.g. `block md:hidden` duplicating full node subtrees). Must bifurcate in React using `useWindowSizeClass()`.
3. **Canonical Shell & Toolbar Components**:
   - `src/components/workspace/workspace-canonical-toolbar.tsx`: Provides a 2-tier toolbar with tab strip (Tier 1) and search/filter/action bar (Tier 2).
   - `src/components/workspace/module-action-header.tsx`: Action header supporting `viewModes: ViewModeOption[]`.
   - `src/components/workspace/kanban/full-viewport-kanban.tsx`: Column-based kanban renderer.
   - `src/components/ui/table.tsx` & `src/components/ui/canonical/dense-data-grid.tsx`: Table primitives.

---

### 1.3. Anti-Patterns Identified in Existing UI Codebase

#### Anti-Pattern 1: Containeritis (Cards Inside Cards — DL-31)
- **Location**: `src/routes/workspace.index.tsx:359`, `src/routes/workspace.index.tsx:483`, `src/routes/workspace.clientes.index.tsx:323-333`, `src/routes/workspace.tarefas.tsx:296-309`.
- **Direct Observation**:
  - In `workspace.index.tsx:359`: `<div className="col-span-12 lg:col-span-7 xl:col-span-8 p-5 sm:p-6 rounded-xl bg-card border border-border/70 ...">` embeds inner buttons with borders and backgrounds, creating nested boxes.
  - In `workspace.index.tsx:483`: `<Card className="col-span-12 lg:col-span-8 p-5 border border-border/40 bg-card rounded-lg ...">` wraps inner items that themselves declare `p-4 rounded-lg bg-muted/20`.
  - In `workspace.clientes.index.tsx:323`: Mobile list wraps cards in an outer container with borders and backgrounds, inside which each row creates additional nested borders and background chips.
- **Harm**: Multi-layer nesting creates visual noise, cognitive fatigue, and violates the "Single Sovereign Surface" doctrine.

#### Anti-Pattern 2: Arbitrary Padding Accumulation
- **Location**: `src/routes/workspace.clientes.index.tsx:176`, `src/routes/workspace.pedidos.index.tsx:290`.
- **Direct Observation**:
  - `workspace.clientes.index.tsx:176`: Outer container declares `w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20`, page header declares internal paddings, then table card declares `p-4 sm:p-6`, and table cells declare `p-4`.
  - On mobile (<600px), when sections or cards add `p-4` inside pages with `p-4`, horizontal content space is choked to less than 85% of viewport width.

#### Anti-Pattern 3: Inconsistent & Fragmented View Mode Implementations
- **Direct Observation across Routes**:
  - `src/routes/workspace.tarefas.tsx`: Has 4 hardcoded tabs (`my-day`, `kanban`, `list`, `calendar`) where `my-day` is actually a filter while `kanban`, `list`, and `calendar` are visual layout modes.
  - `src/routes/workspace.pedidos.index.tsx`: Contains 1,766 lines of monolithic code with domain-specific view modes (`emissions`, `kitchen`, `picking`, `service_flow`, `table`) implemented with custom switch statements and hardcoded markup rather than modular view contracts.
  - `src/routes/workspace.clientes.index.tsx`: Only has a table on desktop and a vertical list on mobile. Has **zero** Kanban view mode (e.g. Lead -> Contatado -> Proposta -> Ativo) and **zero** Cards Grid view mode, despite customers being a core operational pipeline!
  - `src/routes/workspace.agenda.index.tsx`: Only toggles between `daily` and `heatmap`. Lacks a structured Kanban view (e.g. Confirmado -> Recepção -> Em Atendimento -> Finalizado) or a dense Table view for quick bulk reconciling.
- **Harm**: Inconsistent user experience across the workspace; users cannot switch to their preferred working perspective (Table for dense data entry, Kanban for pipeline triage, Cards for rich visual inspection).

#### Anti-Pattern 4: Visual Clutter & AI-Smell / Text Prolixity (DL-19 to DL-24)
- **Direct Observation**:
  - Screens have verbose explanatory paragraphs inside cards (e.g., `workspace.clientes.index.tsx:305-309`: "Sua carteira de clientes ainda está vazia. Comece cadastrando passageiros ou empresas parceiras.").
  - Overuse of colored badges with redundant labels (e.g., displaying both status badge and kind badge side-by-side with long text).
  - Lack of sparklines, breathing room, or clean micro-accents as seen in Belasis.

---

## 2. Logic Chain

```
[Observation 1.1: Belasis, Olist, Trello, Bling reference visual standards]
   │
   ▼
[Step 1: Visual Calm is produced by Single Sovereign Surfaces, Whitespace, and Micro-accents]
   ├─ Every metric card or entity card must have exactly ONE container border/background.
   ├─ Colors are restricted to 10% opacity pills with high-contrast text (Status Badges) or sparklines.
   └─ Titles must be direct (≤ 4 words), actions clear (≤ 3 words).
   │
   ▼
[Observation 1.3: Existing code has Containeritis (DL-31) and Fragmented View Modes]
   │
   ▼
[Step 2: Elimination of Containeritis & Arbitrary Padding Accumulation]
   ├─ Enforce "Single Surface Rule": A card or data container never wraps child bordered cards.
   ├─ Enforce "Mobile Edge Rule": On mobile (<600px), layout padding is 12-16px max; content gets >=92% width.
   └─ Clean, flat surfaces with soft borders (`border-border/50`) and zero decorative drop-shadows.
   │
   ▼
[Observation 1.1.2 & 1.3: Trello floating switcher vs Waesy fragmented view modes]
   │
   ▼
[Step 3: Unification of Flexible View Modes (Table, Kanban, Cards List)]
   ├─ Operational domains (Agendamentos, Clientes, Pedidos, Tarefas) share the same underlying entity data.
   ├─ A polymorphic `UniversalViewManager` component standardizes the switching between:
   │    1. `TableView` (dense enterprise table with sorting, multi-select, tabular-nums)
   │    2. `KanbanView` (stage columns, drag-and-drop or 1-click status transitions, count badges)
   │    3. `CardsView` (squircle cards, rich metadata, thumbnail, quick actions)
   ├─ Keyboard navigation (`1` = Table, `2` = Kanban, `3` = Cards, `j`/`k` = list navigation).
   └─ URL query synchronization (`?view=table|kanban|cards`) maintains user preference across reloads.
   │
   ▼
[Observation 1.2: Window Size Classes & Frozen Bifurcation Rules]
   │
   ▼
[Step 4: Frozen Ergonomic Boundaries (Mobile Native vs Desktop Native)]
   ├─ Mobile (<640px): Bottom dock / sheet navigation, thumb-zone CTAs (44px min), cards stacked vertically.
   ├─ Desktop (>=840px): Sidebar rail, top action header, split-view / master-detail, dense tables (36-40px rows).
   └─ Runtime bifurcation strictly via `useWindowSizeClass()` — zero DOM duplication in HTML.
```

---

## 3. Caveats

1. **Non-Operational Domain Routes**: This architectural survey focuses on the primary operational modules requested (Agendamentos, Clientes, Pedidos, Tarefas) and the Dashboard shell. Domain routes with deeply specialized canvas engines (e.g., `builder.$documentId.editor.tsx` and `ad-engine`) have custom editing tooling and do not use standard Kanban/Table toggles.
2. **State Machine Preservation**: Status transitions in Kanban or Table views MUST strictly respect `lib/state-machines.ts` and `lib/niche-manifest.ts`. The UI cannot allow arbitrary status dragging if the underlying state machine disallows it.
3. **No Breaking Source Modifications during Survey**: As an explorer subagent, all findings and specifications are delivered in this handoff report. Downstream implementation agents must apply these contracts with surgical precision via `replace_file_content` without full-file rewrites.

---

## 4. Conclusion & Concrete Architectural Specifications

### 4.1. The Ultraminimalist Design Specification (Requirement R1)

To replicate the **Belasis, Avec, and Trello** aesthetic, all workspace screens must adhere to the following **Five Pillars of Visual Silence**:

#### 1. Single Sovereign Surface Architecture
- **Rule**: Every data card, KPI widget, or row is a **single-layer surface**. Nesting a card with `bg-card border` inside another container with `bg-card border` is strictly prohibited.
- **Classes**:
  - Primary Container: `bg-card border border-border/60 rounded-2xl`
  - Subtle Hover: `hover:border-foreground/20 hover:bg-muted/20 transition-all duration-150`
  - Internal Padding: `p-4 sm:p-5`
  - No decorative shadows (`shadow-none` or `shadow-2xs`).

#### 2. Belasis-Style KPI Metric Strip Primitive (`KpiMetricCard`)
- Clean 3 or 4 column grid: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 (or 4) gap-4`.
- Anatomy of each KPI card:
  ```tsx
  <div className="flex flex-col justify-between p-5 rounded-2xl bg-card border border-border/60 min-h-[140px]">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Icon className="size-4" />
        </div>
        <span className="text-xs font-semibold text-muted-foreground">{title}</span>
      </div>
      {tooltip && <InfoTooltip content={tooltip} />}
    </div>
    
    <div className="my-2">
      <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-foreground">
        {formattedValue}
      </div>
      {subValue && (
        <p className="text-xs text-muted-foreground mt-0.5">{subValue}</p>
      )}
    </div>

    <div className="flex items-center justify-between pt-2 border-t border-border/40">
      <span className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-bold uppercase",
        trendDirection === "up" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
        trendDirection === "down" ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" :
        "bg-muted text-muted-foreground"
      )}>
        {trendDirection === "up" ? "↑" : trendDirection === "down" ? "↓" : "•"} {trendText}
      </span>
      {sparklineData && <MiniSparkline data={sparklineData} color={sparklineColor} />}
    </div>
  </div>
  ```

#### 3. Air & Whitespace System (Modular Grade 4px)
- Page Container: `w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6`
- Inter-Section Spacing: `gap-6` (24px)
- Intra-Card Spacing: `space-y-3` or `gap-3` (12px)
- Elimination of redundant padding on mobile: `px-3 sm:px-6` (never accumulate nested padding).

#### 4. Semantic Color & Micro-Accents
- Base canvas: 90% acromatic (`--canvas`, `--surface`, `--surface-subtle`).
- Status Badges:
  - Success/Paid/Confirmed: `bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20`
  - Warning/Pending/Awaiting: `bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20`
  - Danger/Overdue/Cancelled: `bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20`
  - Info/In Progress: `bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20`
- Zero colored gradients or multi-colored backgrounds in operational workspace views.

#### 5. Eradication of Text Prolixity & AI-Smell
- Titles: Maximum 4 words (e.g. `Carteira de Clientes`, `Painel de Pedidos`, `Agenda do Dia`).
- Buttons: Maximum 3 words (e.g. `Novo Cliente`, `Confirmar Pedido`, `Filtrar`).
- Empty States: Exactly 1 direct title line, 1 concise sentence description, 1 primary action button. Prohibit philosophical or conversational welcome messages.

---

### 4.2. Flexible View Modes Component Specification (Requirement R2)

Every primary operational workspace routine (**Agendamentos, Clientes, Pedidos, Tarefas**) must provide **effortless toggling** between three canonical view modes:

| View Mode | Best Used For | Key Capabilities |
| :--- | :--- | :--- |
| **Table (`table`)** | High-density scanning, financial auditing, bulk updates | Sortable columns, checkboxes, sticky header, compact rows (40px desktop, 52px mobile), `tabular-nums` formatting. |
| **Kanban (`kanban`)** | Operational pipeline flow, stage advancement, bottleneck diagnosis | Horizontal stage columns, item count pills, 1-click status advance arrow or drag-and-drop, stage color accent. |
| **Cards (`cards`)** | Rich customer/order browsing, photo/voucher inspection, quick WhatsApp outreach | Squircles with prominent avatars/thumbnails, contact chips, direct phone/action buttons, collapsible details. |

#### Reusable Polymorphic View Component Contract: `UniversalViewManager`

```tsx
/**
 * src/components/workspace/view-modes/universal-view-manager.tsx
 * Canonical Contract for Requirement R2 (Flexible View Modes)
 */

import React from "react";
import { LayoutGrid, List, Kanban as KanbanIcon } from "lucide-react";

export type OperationalViewMode = "table" | "kanban" | "cards";

export interface ViewModeConfig {
  id: OperationalViewMode;
  label: string;
  icon: React.ElementType;
}

export const CANONICAL_VIEW_MODES: ViewModeConfig[] = [
  { id: "table", label: "Tabela", icon: List },
  { id: "kanban", label: "Kanban", icon: KanbanIcon },
  { id: "cards", label: "Cards", icon: LayoutGrid },
];

export interface UniversalViewManagerProps<T> {
  /** Identifier of active view mode */
  currentView: OperationalViewMode;
  /** Callback when view mode changes */
  onViewChange: (mode: OperationalViewMode) => void;
  /** Allowed modes for this screen (defaults to all 3) */
  allowedModes?: OperationalViewMode[];
  
  /** Data collection to render */
  data: T[];
  
  /** Renderers for each mode */
  renderTable: (items: T[]) => React.ReactNode;
  renderKanban: (items: T[]) => React.ReactNode;
  renderCards: (items: T[]) => React.ReactNode;
  
  /** Empty state when data is empty */
  emptyState?: React.ReactNode;
  /** Loading state */
  isLoading?: boolean;
  renderSkeleton?: () => React.ReactNode;
}
```

#### View Mode Switcher Header Control (`ViewModeSwitcher`)
- Integrated into `WorkspaceCanonicalToolbar` Tier 1:
  ```tsx
  <div className="flex items-center p-1 rounded-xl bg-muted/50 border border-border/60 gap-0.5">
    {modes.map((m) => {
      const Icon = m.icon;
      const isActive = currentView === m.id;
      return (
        <button
          key={m.id}
          type="button"
          onClick={() => onViewChange(m.id)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 min-h-11 sm:min-h-9",
            isActive
              ? "bg-background text-foreground shadow-2xs font-bold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          )}
          aria-pressed={isActive}
          title={`Visualizar em ${m.label} (Tecla ${m.shortcut})`}
        >
          <Icon className="size-3.5" />
          <span className="hidden sm:inline">{m.label}</span>
        </button>
      );
    })}
  </div>
  ```

#### Keyboard Shortcuts & URL State Sync
- Shortcuts:
  - Press `1`: Switch to Table View
  - Press `2`: Switch to Kanban View
  - Press `3`: Switch to Cards View
  - Press `/`: Focus Search input
- TanStack Router State Persistence:
  - Query parameter `?view=table | kanban | cards`
  - Preserves user preference per module in `localStorage` (`waesy:view_pref:[module_name]`).

---

### 4.3. Dedicated Ergonomic Boundaries: Mobile Native (<640px) vs Desktop Native (>=840px)

| Ergonomic Dimension | Mobile Native Shell (<640px) | Desktop Native System (>=840px) |
| :--- | :--- | :--- |
| **Touch Targets & Heights** | Minimum `44x44px` (`h-11 min-h-11 min-w-11`) for all touchables (DL-14). | Compact controls `32px - 36px` (`h-8` / `h-9`) in tables and toolbars. |
| **Action Placement** | **Thumb Zone**: Primary actions anchored at the bottom (`sticky bottom-safe z-30`). | **Top Right**: Action bar aligned with page title and global toolbar. |
| **View Mode Metamorfosis** | Table view converts into **Structured Compact Rows** with sheet on tap; Kanban supports horizontal snap-scroll or accordion tabs. | Full multi-column table with column sorting and fixed header; Full horizontal Kanban with drag-and-drop. |
| **Modals & Dialogs** | Modal dialogs are converted into **Bottom Sheets of 100dvh** with pull-down gesture to dismiss. | Centered modal dialog or slide-over drawer dock on the right (380px) preserving background visibility. |
| **Safe Areas** | Defensive safe area padding (`pt-safe`, `pb-safe`, `px-mobile-edge`). | Standard 24px - 32px window gutter margins. |
| **DOM Rendering** | Exclusively instantiated via `useWindowSizeClass()`. **Zero DOM duplication** via `block md:hidden`. | Exclusively instantiated via `useWindowSizeClass()`. |

---

### 4.4. Domain Mapping Matrix for Primary Operational Routines

| Operational Screen | Table View (`table`) | Kanban View (`kanban`) | Cards View (`cards`) |
| :--- | :--- | :--- | :--- |
| **1. Agendamentos (`workspace.agenda.index.tsx`)** | Dense list of appointments with date/time, client, professional, service, status, value, and quick action. | Pipeline by appointment status: *Confirmado → Recepção / Check-In → Em Atendimento → Finalizado / Pago*. | Time slot cards with client avatar, WhatsApp link, session details, and anamnesis button. |
| **2. Clientes / CRM (`workspace.clientes.index.tsx`)** | Enterprise table with Document, Name, City, Segment (B2B/B2C), Total Spent, and Last Contact. | Pipeline by relationship stage: *Novo Lead → Em Negociação → Proposta Enviada → Cliente Ativo → Inativo*. | Visual customer profiles with contact badge, document alert warnings, and 360° dossier button. |
| **3. Pedidos / Vendas (`workspace.pedidos.index.tsx`)** | Order log with Order Number, Date, Customer, Items count, Total (R$), Channel badge, and Status. | Niche pipeline: Gastronomy (*Novo → Em Preparo → Pronto → Em Entrega*); Tourism (*Reserva → Pagto → Emissão → Embarque*); Retail (*Aprovado → Separação → Expedição → Entregue*). | Dense order cards with item breakdown, customer WhatsApp quick-action, and one-click status advance. |
| **4. Tarefas (`workspace.tarefas.tsx`)** | High-density task sheet with Task Code, Title, Priority pill, Due Date, Assignee, and Done check. | Stage board: *A Fazer → Em Andamento → Em Revisão → Concluído*. | Priority cards with checklist progress, tag pills, and "Meu Dia" star toggle. |

---

## 5. Verification Method

Downstream implementation and quality assurance agents can verify compliance using the following reproducible tests:

1. **Compilation & Typecheck**:
   ```powershell
   npm run typecheck
   ```
   *Expected Result*: Exit Code 0, zero TypeScript errors.

2. **Design Lint Ratchet Audit**:
   ```powershell
   node scripts/design-lint.mjs --ratchet
   ```
   *Expected Result*: PASS (<= Baseline), zero P0 violations, zero new P1 regressions. Specifically verifying that DL-31 (Containeritis / Card inside Card) and DL-32 (excessive grid columns) report 0 new violations.

3. **Production Build**:
   ```powershell
   npm run build
   ```
   *Expected Result*: Exit Code 0, bundle generation without cyclic dependency warnings.

4. **Visual Inspection Criteria**:
   - Inspect the modified screens in viewports `375px` (iPhone), `768px` (iPad), and `1440px` (MacBook Desktop).
   - Verify that toggling between Table, Kanban, and Cards list updates the display instantly without layout jank or state loss.
   - Verify that all interactive elements on mobile measure >= 44x44px.
   - Verify that every card has a single border and clean neutral background aligned with the Belasis reference.
