# LAYOUT-ADAPTIVE.md — Arquitetura de Layouts Congelados & Bifurcação Nativa

## 1. O Fim da Responsividade Fluida Tradicional
O ecossistema Waesy rejeita categoricamente o paradigma de "site responsivo flexível" que espreme, quebra ou deforma controles conforme a largura da viewport varia. Dispositivos móveis e computadores desktop possuem naturezas mecânicas, densidades cognitivas e ergonomias físicas incompatíveis com uma mesma árvore CSS fluida.

O sistema opera com **Frontends Dedicados e Congelados por Dispositivo**:
- **Mobile Native App (< 600px):** Mimetiza um aplicativo compilado nativo (iOS / Android) com física tátil, Thumb Zone inferior, Safe Areas defensivas, gavetas (Bottom Sheets) de 100dvh e barras flutuantes em `z-30`.
- **Desktop Native App (>= 840px):** Mimetiza uma aplicação profissional de alta produtividade (macOS, Linear, Figma) com Split-Views densos, sidebars canônicas fixas, atalhos de teclado, grids ordenados e tabelas monoespaçadas.

---

## 2. As Três Classes de Janela (Window Size Classes)

| Classe de Janela | Breakpoint Largura | Colunas | Gutter | Margem Externa | Paradigma Visual e Mecânico |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Compact** | `< 600px` | 4 fluidas / pilha única | 12px | 16px (ou 0px full-bleed) | **Mobile Native App Shell:** Navegação no polegar, listas verticais de cards squircles, Bottom Sheets 100dvh, snap scroll elástico horizontal para chips. |
| **Medium** | `600px .. 839px` | 8 fluidas | 16px | 24px | **Tablet Híbrido:** Trilhos laterais recolhíveis, Split-views balanceadas, barras contextuais adaptativas. |
| **Expanded** | `>= 840px` | 12 fluidas | 24px | 32px (max 1440px) | **Desktop Native App System:** TetrisGrid / BentoGrid 4 colunas, Master-Detail lateral (320-380px), tabelas empresariais de alta densidade com paginação rápida. |

---

## 3. Diretriz Pétrea Anti-Duplicação no DOM
É terminantemente proibido manter simultaneamente o layout móvel e o layout desktop renderizados no HTML e alternados apenas via classes utilitárias CSS (`block md:hidden` e `hidden md:block` duplicando nós pesados inteiros):
- **Problema:** Duplicação desnecessária de nós no DOM, desperdício de memória, lentidão na hidratação SSR e quebra visual quando scripts recalculam alturas.
- **Regra Obrigatória:** A bifurcação deve ocorrer no nível do React utilizando o hook canônico `useWindowSizeClass()` ou componentes bifurcados dedicados (`MobileView` vs `DesktopView`), garantindo que apenas uma única casca viva exista no DOM para cada render.

---

## 4. Padrões Canônicos de Arquitetura

### 4.1. Lista-Detalhe (Master-Detail)
- **Compact (<600px):** A lista de cartões ocupa 100% da viewport. O toque em um registro executa transição nativa de rota ou abre um Bottom Sheet deslizante de tela cheia (`100dvh`) com botão `<X>` ou retorno posicionado abaixo do entalhe de hardware (`top-[max(1rem,env(safe-area-inset-top))]`).
- **Expanded (>=840px):** Layout dividido em 2 colunas concorrentes:
  - Painel Mestre (Esquerda): Largura fixa entre 320px e 380px com scroll vertical isolado e busca integrada.
  - Painel Detalhe (Direita): Ocupa o espaço restante (`flex-1`), exibindo formulários densos, dados contábeis e ações contextuais.

### 4.2. Painel de Apoio (Supporting Panel)
- **Compact:** Filtros, drawers de detalhes e formulários contextuais abrem como Bottom Sheet ocupando até 100dvh, com detente inicial em 50% e dispensa por gesto descendente.
- **Expanded:** Dockado permanentemente à direita da tela (320px), permitindo edição simultânea sem oclusão da área de trabalho.

### 4.3. TetrisGrid & BentoGrid
- **Compact:** Feed linear em pilha única vertical ou carrosséis horizontais dedicados (`snap-x mandatory`).
- **Expanded:** Grid modular de 4 colunas com empacotamento denso automático (`grid-flow-dense`). Em arranjos de 3 itens (1 hero 2x2 + 2 secundários), os 2 secundários preenchem 2 colunas cada empilhados verticalmente, fechando o retângulo sem lacunas.

---

## 5. Protocolo Anti-Jank & Anti-Efeito Sanfona (Zero CLS)

O "Efeito Sanfona" ocorre quando elementos verticais colapsam ou expandem bruscamente durante o carregamento de dados ou clique em abas, empurrando o restante da tela para baixo:
1. **Aspect Ratio Travado:** Banners, capas e mídias DEVEM possuir classe canônica de aspect ratio fixada no CSS antes do carregamento (`aspect-[4/3]`, `aspect-[28/9]`, `aspect-[16/9]`, `min-h-44 sm:min-h-72`). CLS matemático $< 0.01$.
2. **Skeletons Isomórficos:** Os blocos de carregamento devem compartilhar exatamente a mesma geometria, altura e padding do componente populado final. É proibido o uso de spinners soltos no centro da tela.
3. **Isolamento de GPU:** Transições e animações devem atuar exclusivamente sobre `transform` e `opacity`, preservando o fluxo de renderização do navegador.

---

## 6. Squircles Grandes & Inteligência Tipográfica Anti-Truncate

1. **Raio Squircle Soberano:** Cards e blocos adotam cantos amplos de curvatura contínua Apple HIG (`squircle-card`, `rounded-3xl` / `rounded-2xl` / `rounded-card`).
2. **Inteligência Anti-Truncate:** Informações essenciais (títulos, preços, parcelas, dados de nicho e badges) NÃO PODEM ser cortadas com `truncate` ou reticências silenciosas (`...`).
3. **Acomodação Orgânica:** O texto quebra em até 2 ou 3 linhas com `break-words text-wrap leading-tight whitespace-normal`, enquanto a escala tipográfica proporcional e o padding interno compensam a área útil, mantendo a geometria imponente do squircle.

---

## 7. Desobstrução de Safe-Area e Deconflito de Z-Index

1. **Safe-Area Inset Defensivo:** Modais e sheets móveis aplicam `pt-[max(1.25rem,env(safe-area-inset-top))]` e botão `<X>` em `top-[max(1rem,env(safe-area-inset-top))]`.
2. **Hierarquia de Z-Index:**
   - Conteúdo de Página / Cards: `z-0` a `z-10`.
   - Headers e TopBars: `z-20`.
   - Barras de Ação Flutuantes e Rodapés Fixos (`ClassifiedFloatingActionBar`, `sticky-footer`): **Estritamente `z-30`**.
   - DialogOverlay / Modais / Sheets de Tela Cheia: **Estritamente `z-50`**.
   - Notificações Toast (Sonner): `z-100`.
3. **Folga de Rolagem Inferior:** Contêineres de scroll que possuem barras flutuantes inferiores DEVEM possuir folga mínima de `pb-32 pb-safe` para garantir que o último cartão da lista nunca seja ocluído pela barra de ação.
