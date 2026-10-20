---
name: apple-design
description: >
  Revisor de UI/UX e Design System de alto padrão baseado no Apple Human Interface Guidelines (HIG)
  e adaptado universalmente para a plataforma Waesy (React + Tailwind CSS v4 + Radix UI + Phosphor/Lucide).
  Audita e impõe regras estritas de tipografia, contraste (WCAG AA/AAA), touch targets mínimos (44px),
  elevação em camadas, bifurcação congelada (Mobile Native App vs Desktop Native App), squircles grandes
  sem truncamento de texto, anti-jank e engine TetrisGrid.
---

# Waesy Apple-Grade Design System & HIG Reviewer

Esta skill define os padrões de excelência visual, ergonomia e usabilidade canônica para o ecossistema **Waesy Platform**.

---

## 1. Princípios Fundamentais (Apple HIG adaptados)

1. **Bifurcação Nativa Congelada (Fim da Responsividade Fluida Tradicional)**:
   - Proibido o uso de sites responsivos fluidos que quebram ou espremem elementos.
   - **Mobile Native App Shell (< 600px):** UI congelada como app nativo compilado (Thumb Zone inferior, Bottom Sheets 100dvh, trilhos elásticos snap-x, safe area defensiva, alvos de toque $\ge 44$px).
   - **Desktop Native App System (>= 840px):** Aplicação profissional de alta produtividade (split-views, sidebars fixas, atalhos de teclado, tabelas monoespaçadas com `tabular-nums`).
   - **Zero Duplicação no DOM:** Proibido manter simultaneamente o layout móvel e o layout desktop renderizados no HTML com `block md:hidden` / `hidden md:block`. A bifurcação deve ocorrer via `useWindowSizeClass()`.

2. **Squircles Grandes & Inteligência Tipográfica Anti-Truncate**:
   - Assinatura geométrica soberana: **Squircle Generoso Apple HIG** (`squircle-card`, `rounded-3xl` / `rounded-2xl` / `rounded-card`).
   - **Zero Informação Cortada:** Proibido o truncamento preguiçoso com `truncate` ou `...` em títulos de anúncios, preços, condições de parcelamento ou especificações de nicho.
   - O contêiner acomoda o texto na íntegra através de escala tipográfica proporcional e quebra orgânica de linha (`break-words text-wrap: balance/pretty whitespace-normal leading-tight`).

3. **Anti-Jank & Anti-Efeito Sanfona (Zero CLS)**:
   - Banners, capas e mídias possuem dimensões e aspect-ratio rigorosamente fixados no CSS antes do carregamento da imagem (`aspect-[4/3]`, `aspect-[28/9]`, `aspect-[16/9]`). Cumulative Layout Shift (CLS) $< 0.01$.
   - Skeletons de carregamento devem ser geometricamente isomórficos (proporção 1:1) ao componente populado. Proibido o uso de spinners soltos como estado de carregamento de listas ou páginas.

4. **Engine TetrisGrid & BentoGrid com Empacotamento Denso**:
   - Grid de 4 colunas desktop com `grid-flow-dense` e spans exatos em X e Y.
   - Em composições de 3 itens (1 hero 2x2 + 2 secundários), os 2 secundários ocupam 2 colunas cada empilhados verticalmente para fechar o retângulo sem buracos.
   - Zero fallbacks de imagens externas (Unsplash/Pexels). Ausência de mídia renderiza layout tipográfico/editorial limpo de alto contraste.

5. **Ergonomia & Touch Targets (Piso dos 44px)**:
   - Todo elemento interativo clicável em dispositivos móveis possui área de toque mínima de **44x44px** (altura `h-11` ou hit-area expandida com `:focus-visible:ring-2`).

6. **Hierarquia de Camadas e Elevação (Superfícies)**:
   - **Level 0 (Base)**: Fundo principal `bg-background` (`oklch(0.98 0 0)`).
   - **Level 1 (Cards & Conteúdo)**: `bg-card` (`#FFFFFF`), borda sutil de 1px (`border-border/80`), cantos squircle contidos (`rounded-2xl`).
   - **Level 2 (Barras Flutuantes & Sticky)**: `bg-background/95 backdrop-blur-md border-b border-border/40` em `z-30`.
   - **Level 3 (Overlays / Modais / Drawers)**: `bg-background rounded-2xl shadow-xl backdropEscuro 50%` em `z-50`.

---

## 2. Tabela de Tradução Apple HIG -> Waesy Stack

| Conceito Apple HIG | Equivalente Waesy Stack (React + Tailwind v4 + Radix) | Regra de Implementação |
| :--- | :--- | :--- |
| **SF Pro / Typography** | `Inter, system-ui, -apple-system, sans-serif` | `font-sans`, pesos 400, 500, 600, 700. Tabular nums global. |
| **Continuous Corners** | `rounded-xl (12px)`, `rounded-2xl (16px)`, `rounded-3xl (24px)` | Squircles generosos com curvatura contínua. Sem brutalismo. |
| **Touch Target 44pt** | `min-h-[44px] min-w-[44px]` ou `h-11` | Botões primários mobile e inputs sempre `h-11`. |
| **Anti-Truncate Intelligence** | `break-words text-wrap leading-tight whitespace-normal` | Informações essenciais acomodadas na íntegra sem corte. |
| **Tetris Dense Grid** | `grid-flow-dense`, spans modulares e fechamento retangular | Sem vácuos ou lacunas na malha widescreen. |
| **Action Sheet / Drawer** | `SheetPage` / `Drawer` via Radix / Vaul (`100dvh` mobile) | Abertura inferior no mobile com safe-area no entalhe. |

---

## 3. Checklist de Auditoria de Design

Ao criar ou editar qualquer tela na plataforma Waesy, execute a seguinte verificação:
1. **Bifurcação Limpa**: A tela utiliza `useWindowSizeClass()` sem duplicar árvores DOM no HTML?
2. **Anti-Truncate**: Há algum título, preço ou badge cortado com reticências (`...`) dentro dos cards squircles?
3. **Anti-Jank / Anti-Sanfona**: Os contêineres de mídia possuem aspect ratio fixo antes de carregar e skeletons isomórficos 1:1?
4. **Touch Targets**: Todos os botões e links no mobile têm área de toque >= 44px (`h-11`)?
5. **TetrisGrid**: A grade bento preenche 100% da largura sem buracos assimétricos e sem fallbacks de bancos externos?
6. **Thumb-Zone & Safe-Area**: Ações primárias no terço inferior e safe-area defensiva com `env(safe-area-inset-top)` e `bottom-safe`?
