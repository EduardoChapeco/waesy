# DESIGN.md — A Constituição Visual do Projeto Waesy (Design System 4.0)

## C.0 Como este Documento é Usado
Este documento é a constituição visual, especificação técnica normativa e autoridade máxima de design para todo o ecossistema Waesy.
É lido obrigatoriamente por todos os agentes, engenheiros e designers imediatamente após `AGENTS.md` e antes de qualquer modificação de código ou especificação.
Nenhuma decisão de cor, espaço, tipografia, raio, elevação, movimento, layout ou componente pode originar-se fora dos limites fixados aqui.
Qualquer alteração estrutural não prevista requer aprovação formal e registro imutável em `docs/design/DECISIONS.md`.
A conformidade deste documento é auditada de forma mecânica e determinística pelo executor `scripts/design-lint.mjs` (DL-01 a DL-30).

---

## C.1 Filosofia Central e Princípios de Produto

### Filosofia do Design
A interface do Waesy opera em dois polos perfeitos:
- **Desktop:** Software profissional, ambiente de trabalho de alta produtividade (como Linear, Stripe, Apple macOS, WhatsApp Desktop).
- **Mobile:** Aplicativo nativo com ergonomia refinada, thumb-zone precisa, sem jank e com resposta tátil instantânea (como Apple iOS, Uber, iFood).

A experiência deve ser percebida como:
**CALMA • PRECISA • RESPONSIVA • SOFISTICADA • RÁPIDA • PREVISÍVEL • CONFIÁVEL • FÁCIL DE LER**

O que o Waesy NUNCA deve parecer:
- Dashboard genérico de template ou painel Bootstrap antigo.
- Interface desordenada e entulhada de caixas e cards concorrentes.
- SaaS saturado com excesso de tons roxos ou azuis elétricos.
- Coleção inconsistente de componentes feitos por autores diferentes sem padrões unificados.
- UI gerada automaticamente sem hierarquia, cheia de textos prolixos, badges gigantes e botões duplicados.
- Excesso de sombras pesadas, gradientes decorativos ou ornamentos visuais desprovidos de função.

**Regra Suprema:** A interface deve comunicar clareza, ordem e contexto antes mesmo de o usuário ler o conteúdo textual.

---

## C.2 Os Sete Princípios Visuais Operacionais

### 1. Silêncio Visual
- Reduza o número de elementos visuais que disputam atenção simultânea.
- O contraste nasce prioritariamente de escala tipográfica, peso semântico, agrupamento lógico, espaçamento métrico e tonalidades neutras.
- Nem toda informação precisa de um Card ou de uma caixa delimitadora. Prefira espaços em branco e divisores quase imperceptíveis.

### 2. Hierarquia Imediata
- Em menos de 2 segundos de visualização em qualquer viewport, o usuário deve identificar:
  1. Onde está situado no produto.
  2. O que está diante dos seus olhos.
  3. Qual é a informação mais relevante da superfície.
  4. Quais ações operacionais estão disponíveis.
  5. Exatamente uma ação primária de destaque (`variant="default"`).

### 3. Densidade Controlada
- Workspaces corporativos e ferramentas analíticas demandam alta densidade informacional, mas densidade nunca é sinônimo de poluição visual.
- Tabelas de dados exibem dezenas de registros com clareza máxima quando as colunas são alinhadas, os cabeçalhos são discretos, os números utilizam fontes tabulares (`tabular-nums`) e ações secundárias ficam recolhidas até a necessidade.

### 4. Progressive Disclosure (Revelação Progressiva)
- Não exponha tudo simultaneamente. A ordem de apresentação é estrita:
  `Resumo de Alto Nível → Detalhes Relevantes → Ações Rápidas → Configurações e Filtros Avançados`.

### 5. Design por Leitura
- Desktop: Leitura natural em "Z" e "F" (esquerda → direita, topo → conteúdo central).
- Mobile: Leitura sequencial vertical com âncoras na zona do polegar (topo → feed vertical contido → barra ou gaveta de ação inferior).

### 6. Espaço em Branco como Elemento Estrutural
- Whitespace é ferramenta ativa de design. Delimita contextos, reduz a fadiga cognitiva e separa blocos sem a dependência contínua de bordas pesadas.

### 7. Cores com Significado Semântico
- Base majoritariamente acromática e neutra.
- Cores comunicam estado funcional e nada além:
  - **Verde:** Sucesso, aprovação, conciliação positiva.
  - **Âmbar:** Atenção, pendência, revisão requerida.
  - **Vermelho:** Erro crítico, bloqueio, dívida, cancelamento.
  - **Azul/Ciano:** Informação operacional, link utilitário.
  - **Violeta:** Copilot, automação inteligente, agentes de IA.

---

## C.3 A Arquitetura em 12 Camadas do Waesy Design System 4.0

O sistema de componentes é estritamente particionado em doze camadas desacopladas:

1. **01. FOUNDATION:** Geometria base, anti-jank, viewport locks, resets nativos, safe areas.
2. **02. TOKENS:** Dicionário W3C DTCG de cores, tipografia, raios, espaçamentos, elevação e tempos de movimento.
3. **03. PRIMITIVES:** Elementos atômicos com estados completos (Button, Input, Select, Checkbox, Switch, Radio, Avatar, Badge, Chip, Skeleton, Divider, Tooltip).
4. **04. COMPONENTS:** Blocos reutilizáveis focados (IconButton, SegmentedControl, Breadcrumbs, MetricCard, AlertBox, StatTile).
5. **05. COMPOUND COMPONENTS:** Primitivas compostas (DataTable, TableToolbar, ModalDialog, BottomSheet, FilterBar, CommandMenu).
6. **06. PATTERNS:** Arranjos canônicos de descoberta e navegação (CategoryBubbleCarousel, HorizontalProductShelf, OfferHero, MediaMosaic, SearchResultsGrid).
7. **07. SECTIONS:** Blocos estruturais de página (PageHeader, EntityHeader, MetricStrip, ActivityTimeline, EmptySection).
8. **08. LAYOUTS:** Cascas estruturais de ambiente (AppShell, DesktopShell, MobileShell, WorkspaceThreePane, WorkspaceTwoPane, MasterDetail).
9. **09. TEMPLATES:** Telas inteiras pré-configuradas (Dashboard, Transactions, CRMWorkspace, CopilotWorkspace, TravelResults).
10. **10. DOMAIN WIDGETS:** Módulos funcionais de nicho (FlightSearchWidget, FlightOfferCard, NativeCalendarWidget, DeliveryTracker).
11. **11. AI WIDGETS:** Superfícies conversacionais inteligentes (CopilotChatWorkspace, WidgetRegistry, InChatDataTable, InChatApproval).
12. **12. BUILDER BLOCKS:** Blocos dinâmicos do editor visual que consom o mesmo sistema sem duplicação de CSS.

---

## C.4 Estrutura de Tokens Semânticos

### 1. Cores de Superfície e Conteúdo
| Variável CSS | Papel Semântico | Light (Hex / Oklch) | Dark (Hex / Oklch) |
| --- | --- | --- | --- |
| `--canvas` | Fundo principal da aplicação | `#FFFFFF` / `oklch(1 0 0)` | `#0A0A0A` / `oklch(0.12 0 0)` |
| `--surface` | Fundo de painéis, abas e cartões | `#FFFFFF` / `oklch(1 0 0)` | `#141414` / `oklch(0.16 0 0)` |
| `--surface-raised` | Superfície elevada para popovers e menus | `#FFFFFF` / `oklch(1 0 0)` | `#1C1C1C` / `oklch(0.20 0 0)` |
| `--surface-subtle` | Fundo neutro suave para áreas secundárias | `#F9FAFB` / `oklch(0.98 0 0)` | `#181818` / `oklch(0.18 0 0)` |
| `--surface-hover` | Estado hovered de linhas e itens | `#F3F4F6` / `oklch(0.96 0 0)` | `#222222` / `oklch(0.22 0 0)` |
| `--surface-active` | Estado ativo / pressionado | `#E5E7EB` / `oklch(0.92 0 0)` | `#2A2A2A` / `oklch(0.26 0 0)` |

### 2. Tipografia e Cores de Texto
| Variável CSS | Papel Semântico | Contraste Mínimo |
| --- | --- | --- |
| `--text-primary` | Títulos, valores essenciais e corpo de leitura principal | >= 14:1 (WCAG AAA) |
| `--text-secondary` | Subtítulos, labels e descrições operacionais | >= 7:1 (WCAG AA) |
| `--text-tertiary` | Metadados, datas secundárias e legendas de apoio | >= 4.5:1 (WCAG AA) |
| `--text-disabled` | Estados desabilitados e placeholders neutros | >= 3:1 |
| `--text-inverse` | Texto contrastante sobre fundo primário escuro ou colorido | >= 10:1 |

### 3. Linhas e Contornos
| Variável CSS | Papel Semântico | Descrição |
| --- | --- | --- |
| `--border-subtle` | Divisórias internas, linhas de grade em tabelas | Linha ultra-discreta de 1px |
| `--border-default` | Borda padrão de cards, containers e cabeçalhos | Borda nítida de 1px |
| `--border-strong` | Borda de inputs ativos e componentes em foco | Contorno visível de alta percepção |

### 4. Acentos e Feedback
| Variável CSS | Função | Descrição |
| --- | --- | --- |
| `--accent` | Acento institucional do ecossistema | Roxo canônico Waesy (`#7C3AED`) |
| `--accent-hover` | Hover de botões de destaque | Roxo enriquecido (`#6D28D9`) |
| `--accent-soft` | Fundo sutil de tags e ícones do Copilot | Fundo translúcido com 10% de opacidade |
| `--success` | Sucesso, pago, finalizado, disponível | Verde neutro operacional (`#16A34A`) |
| `--warning` | Alerta, pendente, atenção requerida | Âmbar neutro operacional (`#D97706`) |
| `--danger` | Crítico, recusado, erro, exclusão | Vermelho neutro operacional (`#DC2626`) |
| `--info` | Notificação utilitária, guia de ajuda | Azul neutro operacional (`#2563EB`) |

### 5. Escala de Raios de Borda
- `--radius-xs`: 2px (micro-ajustes de tags mínimas e checkmarks)
- `--radius-sm`: 4px (badges, switches e micro-chips)
- `--radius-md`: 8px (botões padrão, inputs, seletores e menus suspensos)
- `--radius-lg`: 12px (cards operacionais, painéis médios)
- `--radius-xl`: 16px (containers mestres, drawers e painéis expandidos)
- `--radius-2xl`: 24px (superfícies de destaque, dialogs editoriais)
- `--radius-pill`: 9999px (chips de filtro, pills de busca e avatares circulares)

### 6. Escala Espacial (Grade 4px)
Valores estritos: `4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 64px, 80px`.
Proibido o uso de valores ímpares arbitrários (DL-03).

### 7. Escala Tipográfica Canônica
| Token Tipográfico | Tamanho (px / rem) | Line Height | Peso | Uso Obrigatório |
| --- | --- | --- | --- | --- |
| `Display` | 36px / 2.25rem | 40px | 600 Semibold | Grandes números, KPIs mestres |
| `PageTitle` | 24px / 1.50rem | 32px | 600 Semibold | Títulos de página no Desktop |
| `SectionTitle` | 20px / 1.25rem | 28px | 600 Semibold | Cabeçalhos de seção e painéis |
| `CardTitle` | 16px / 1.00rem | 24px | 600 Semibold | Títulos de cards e widgets |
| `Body` | 14px / 0.875rem | 20px | 400 Regular | Corpo padrão, formulários, tabelas |
| `BodySmall` | 12px / 0.75rem | 16px | 400 Regular | Metadados, descrições secundárias |
| `Label` | 12px / 0.75rem | 16px | 500 Medium | Rótulos de campos e formulários |
| `Caption` | 11px / 0.6875rem | 14px | 500 Medium | Micro-legendas, status em badges |
| `Metric` | 28px / 1.75rem | 32px | 600 Semibold | Indicadores numéricos, moedas |
| `DataValue` | 14px / 0.875rem | 20px | 500 Medium | Valores de tabela com `font-mono tabular-nums` |

---

## C.5 Sistema de Elevação em Camadas (Level 0 a Level 4)

Sombras são restritas a camadas contextuais e flutuantes. Em conformidade com o princípio Silencioso, a hierarquia é produzida por superfície, borda e espaçamento:

- **Level 0 (Canvas):** Fundo mestre da aplicação (`--canvas`), sombra nenhuma.
- **Level 1 (Surface):** Cards, blocos de dados e seções (`--surface` com contorno de 1px `--border-default`), sombra nenhuma.
- **Level 2 (Raised):** Painéis recolhíveis, master panel elevado com borda contrastante, sombra imperceptível de 1px.
- **Level 3 (Popover / Dropdown):** Menus de contexto, autocompletes, tooltips (`box-shadow: 0 4px 12px rgba(0,0,0,0.06)`).
- **Level 4 (Modal / Sheet):** Diálogos centrais e Bottom Sheets móveis sobre backdrop fosco (`box-shadow: 0 16px 40px rgba(0,0,0,0.12)`).

---

## C.6 Microacentos Cromáticos Sem Poluição

Cores vibrantes nunca tomam a tela inteira. São utilizadas exclusivamente como microacentos informativos:
- **Status Badges:** Pílulas compactas com fundo neutro suave (10% de opacidade) e texto de alto contraste na cor do token de feedback.
- **Micro-barras de progresso:** Indicadores discretos de 2px ou 4px de altura.
- **Pontos de status (Status Dots):** Pequenos círculos de 6px ou 8px com cor funcional para representar conexão, presença ou alerta.
- **Linhas guia:** Marcação sutil na lateral esquerda de cartões selecionados ou itens de alta prioridade.

---

## C.7 Arquitetura Desktop Shell (Workspace Nativo)

No desktop (viewport >= 840px), o Waesy opera como um software de alta ergonomia:
- **Shell Fixo:** `height: 100dvh`, `overflow: hidden`. Proibido o uso de scrollbar global no `body`.
- **Três Painéis Independentes (Three-Pane Layout):**
  1. **Global Rail (56px a 72px):** Barra ultra-compacta contendo navegação primária por ícones (Home, Copilot, CRM, Workspace, Agenda, Financeiro, Commerce, Builder, Apps, Configurações).
  2. **Master Panel (280px a 380px):** Painel contextual retrátil para filtros, listagens, conversas, tarefas, árvores de navegação e busca com rolagem própria.
  3. **Workspace Canvas (flex-1, min-w-0):** Área de trabalho principal com rolagem vertical independente, toolbar acoplada à informação manipulada e painel de apoio secundário sob demanda.

---

## C.8 Arquitetura Mobile Shell (App Nativo no Polegar)

Em telas compactas (viewport < 600px):
- **Overscroll Contido:** Prevenção de bounce indevido no viewport, mantendo sensação de software nativo (`overscroll-behavior: none`).
- **Dimensões Dinâmicas:** `100dvh` para contornar variações de barra de navegação dos browsers Safari e Chrome.
- **Piso de Área de Toque:** Todo botão, ícone interativo ou controle possui área de toque mínima de **44x44px** (`min-h-11 min-w-11`, DL-14).
- **Prevenção de Auto-Zoom:** Inputs utilizam tipografia mínima de 16px no mobile para impedir que o iOS force zoom de página indesejado.
- **Bottom Navigation Contextual:** Barra fixa de 44px a 56px no terço inferior da tela, que se oculta automaticamente (0ms) no foco de campos de texto.
- **Bottom Sheets sobre Modais:** Informações contextuais abrem como folhas inferiores com arraste e fechamento no polegar.

---

## C.9 Protocolo Anti-Jank e Blindagem Estrutural

Classes utilitárias canônicas obrigatórias:
- `.viewport-lock`: Trava fixa de tela em `100dvh`, eliminando vazamento de scroll.
- `.native-scroll`: Rolagem suave com toque inercial no iOS (`-webkit-overflow-scrolling: touch`), sem barra feia.
- `.safe-area-top` e `.safe-area-bottom`: Respeito a entalhes e barras gestuais de iPhones e smartphones modernos.
- `.touch-target`: Garante área tátil mínima de 44x44px sem esticar o ícone visual.
- `.no-touch-select`: Impede seleção indesejada de textos de UI durante toques rápidos ou gestos de arraste.
- `.no-overscroll`: Elimina o recuo da janela principal ao rolar gavetas e listas internas.
- `.keyboard-safe`: Previne compressão de docks ou subida indevida do cabeçalho na abertura do teclado virtual.

---

## C.10 Sistema de Tabelas Empresariais (DataTable)

Tabelas profissionais constituem o coração do ecossistema Waesy:
- **Capacidades Mínimas:** Seleção múltipla, ordenação ascendente/descendente por coluna, busca em tempo real, filtros facetados, paginação de alta densidade, fixação de colunas (sticky headers), visibilidade seletiva de colunas, ações por linha e ações em lote (bulk actions).
- **Desktop:** Tabela de alta densidade com células alinhadas, tipografia tabular nos números e linhas compactas (36px a 44px).
- **Mobile Adaptativo:** No celular, a tabela nunca é espremida horizontalmente. Ela se metamorfoseia em **Linhas Compactas Estruturadas** ou **Cards de Entidade** com Sheet de Detalhes no toque.

---

## C.11 Padrões de Descoberta e Vitrines Comerciais

Para produtos, serviços, viagens e classificados:
1. **CategoryBubbleCarousel:** Carrossel horizontal de bolhas com ícone/imagem circular e rótulo claro de 1 linha.
2. **HorizontalProductShelf:** Trilho com título da coleção, link sutil de navegação e cards com scroll horizontal suave.
3. **OfferHero:** Bloco editorial com imagem de alta fidelidade, badge de categoria, proposta de valor direta e CTA proeminente de 44px.
4. **MediaMosaic:** Grade assimétrica moderna com proporções canônicas que valoriza o conteúdo sem quebrar o alinhamento.
5. **SearchResultsGrid:** Grid fluida no desktop (3 ou 4 colunas) e lista estruturada no mobile.

---

## C.12 Arquitetura do Copilot e Widget Registry

O Copilot é uma superfície operacional viva, e não uma caixa de chat comum:
- **Registry Desacoplado:** Centralizado em `WidgetRegistry`, eliminando condicionais gigantes em cascata.
- **Widgets Estruturados:** Uma mensagem do Copilot é capaz de instanciar:
  - `data-table`: Tabela de dados interativa dentro da conversa.
  - `flight-search`: Busca e refinamento paramétrico de voos.
  - `flight-offers`: Carrossel de opções aéreas com cotação direta.
  - `approval`: Bloco transacional com aprovação em 1 clique (ex: conciliação, liberação de pagamento).
  - `form`: Formulário dinâmico pré-preenchido com validação instantânea.
  - `product-carousel`: Vitrine de itens ou serviços recomendados.

---

## C.13 Travel Copilot e Módulo de Turismo

Mecanismo conversacional especializado em turismo e mobilidade:
- **Interpretação e Parametrização:** Interpreta comandos livres (ex: "quero voos de Chapecó para Recife em janeiro para 2 adultos") e preenche os slots ausentes de forma transparente.
- **TravelIntentCard:** Cartão resumo de intenção com origem, destino, datas, passageiros, classe e bagagem.
- **FlightResultsWidget:** Exibição clara de opções de voo com companhia aérea, horários de partida/chegada, duração total, número de escalas, bagagem inclusa e preço formatado em destaque.
- **Filtros Imediatos:** Direto, 1 escala, com bagagem despachada, melhor opção, menor tempo de viagem.

---

## C.14 Catálogo Normativo de Regras e Proibições (DL-01 a DL-30)

| ID | Regra Normativa | Severidade | Impacto |
| --- | --- | --- | --- |
| DL-01 | Proibido cor literal hex/rgb fora dos tokens | P1 | Bloqueia merge |
| DL-02 | Proibido classes arbitrárias com valores entre colchetes (`-[...]`) | P1 | Bloqueia merge |
| DL-03 | Proibido espaçamento fora da grade modular de 4px | P1 | Bloqueia merge |
| DL-04 | Proibido uso de `!important` ou modificadores de força bruta | P0 | Bloqueia entrega |
| DL-05 | Proibido inline style com cor, sombra ou espaçamento estrutural | P1 | Bloqueia merge |
| DL-06 | Proibido z-index arbitrário fora da escala de tokens (teto 500) | P2 | Alerta de integridade |
| DL-07 | Proibido sombra decorativa em superfícies normais de aplicação | P2 | Alerta de integridade |
| DL-08 | Proibido gradiente decorativo em superfícies utilitárias de aplicação | P2 | Alerta de integridade |
| DL-09 | Proibido exceder os raios canônicos homologados | P2 | Alerta de integridade |
| DL-10 | Proibido exceder a escala modular tipográfica de 8 tamanhos | P2 | Alerta de integridade |
| DL-11 | Proibido ausência de estado de carregamento (Skeleton estruturado) | P1 | Bloqueia merge |
| DL-12 | Proibido ausência de estado vazio (Empty State com CTA de criação) | P1 | Bloqueia merge |
| DL-13 | Proibido ausência de estado de erro (Error State com retry acionável) | P1 | Bloqueia merge |
| DL-14 | Proibido alvo de toque abaixo de 44x44px no mobile (`h-11`) | P1 | Bloqueia merge |
| DL-15 | Proibido elemento interativo sem anel de foco visível (`:focus-visible`) | P0 | Bloqueia entrega |
| DL-16 | Proibido contraste de texto abaixo de 4.5:1 (WCAG 2.2 AA) | P0 | Bloqueia entrega |
| DL-17 | Proibido contraste de controle interativo abaixo de 3:1 | P0 | Bloqueia entrega |
| DL-18 | Proibido texto ou fundo branco/preto literal (`text-white`, `text-black`) | P1 | Bloqueia merge |
| DL-19 | Proibido título de tela com mais de 6 palavras | P2 | Alerta de concisão |
| DL-20 | Proibido subtítulo redundante em relação ao título principal | P2 | Alerta de concisão |
| DL-21 | Proibido parágrafo explicativo prolixo dentro de cartão | P3 | Alerta de concisão |
| DL-22 | Proibido mais de 2 linhas de texto contínuo em item de lista | P2 | Alerta de concisão |
| DL-23 | Proibido emoji na interface ou em arquivos técnicos normativos | P2 | Alerta de sobriedade |
| DL-24 | Proibido rótulo de botão com mais de 3 palavras | P2 | Alerta de ação |
| DL-25 | Proibido componentes duplicados ou concorrentes para o mesmo propósito | P2 | Alerta arquitetural |
| DL-26 | Proibido animação ou transição acima de 300ms de duração | P2 | Alerta de agilidade |
| DL-27 | Proibido transição genérica `transition-all` | P3 | Alerta de performance |
| DL-28 | Proibido ausência de suporte a movimento reduzido (`motion-reduce`) | P1 | Bloqueia merge |
| DL-29 | Proibido layout que não bifurca casca entre compacto e expandido | P2 | Alerta de adaptatividade |
| DL-30 | Proibido token semântico declarado sem consumo no sistema | P3 | Alerta de higiene |

---

## C.15 Primitivas Nativas da Homepage 3.0, CMS Omni-Builder & Bento Grid

O ecossistema da Página Inicial (`_store.index.tsx`) e o módulo de personalização do Admin Master (`admin-master.home-editor.tsx`) operam sob o padrão visual nativo industrial inspirado em Noor, iFood e Bento Grid Apple HIG, garantindo eliminação de *AI-smell*, zero efeito sanfona (CLS < 0.05) e controle CMS bilateral ponta a ponta (Invariante B.20):

### 1. `NoorNativeCategoryDock` (Menu Deslizante Mobile Nativo)
- **Papel:** Navegação horizontal contínua de alta fluidez em visualizações móveis e docks rápidos.
- **Física:** Trilho horizontal flexível com `overflow-x-auto snap-x mandatory no-scrollbar gap-3 py-2 px-1`.
- **Ergonomia e Acessibilidade:** Alvos de toque com dimensão mínima de 44x44px (`min-h-11 min-w-11`), física tátil suave `:active:scale-95 transition-transform duration-150` e anel de foco teclado `:focus-visible:ring-2`.
- **Zero Quebra de Layout:** Itens com largura intrínseca contida (`shrink-0 flex-shrink-0`), prevenindo encolhimento ou quebra de linha em telas compactas (<600px).

### 2. `IFoodSquareCategoryButton` (Botão Quadrado 1:1 de Categorias)
- **Papel:** Navegação visual por nichos, atalhos de delivery e categorias comerciais.
- **Geometria:** Quadrado perfeito `1:1` (`aspect-square`), com dimensões mínimas de 80x80px a 96x96px (`w-20 sm:w-24`) e cantos arredondados sem bordas duras (`rounded-lg bg-card border border-border/60`).
- **Comportamento Mídia Pura:** Quando `showText` for falso, a imagem preenche 100% da área do card (`object-cover size-full`). Quando verdadeiro, centraliza a mídia (`size-12 object-contain`) com rótulo conciso de 1 linha (`line-clamp-1 text-xs font-semibold`).

### 3. `MetamorphicBannerSlider` (Carrossel Anti-Jank com Seletor de Aspect Ratio)
- **Papel:** Hero banners e trilhos promocionais configuráveis pelo Admin Master.
- **Travas Anti-Jank (CLS = 0):** O contêiner de imagem bloqueia a proporção exata no CSS antes do carregamento da mídia:
  - `ifood`: `.aspect-banner-ifood` (`21/9` panorâmico mobile).
  - `16:9`: `.aspect-banner-cinema` (`16/9` cinema e widescreen).
  - `4:3`: `.aspect-banner-classic` (`4/3` clássico fotográfico).
  - `1:1`: `.aspect-banner-square` (`1/1` quadrado).
- **Controles Acessíveis:** Botões de paginação anterior/próximo acessíveis via teclado no desktop (`size-11 min-h-11`), dots suaves de indicação e autoplay que pausa instantaneamente ao toque ou hover.

### 4. `BentoGridTetris` (Grid Modular Widescreen Desktop)
- **Papel:** Acomodação visual assimétrica de hotpages, coleções e vitrines em telas maiores (>=840px).
- **Estrutura:** Grid responsivo de 4 colunas desktop com empacotamento denso automático (`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 grid-flow-dense gap-3 sm:gap-4`).
- **Acomodação Tetris Pack:** Spans modulares em largura (`grid_span_x` de 1 a 4) e altura (`grid_span_y` de 1 a 2) preenchem os vácuos sem buracos ou lacunas assimétricas.

### 5. `HomePostsShowcase` (Vitrine de Feed Social Anti-Quebra)
- **Papel:** Feed da comunidade e publicações locais em trilho horizontal.
- **Conformidade com Invariantes B.27 e B.30:** Estrutura completa de post social contendo:
  - Autor com badge de verificação opcional.
  - Avatar civil com renderização direta e fallback resiliente (`UserCircle`) sob erro de imagem.
  - Handle do perfil ou loja (`@handle`).
  - Badge discreto de categoria temática no topo da mídia.
  - Data relativa formatada em tempo real (`formatRelativeTime`).
  - Mídia com proporção rígida (`.aspect-post-card` 16:10) e resolução automática para capa editorial canônica caso o arquivo original seja corrompido (`resolveHealthyCover`).
  - Contadores de engajamento reais (curtidas e comentários).
  - CTA tátil primário obrigatório com piso mínimo de 44px (`min-h-11`).



---

## C.16 Arquitetura Bifurcada Congelada: Mobile Native App vs Desktop Native App System

O ecossistema Waesy rejeita o paradigma clássico de "site responsivo fluido" que deforma, espreme ou oculta aleatoriamente elementos de interface conforme a viewport oscila. Dispositivos móveis e computadores de mesa exigem arquiteturas de frontend congeladas e dedicadas à sua física operacional:

### 1. Mobile Native App Shell (Compact < 600px)
- **Comportamento Nativo Compilado:** A interface mimetiza as convenções de design da Apple (iOS HIG) e Google (Android Material 3).
- **Thumb Zone e Ancoragem Inferior:** Barras globais de navegação, seletores de filtros essenciais e botões de ação primária residem no terço inferior da tela móvel (`bottom-0` ou `sticky bottom-safe`), acessíveis sem esforço pelo polegar.
- **Safe-Area Inset Defensivo:** Aplicação rigorosa dos utilitários canônicos `pt-safe-modal` (ou `safe-top`) no topo, `top-safe-notch` para botões de fechar, `px-mobile-edge` nas margens móveis e `pb-safe` (ou `safe-bottom`) na base, impedindo que ilhas dinâmicas, entalhes ou barras de gestos sobreponham textos ou botões. Proibido o uso de classes com colchetes arbitrários.
- **Metamorfose de Diálogos:** Caixas de diálogo modais são terminantemente proibidas no mobile; convertem-se automaticamente em **Bottom Sheets / Gavetas Deslizantes de 100dvh** com detente inicial de 50% e fechamento por gesto descendente.
- **Trilhos Horizontais Táteis:** Categorias, atalhos rápidos e filtros utilizam trilhos contínuos com física de mola (`overflow-x-auto snap-x mandatory no-scrollbar gap-2`), erradicando quebras de linha em blocos verticais inflados.
- **Interação sem Hover:** Resposta visual tátil instantânea no toque (`active:scale-[0.985] active:opacity-85 transition-transform duration-100`) e proibição de dependência de hover para revelar ações essenciais.

### 2. Desktop Native App System (Expanded >= 840px)
- **Software Profissional Ancorado:** A interface inspira-se em softwares de alto padrão como Linear, Figma, Raycast e macOS Desktop.
- **Split-View e Painéis Mestre-Detalhe:** Navegação por colunas densas, barra lateral fixa com agrupamento semântico (`sidebar-width-expanded: 280px`), atalhos globais de teclado (`Cmd+K` / `Ctrl+K`) e tabelas de dados empresariais com ordenação por coluna e tipografia monoespaçada (`tabular-nums`).
- **Eliminação de Inflação Visual:** Proibição de controles ou botões com alturas desproporcionais que desperdiçam a densidade informacional do monitor.

### 3. Proibição de Duplicação Híbrida no DOM
- É proibido manter simultaneamente o layout de smartphone e o layout de computador renderizados no DOM e alternados apenas por classes utilitárias CSS (`block md:hidden` vs `hidden md:block`). A bifurcação deve ocorrer no nível de componente ou via o hook canônico `useWindowSizeClass()`, instanciando exclusivamente a casca viva correspondente ao dispositivo do usuário.

---

## C.17 Padrão Soberano de Squircles Grandes & Inteligência Tipográfica Anti-Truncate

### 1. A Anatomia do Squircle Generoso
- A assinatura geométrica soberana da plataforma é o **Squircle com Curvatura Contínua Apple HIG** (`squircle-card`, `rounded-3xl` / `rounded-2xl` / `rounded-card`).
- Em cartões de vitrine, fichas técnicas, blocos de produtos e destaques, os cantos arredondados contidos eliminam as quinas duras de cards genéricos, oferecendo sensação tátil agradável e moderna.
- Elevação flat pura: proibidas sombras decorativas difusas em superfícies de aplicação; o contraste e a delimitação decorrem de bordas sutis (`border border-border/60 hover:border-foreground/30`) e background sólido semitransparente.

### 2. Inteligência Tipográfica Anti-Truncate (Zero Informação Cortada)
- É terminantemente proibido o uso preguiçoso da classe CSS `truncate` ou reticências silenciosas (`...`) para mascarar títulos de anúncios, preços, condições de parcelamento, badges operacionais ou parâmetros chave de pacotes.
- O Design System opera com acomodação inteligente:
  1. **Quebra Natural de Linha:** O contêiner permite o avanço orgânico de texto em até 2 ou 3 linhas sem cortar palavras (`break-words text-wrap: balance / text-wrap: pretty whitespace-normal leading-tight`).
  2. **Escala Proporcional:** A tipografia ajusta-se dinamicamente (ex: `text-base sm:text-lg font-bold`), reduzindo o espaçamento entre letras (`tracking-tight`) e garantindo leitura cristalina em qualquer largura de cartão.
  3. **Padding Proporcional Compensado:** Em vez de colapsar o texto, o card adapta seu espaçamento interno (`p-4 sm:p-5`), preservando a hierarquia das pílulas semânticas.

---

## C.18 Engine TetrisGrid & BentoGrid com Empacotamento Denso e Zero Fallbacks

A **Engine TetrisGrid** é a fundação modular de vitrines assimétricas, blocos de campanhas e mosaicos de produtos em telas médias e expandidas:
1. **Empacotamento Denso Automático:** Consome `grid grid-flow-dense` com spans geométricos exatos em $X$ (`col-span-1` a `col-span-4`) e $Y$ (`row-span-1` a `row-span-2`), permitindo que blocos menores preencham lacunas de blocos maiores automaticamente.
2. **Fechamento Retangular Perfeito:** Em composições de 3 itens (1 hero 2x2 + 2 secundários), os 2 secundários no desktop ocupam 2 colunas cada empilhados verticalmente, preenchendo 100% da área do retângulo sem vácuos ou buracos assimétricos.
3. **Pillow Tiles com Squircle Suave:** Cada célula da grade adota a classe `squircle-card` / `rounded-2xl` com acabamento limpo e transições de hover suaves (`squircle-hover`, `duration-200`).
4. **Erradicação Total de Fallbacks Sintéticos (B.8 e B.33):** Proibido injetar URLs de imagens de bancos externos (Unsplash, Pexels) como fallback padrão. Se o item não possui mídia configurada, a célula DEVE renderizar um layout tipográfico editorial com fundo neutro, ícone vetorial temático e texto de alto contraste.

---

## C.19 Protocolo Anti-Jank & Anti-Efeito Sanfona (Isomorfismo Geométrico e CLS Nulo)

O "Efeito Sanfona" (Accordion Jank) — caracterizado pelo empurrão súbito de elementos verticais para baixo ou para cima durante o carregamento ou transição de abas — é rigorosamente proibido:
1. **Travamento Geométrico Prévio:** Banners, imagens de capa, sliders e avatares DEVEM declarar sua proporção exata e altura mínima diretamente no CSS (`aspect-[4/3]`, `aspect-[28/9]`, `aspect-[16/9]`, `min-h-44 sm:min-h-72`), impedindo que o navegador repinte ou reorganize o layout quando a imagem chegar da rede. O Cumulative Layout Shift (CLS) DEVE ser matematicamente inferior a 0.01.
2. **Skeletons Isomórficos 1:1:** O estado de carregamento de qualquer superfície deve espelhar com precisão micrométrica a geometria do componente final carregado (mesma altura de card, mesma pílula de categoria, mesma posição do botão de compra). Proibido substituir telas inteiras ou grades de produtos por um spinner de loading isolado girando no centro da tela.
3. **Animações Contidas em Transform e Opacity:** Toda transição visual deve operar exclusivamente nas propriedades de GPU (`transform` e `opacity`), sem alterar `height`, `margin` ou `padding` que forçam recálculo de layout do documento inteiro.
---

## C.20 O Mandato Soberano do Design Bidirecional, Stacks Mobile-First e Governança Anti-Chunks

### 1. Simetria Bilateral do CMS (Master ⇄ Vitrine ⇄ Workspace)
- Todo componente de vitrine pública (`_store.*`) — sejam hero banners, atalhos rápidos de nicho, docks de categorias ou vitrines de ofertas — DEVE possuir reflexo funcional de edição no Admin Master (`admin-master.*`) e no Workspace (`workspace.*`).
- Proibida a introdução de blocos estáticos isolados sem contrato no banco de dados (`marketplace_surfaces`, `marketplace_sections`, `hotpages`).

### 2. Stacks Mobile-First Native App
- O código de interface móvel (<600px) deve seguir o padrão de apps nativos modernos (iOS/Android):
  1. **Thumb Zone e Pilhas de Ação:** Controles primários acessíveis com uma mão no terço inferior.
  2. **Zero Safari Auto-Zoom:** Tamanho de fonte base de no mínimo 16px (`text-base sm:text-sm`) em inputs e textareas.
  3. **Gavetas de Ação:** Diálogos convertidos em sheets de 100dvh com arrasto para fechar.
  4. **Padrão WhatsApp List:** Listas verticais densas ponta a ponta (`px-mobile-edge sm:rounded-2xl`).

### 3. Desktop Web App de Alta Densidade
- Em viewports expandidas (>=840px), o ecossistema transforma-se em software profissional:
  1. **Zero Inflação:** Controles compactos de 32px a 36px (`h-8`/`h-9`) em tabelas densas e toolbars.
  2. **Multi-Painel:** Split-views com painel lateral fixo (280px) e atalhos rápidos (`Cmd+K`).
  3. **Números Tabulares:** Uso obrigatório de `tabular-nums` em moedas, datas e quantidades.

### 4. Governança Anti-Chunks & Orçamento Cloudflare
- O ecossistema protege a performance web (Core Web Vitals):
  1. **Code-Splitting Cirúrgico:** Importações dinâmicas por rota para impedir bundles monolíticos pesados.
  2. **Zero Dependências Circulares:** Validação contínua via `scripts/check-circular-deps.mjs`.
  3. **Zero Código Morto:** Varredura determinística via `scripts/dead-code-detector.mjs`.
  4. **Orçamento Gzip:** Rotas monitoradas e limitadas rigorosamente por `scripts/route-budget-guard.mjs`.
