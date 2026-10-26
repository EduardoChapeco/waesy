---
name: apple-design
description: >
  Revisor de UI/UX e Design System de alto padrão baseado no Apple Human Interface Guidelines (HIG)
  e adaptado universalmente para a plataforma Waesy (React + Tailwind CSS v4 + Radix UI + Phosphor/Lucide).
  Audita e impõe regras estritas de tipografia, contraste (WCAG AA/AAA), touch targets mínimos (44px),
  elevação em camadas, bifurcação congelada (Mobile Native App vs Desktop Native App), design bidirecional (CMS ⇄ Vitrine ⇄ Workspace),
  squircles grandes sem truncamento de texto, anti-jank, anti-chunks e engine TetrisGrid.
---

# Waesy Apple-Grade Design System & HIG Reviewer

Esta skill define os padrões de excelência visual, ergonomia e usabilidade canônica para o ecossistema **Waesy Platform**.

---

## 1. Princípios Fundamentais (Apple HIG adaptados)

1. **Design Bidirecional & Simetria CMS (Master ⇄ Vitrine ⇄ Workspace)**:
   - Todo componente promocional, banner, atalho de nicho ou trilho de vitrine pública (`_store.*`) DEVE possuir reflexo direto e editável no Admin Master (`admin-master.*`) e no Workspace (`workspace.*`).
   - É expressamente proibido declarar blocos estáticos com dados fixos no código sem espelho de governança no banco de dados.

2. **Bifurcação Nativa Congelada (Fim da Responsividade Fluida Tradicional)**:
   - Proibido o uso de sites responsivos fluidos que quebram ou espremem elementos.
   - **Mobile Native App Shell (< 600px):** UI congelada como app nativo compilado (Thumb Zone inferior, Bottom Sheets 100dvh, trilhos elásticos snap-x, safe area defensiva com `pt-safe-modal`, `top-safe-notch`, `px-mobile-edge`, `pb-safe`, alvos de toque $\ge 44$px).
   - **Desktop Native App System (>= 840px):** Aplicação profissional de alta produtividade (split-views, sidebars de 280px fixas, atalhos de teclado, tabelas monoespaçadas com `tabular-nums`, controles secundários compactos `h-8`/`h-9`).
   - **Zero Duplicação no DOM:** Proibido manter simultaneamente o layout móvel e o layout desktop renderizados no HTML com `block md:hidden` / `hidden md:block`. A bifurcação deve ocorrer via `useWindowSizeClass()`.

3. **Squircles Grandes & Inteligência Tipográfica Anti-Truncate**:
   - Assinatura geométrica soberana: **Squircle Generoso Apple HIG** (`squircle-card`, `rounded-3xl` / `rounded-2xl` / `rounded-card`).
   - **Zero Informação Cortada:** Proibido o truncamento cego com `truncate` ou `...` em títulos de anúncios, preços, condições de parcelamento ou especificações de nicho.
   - O contêiner acomoda o texto na íntegra através de escala tipográfica proporcional e quebra orgânica de linha (`break-words text-wrap leading-tight whitespace-normal`), utilizando truncamento estruturado multilinha (`line-clamp-2`) onde o grid exigir controle rigoroso de altura.

4. **Anti-Jank & Anti-Efeito Sanfona (Zero CLS)**:
   - Banners, capas e mídias possuem dimensões e aspect-ratio rigorosamente fixados no CSS antes do carregamento da imagem (`aspect-video`, `aspect-square`, `aspect-banner-classic`). Cumulative Layout Shift (CLS) $< 0.01$.
   - Skeletons de carregamento devem ser geometricamente isomórficos (proporção 1:1) ao componente populado. Proibido o uso de spinners soltos como estado de carregamento de listas ou páginas.

5. **Anti-AI Smell, Design Silencioso & Títulos Diretos**:
   - Proibido o uso de textos que explicam a própria tela ("Bem-vindo ao...", "Aqui você pode...").
   - Títulos de tela possuem teto máximo de 6 palavras; botões contêm no máximo 3 palavras (`[Verbo] + [Substantivo]`).
   - Subtítulos que repetem o título com mais de 70% de similaridade lexical são terminantemente proibidos.
   - Zero emojis na interface do produto ou documentos técnicos.

6. **Engine TetrisGrid & BentoGrid com Empacotamento Denso**:
   - Grid de 4 colunas desktop com `grid-flow-dense` e spans modulares exatos em X e Y.
   - Em composições de 3 itens (1 hero 2x2 + 2 secundários), os 2 secundários ocupam 2 colunas cada empilhados verticalmente para fechar o retângulo sem buracos.
   - Zero fallbacks de imagens externas (Unsplash/Pexels). Ausência de mídia renderiza layout tipográfico/editorial limpo de alto contraste.

7. **Ergonomia & Touch Targets (Piso dos 44px)**:
   - Todo elemento interativo clicável em dispositivos móveis possui área de toque mínima de **44x44px** (altura `h-11 min-h-11` ou `touch-target` com `:focus-visible:ring-2`).

8. **Hierarquia de Camadas e Elevação (Superfícies)**:
   - **Level 0 (Base)**: Fundo principal `bg-background` (`oklch(0.98 0 0)`).
   - **Level 1 (Cards & Conteúdo)**: `bg-card` (`#FFFFFF`), borda sutil de 1px (`border-border/80`), cantos squircle contidos (`rounded-2xl`).
   - **Level 2 (Barras Flutuantes & Sticky)**: `bg-background/95 backdrop-blur-md border-b border-border/40` em `z-30`.
   - **Level 3 (Overlays / Modais / Drawers)**: `bg-background rounded-2xl shadow-xl` em `z-50`.

9. **Governança Anti-Chunks & Orçamento Cloudflare**:
   - Code-splitting cirúrgico por rota para garantir pacotes gzip leves e carregamento instantâneo.
   - Zero dependências circulares (`check:cycles`) e zero código morto órfão (`check:deadcode`).

---

## 2. Tabela de Tradução Apple HIG -> Waesy Stack

| Conceito Apple HIG | Equivalente Waesy Stack (React + Tailwind v4 + Radix) | Regra de Implementação |
| :--- | :--- | :--- |
| **SF Pro / Typography** | `Inter, system-ui, -apple-system, sans-serif` | `font-sans`, pesos 400, 500, 600, 700. Tabular nums global. |
| **Continuous Corners** | `rounded-xl (16px)`, `rounded-2xl (24px)`, `rounded-3xl` | Squircles generosos com curvatura contínua. Sem colchetes arbitrários. |
| **Touch Target 44pt** | `h-11 min-h-11` ou `touch-target` | Botões primários mobile e inputs sempre `h-11`. |
| **Safe Area Insets** | `pt-safe-modal`, `top-safe-notch`, `px-mobile-edge`, `pb-safe` | Utilitários semânticos canônicos sem classes com colchetes arbitrários. |
| **Anti-Truncate Intelligence** | `break-words text-wrap leading-tight whitespace-normal` | Informações essenciais acomodadas na íntegra sem corte. |
| **Tetris Dense Grid** | `grid-flow-dense`, spans modulares e fechamento retangular | Sem vácuos ou lacunas na malha widescreen. |
| **Action Sheet / Drawer** | `SheetPage` / `Drawer` via Radix / Vaul (`100dvh` mobile) | Abertura inferior no mobile com safe-area no entalhe. |
| **Desktop High Density** | Split-views, sidebars de 280px e controles `h-8`/`h-9` | Densidade máxima de dados sem inflar elementos móveis. |

---

## 3. Checklist de Auditoria de Design

Ao criar ou editar qualquer tela na plataforma Waesy, execute a seguinte verificação:
1. **Design Bidirecional**: Os blocos comerciais e de vitrine possuem espelho de edição no Admin Master / Workspace?
2. **Bifurcação Limpa**: A tela utiliza `useWindowSizeClass()` sem duplicar árvores DOM no HTML via `block md:hidden`?
3. **Anti-Truncate**: Há algum título, preço ou badge cortado com reticências (`...`) dentro dos cards squircles?
4. **Anti-Jank / Anti-Sanfona**: Os contêineres de mídia possuem aspect ratio fixo antes de carregar e skeletons isomórficos 1:1?
5. **Anti-AI Smell**: Foram eliminadas mensagens explicativas prolixas, emojis e saudações desnecessárias?
6. **Touch Targets**: Todos os botões e links no mobile têm área de toque >= 44px (`h-11`)?
7. **TetrisGrid**: A grade bento preenche 100% da largura sem buracos assimétricos e sem fallbacks de bancos externos?
8. **Thumb-Zone & Safe-Area**: Ações primárias no terço inferior e safe-area defensiva com `pt-safe-modal`, `top-safe-notch` e `pb-safe`?
9. **Anti-Chunks**: A rota utiliza code-splitting limpo sem dependências circulares e respeita o orçamento gzip?
