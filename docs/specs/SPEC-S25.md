# SPEC-S25: Família Shell e Navegação Canônica

## 1. Identificação e Metadados
- **Fase**: S25 (Família Shell e Navegação).
- **Plano**: Plano 5 — Estrutura, Escala e Operação BigTech (Bloco D: Design System como Fonte Única).
- **Responsáveis**: BigTech Engineering Board (Design System Architect, Layout & Adaptivity Specialist, Staff Frontend Engineer).
- **Data**: 2026-10-02.
- **Invariantes**: DL-01, DL-02, DL-03, DL-04, DL-14, DL-15, B.2, B.4, B.8, B.9.
- **Severidade**: P0 (Ergonomia de Navegação, Touch Targets e Layout Adaptativo).

---

## 2. Requisitos em Sintaxe EARS

- **[EARS-1] (Ubíquo - Consumo Estrito de Tokens)**: Todos os componentes da família Shell (`Sidebar`, `AppHeader`, `BottomBar`, `GlobalRail`, `Breadcrumb`) DEVEM consumir exclusivamente tokens semânticos (`bg-background`, `bg-card`, `border-border`, `text-foreground`, `text-muted-foreground`), sendo terminantemente proibido qualquer valor hardcoded (`#hex`, `rgb`, classes arbitrárias entre colchetes).
- **[EARS-2] (Condicional - Bifurcação Adaptativa por Viewport)**:
  - Quando a largura da viewport for menor que 600px (modo compacto / mobile), o sistema DEVE ocultar a barra lateral e renderizar a navegação primária ancorada no terço inferior da tela (`BottomBar`), respeitando `env(safe-area-inset-bottom)`.
  - Quando a largura for maior ou igual a 840px (modo expandido / desktop), o sistema DEVE renderizar a navegação estruturada via `Sidebar` ou `GlobalRail` com colunas fluidas.
- **[EARS-3] (Ubíquo - Touch Targets Móveis de 44px)**: Todo item interativo de navegação em telas táteis DEVE possuir altura e largura mínimas de 44x44px (`h-11` ou `min-h-[44px]`), garantindo aderência mecânica ao piso de acessibilidade WCAG 2.2 AA.
- **[EARS-4] (Ubíquo - Anel de Foco Visível)**: Todo botão de navegação, link ou aba DEVE renderizar anel de foco de alto contraste (`focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`).
- **[EARS-5] (State-Driven - Matriz de Estados de Navegação)**: Os componentes de navegação DEVEM suportar os estados: Normal, Ativo/Página Atual (`aria-current="page"`), Hover (apenas com apontador fino), Foco e Desabilitado (`aria-disabled="true"`).

---

## 3. Arquitetura das Camadas

### Camada 1: Primitivas Canônicas de Shell (`src/components/ui/canonical/navigation-shell.tsx`)
- `CanonicalAppHeader`: Cabeçalho unificado com safe-area-top, título semântico, trigger de menu e ações.
- `CanonicalSidebar`: Barra lateral com agrupamento semântico, recolhimento e tooltips.
- `CanonicalBottomBar`: Barra inferior móvel com área de toque ergonômica e safe-area-bottom.
- `CanonicalGlobalRail`: Trilho de ícones para workspaces multi-ferramentas.

### Camada 2: Exportação no Showcase (`src/components/design-system/`)
- Módulo `src/components/design-system/navigation-family.tsx` exibindo as 5 primitivas de navegação na rota de governança `/workspace/design-system`.

---

## 4. Evidências de Aceite
1. Componente `src/components/ui/canonical/navigation-shell.tsx` implementado e exportado em `src/components/ui/canonical/index.ts`.
2. Módulo de showcase de navegação ativo em `/workspace/design-system`.
3. 0 violações P0/P1 no Design Lint com catraca aprovada.
4. Testes Vitest 100% verdes.
