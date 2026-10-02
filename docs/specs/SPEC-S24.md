# SPEC-S24: Showcase Interno com Renderização Completa e Matriz de 4 Estados

## 1. Identificação e Metadados
- **Fase**: S24 (Showcase Interno com Renderização Completa e Matriz de 4 Estados).
- **Plano**: Plano 5 — Estrutura, Escala e Operação BigTech (Bloco D: Design System como Fonte Única).
- **Responsáveis**: BigTech Engineering Board (Design System Architect, Staff Frontend Engineer, Visual Auditor, A11y Guardian).
- **Data**: 2026-10-02.
- **Invariantes**: DL-01, DL-02, DL-03, DL-04, DL-11, DL-12, DL-13, DL-14, DL-15, B.2, B.4, B.8, B.9.
- **Severidade**: P0 (Acessibilidade, Ergonomia Visual e Prevenção de Regressão de Estados).

---

## 2. Requisitos em Sintaxe EARS

- **[EARS-1] (Ubíquo - Rota de Governança Visual)**: O sistema DEVE fornecer a rota canônica `/workspace/design-system` acessível aos administradores e desenvolvedores no Workspace, servindo como laboratório vivo de inspeção de todas as primitivas visuais da plataforma Waesy.
- **[EARS-2] (Ubíquo - Renderização das 11 Famílias Canônicas)**: O showcase DEVE renderizar interativamente 100% das 11 famílias de interface: Botões, Entradas de Formulário (Inputs/Textarea), Cards, Badges/Chips, Tabelas/Grids, Diálogos/Modais, Sheets/Gavetas, Abas (Tabs), Seletores (Selects), Chaves (Switches) e Caixas de Seleção (Checkboxes).
- **[EARS-3] (State-Driven - Matriz Obrigatória de 4 Estados)**: Para cada família de componentes, o showcase DEVE demonstrar deterministicamente os quatro estados operacionais canônicos:
  1. **Estado 1 (Dados / Pronto)**: Componente populado com dados tipados reais e interatividade funcional.
  2. **Estado 2 (Carregamento / Skeleton)**: Esqueleto animado espelhando rigorosamente a mesma geometria, largura e altura do estado pronto (Zero Cumulative Layout Shift - CLS).
  3. **Estado 3 (Vazio / Empty State)**: Superfície honesta com ícone semântico, título direto (máximo 6 palavras, sem títulos compostos), descrição concisa e ação corretiva (CTA).
  4. **Estado 4 (Erro / Falha Transacional)**: Superfície de diagnóstico com borda de feedback, descrição técnica sanitizada e botão de reintento (`Tentar novamente`).
- **[EARS-4] (Condicional - Ergonomia Tátil e Alvos de Toque)**: Em dispositivos móveis ou viewports compactas (<600px), todo controle clicável DEVE possuir dimensão mínima de 44x44px (`h-11` ou `min-h-[44px]`), garantindo conformidade com WCAG 2.2 AA Critério 2.5.8.
- **[EARS-5] (Ubíquo - Anéis de Foco Visíveis)**: Todo componente interativo DEVE exibir anel de foco de alto contraste (`focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`) ao ser navegado por teclado, sem exceção.
- **[EARS-6] (Comportamento Indesejado - Silêncio Visual e Erradicação de AI-Smell)**: A rota de showcase NÃO DEVE conter textos explicativos prolixos, cards conversacionais, gradientes utilitários, sombras decorativas espúrias ou bordas fora da grade de tokens.

---

## 3. Arquitetura das Camadas

### Camada 1: Primitivas Reutilizáveis (`src/components/ui/` e `src/components/ui/canonical/`)
- Consumo estrito de tokens semânticos (`--surface-canvas`, `--surface-card`, `--text-primary`, `--border-default`, etc.).
- Utilização de `Skeleton`, `EmptyState`, `Alert` e botões com variantes canônicas (`default`, `secondary`, `outline`, `destructive`, `ghost`).

### Camada 2: Rota do Showcase (`src/routes/workspace.design-system.tsx`)
- TanStack Router com sub-navegação em abas por família de componentes (`overview`, `actions`, `forms`, `surfaces`, `feedback`, `navigation`).
- Seletor de estado global / local: Alternância entre "Todos os Estados", "Dados", "Carregando", "Vazio" e "Erro".
- Ferramenta de inspeção de tokens CSS e métricas de acessibilidade.

---

## 4. Evidências de Aceite
1. Rota `/workspace/design-system` ativa e funcional.
2. 11 famílias de componentes renderizadas com a matriz completa de 4 estados.
3. 0 violações P0/P1 no Design Lint (`node scripts/design-lint.mjs --changed`).
4. Alvos de toque >= 44px e anéis de foco verificados em 100% dos controles.
5. Suíte Vitest verde e typecheck com 0 erros.
