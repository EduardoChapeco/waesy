# DOUTRINA EXECUTÁVEL DE ADAPTATIVIDADE: COMPACT, MEDIUM E EXPANDED
**Documento Normativo**: `ia/14-doutrina.md`  
**Referência Canônica**: `docs/design/DESIGN.md` (Princípio 6: Nativo por Plataforma; C.4 Grade Modular; C.8 Adaptatividade)  
**Status**: Doutrina Aprovada — Vinculante para todo desenvolvimento de UI no ecossistema Waesy.

---

## 1. Fundamentação Teórica e Filosofia Arquitetural

Dispositivos móveis compactos (<600px) e desktops expandidos (>=840px) não são a mesma aplicação com zoom alterado. São dois produtos especializados distintos com fisiologias de uso divergentes:
1. **Compact (< 600px)**: Operado predominantemente por polegar único em ambientes dinâmicos, com tela vertical restrita, teclado virtual invasivo e latência de toque. Exige foco em um único objetivo por superfície, ergonomia de terço inferior (Hoober thumb zone; Fitts 1954) e navegação em profundidade por pilha (stack navigation).
2. **Medium (600px a 839px)**: Tablets (iPad Mini/Air portrait, foldables abertos). Área útil intermediária. Proibido tratar como smartphone esticado ou desktop comprimido. Exige colunas balanceadas, trilho de ícones lateral (Navigation Rail) e sheets laterais.
3. **Expanded (>= 840px)**: Desktops, laptops e monitores panorâmicos operados por mouse/trackpad e teclado físico. Ampla área horizontal, precisão micrométrica de clique, suporte a multi-janelas e foco em alta densidade de informação (Bento Grids, Master-Detail multi-colunas e tabelas analíticas).

---

## 2. As Três Classes Operacionais

### 2.1 Classe COMPACT (< 600px) — Smartphone / Mobile First

| Dimensão | Especificação Canônica |
| :--- | :--- |
| **Viewport Largura** | Menor que 600px (típico: 360px a 430px; base de teste: 390x844). |
| **Navegação** | **Inferior Fixa (Polegar)**: `<MobileNav>` dockada em `fixed bottom`, com 5 tabs fixas (Apple HIG), altura `h-12` (48px), touch targets de 48x48px. Zero navegação lateral oculta em gaveta de hambúrguer lenta. Topo com `<NativeMobileHeader>` atômico (título de até 3 palavras + botão voltar nativo). |
| **Tipo de Lista** | **Edge-to-Edge Vertical de 1 Coluna (`grid-cols-1`)**: Itens de lista estilo WhatsApp / iOS Settings, divisores sutis de 1px (`border-b border-border/40`), padding horizontal `px-4`. Scroll horizontal contínuo snap suave (`snap-x snap-mandatory`) restrito a chips de filtro rápidos e carrosséis de destaque editorial. |
| **Uso de Sheet** | **Bottom Sheet Inferior Modal (100dvh ou 85vh)**: Todo filtro avançado, formulário de apoio, seletor de endereço ou menu contextual abre deslizando de baixo para cima (`side="bottom"`), com puxador tátil (drag handle) e botão de fechamento acessível no polegar. Proibido modais flutuantes centralizados largos. |
| **Master-Detail** | **Navegação em Pilha (Stack Navigation)**: A lista mestre ocupa 100% da largura útil. O clique em um registro navega para uma nova rota ou tela cheia de detalhes com transição rápida (<200ms) e `<NativeBackButton>` no topo esquerdo. Proibido dividir a tela em duas colunas verticais concorrentes. |
| **Densidade de Linha** | **Ergonômica e Confortável**: Altura de linha de lista entre 48px e 56px (`h-12` a `h-14`). Inputs de formulário com altura fixa de 44px (`h-11`) ou 48px (`h-12`). Espaçamento entre seções travado em 16px (`space-y-4`) ou 20px (`space-y-5`). |
| **Alvo de Toque (Touch Target)** | **Mínimo Absoluto de 44x44px (`h-11 min-w-11`)**: Todo botão, ícone interativo, checkbox, tag clicável e link possui área de acionamento física de 44x44px no mínimo (WCAG 2.2 AA 2.5.8; Apple HIG). Gutter mínimo de 8px entre alvos adjacentes. |
| **Largura de Leitura** | **Fluida delimitada**: 100% da viewport menos 32px de margem externa (`px-4`), garantindo que textos contínuos quebrem antes de ultrapassar os limites visuais da tela. |
| **O que é PROIBIDO renderizar** | 1. Barras laterais desktop (`<ContextSidebar>`, `<GlobalRail>`)<br>2. Bento grids com 3 ou mais colunas fixas (`grid-cols-3`, `grid-cols-4`, `grid-cols-12`)<br>3. Tabelas de dados tradicionais com mais de 2 colunas visíveis sem conversão em cards verticais<br>4. Modais centralizados flutuantes com largura fixa em pixels (`w-[500px]`)<br>5. Dupla barra fixa simultânea no topo consumindo >20% da tela útil<br>6. Tipografia display gigante (>32px / `text-4xl` sem clamp responsivo)<br>7. Elementos interativos menores que 44px sem envelope de toque invisível<br>8. Tooltips dependentes exclusivamente do evento de mouse hover. |

---

### 2.2 Classe MEDIUM (600px a 839px) — Tablet Portrait / Foldables

| Dimensão | Especificação Canônica |
| :--- | :--- |
| **Viewport Largura** | 600px a 839px (base de teste: 834x1112 iPad Air portrait). |
| **Navegação** | **Navigation Rail Dockado**: Barra lateral estreita de 64px a 68px (`w-16`) dockada à esquerda contendo ícones verticais com tooltips ou rótulos micro inferiores. `<MobileNav>` inferior é **completamente suprimida** para economizar altura vertical. `<TopBar>` superior compacta com busca inline recolhida. |
| **Tipo de Lista** | **Grade Balanceada de 2 Colunas (`grid-cols-2`)**: Espaçamento entre cartões de 16px (`gap-4`), preenchendo harmoniosamente a largura da tela sem esticar um card único para 750px e sem comprimir itens em 3 colunas espremidas. |
| **Uso de Sheet** | **Side Sheet Lateral à Direita (`side="right"`, largura 380px)** ou Bottom Sheet de 70vh com handle. O conteúdo principal atrás permanece visível com overlay escuro sutil. |
| **Master-Detail** | **Master-Detail Assistido ou Split-View 40/60**: Em modo paisagem ou tablets amplos, coluna de lista de 300px à esquerda e painel de leitura/detalhes à direita (`flex-1`). Em modo retrato, navegação empilhada com transição instantânea ou split-view colapsável. |
| **Densidade de Linha** | **Intermediária Operacional**: Altura de linha entre 40px e 44px (`h-10` a `h-11`). Tabelas compactas com até 4 colunas essenciais. |
| **Alvo de Toque (Touch Target)** | **Mínimo de 44x44px**: Como tablets são primariamente dispositivos de toque, a exigência de 44x44px permanece ativa para qualquer interação física direta. |
| **Largura de Leitura** | **Controlada em 540px a 680px (`max-w-xl` a `max-w-2xl`)**: Textos editoriais e artigos nunca ocupam toda a extensão de 800px para evitar fadiga ocular e perda de linha ao retornar o olhar. |
| **O que é PROIBIDO renderizar** | 1. Bottom navigation bar de celular (que rouba área vertical preciosa)<br>2. ContextSidebar aberta com 256px de largura (roubaria 35% a 40% da tela total de 650-750px)<br>3. Bento Grids com 4 ou mais colunas fixas<br>4. Cards esticados em 1 coluna ocupando 800px de largura com texto disperso<br>5. Barras de checkout ou CTAs fixos cobrindo o conteúdo sem compensação de padding. |

---

### 2.3 Classe EXPANDED (>= 840px) — Desktop / Laptop / Monitores Panorâmicos

| Dimensão | Especificação Canônica |
| :--- | :--- |
| **Viewport Largura** | 840px ou superior (base de teste: 1280x800 e 1440x900). |
| **Navegação** | **ContextSidebar Expandida (240px a 256px)** dockada à esquerda com agrupamento hierárquico por módulos, estado ativo semântico e links diretos. **TopBar Superior Rica**: busca universal instantânea com atalho de teclado visual (`⌘K`), seletor de organização e utility cluster. Zero navegação inferior. |
| **Tipo de Lista** | **Bento Grid Operacional Assimétrico (3 a 4 colunas)** ou **Tabelas de Alta Densidade**: Cartões com proporções de 1:1, 2:1 ou span duplo agrupados por afinidade visual; tabelas com múltiplas colunas informativas, ordenação, seleção em lote e ações flutuantes no hover. |
| **Uso de Sheet** | **Supporting Panel Dockado (Painel de Apoio de 320px a 400px)** dockado à direita sem sobrepor o fluxo de dados, ou Sheet lateral deslizante (`side="right"`) para inspeções rápidas sem descontextualizar o operador. |
| **Master-Detail** | **Master-Detail Canônico Multi-Colunas Simultâneas**: Navegação Principal (240px) + Lista Mestre de Registros (340px a 380px com scroll próprio) + Painel de Detalhes e Ações Principais (`flex-1`, 600px+ com scroll independente). Zero navegação cega por troca de página. |
| **Densidade de Linha** | **Alta Densidade (Compact Data)**: Altura de linha entre 36px e 40px (`h-9` a `h-10`) em tabelas analíticas; fontes mono tabulares para números, moedas e SKUs (`font-mono text-xs`); respiros de 24px entre blocos de painéis. |
| **Alvo de Toque / Clique** | **Alvos de Clique de Mouse Ergonômicos (mínimo 32px / `h-8`)**: Suporte completo a atalhos de teclado, tabulação sequencial acessível e anel de foco visível de 2px (`focus-visible:ring-2 focus-visible:ring-primary/20`). |
| **Largura de Leitura** | **Travada nos Tokens Canônicos**: Artigos e formulários limitados a `max-w-reading` (760px); feed social a `max-w-feed` (680px); painéis de workspace limitados a `max-w-workspace` (1440px) centralizados com margem auto. |
| **O que é PROIBIDO renderizar** | 1. Bottom navigation bars móveis de qualquer natureza<br>2. Headers mobile isolados com botão voltar quando a rota já possui breadcrumb ou sidebar<br>3. Bottom sheets inferiores que sobem cobrindo a tela do monitor<br>4. Listas simplificadas de 1 coluna em tela cheia que desperdiçam mais de 65% do monitor desktop<br>5. Ações primárias flutuantes fixas no canto inferior da janela escondidas fora do campo de visão do formulário<br>6. Menus móveis em tela cheia. |

---

## 3. Matriz Comparativa Sintética

| Dimensão | Compact (<600px) | Medium (600 a 839px) | Expanded (>=840px) |
| :--- | :--- | :--- | :--- |
| **Container Mestre** | 100% fluido (`w-full px-4`) | Fluido com margem 24px | Max 1440px centralizado |
| **Grade de Conteúdo** | 1 coluna (`grid-cols-1`) | 2 colunas (`grid-cols-2`) | 3 a 4 colunas / Bento Grid |
| **Menu Principal** | Fixed Bottom (5 tabs) | Left Rail (64px ícones) | Left Sidebar (256px aberto) |
| **Menu Secundário / Ações** | Bottom Sheet (100dvh) | Side Sheet (380px direita) | Painel Dockado lateral direito |
| **Navegação Detalhe** | Pilha cheia (Full-page push) | Split view ou Pilha assistida | Master-Detail 3 colunas simultâneas |
| **Target Interativo Mínimo** | 44x44px obrigatório (`h-11`) | 44x44px (toque tablet) | 32x32px (cursor mouse) |
| **Controle de Scroll** | Window/Main único vertical | Split scroll (Rail + Main) | Multi-scroll independente |
| **Tratamento de Tabela** | Card vertical empilhado | Tabela compacta (3-4 cols) | Tabela analítica completa (8+ cols) |

---

## 4. Regras de Transição e Breakpoints

1. **Padrão Normativo Único**: Toda lógica de bifurcação responsiva deve consultar estritamente:
   - `< 600px`: Compact (Mobile)
   - `600px - 839px`: Medium (Tablet / Foldable)
   - `>= 840px`: Expanded (Desktop / Bento)
2. **Erradicação do Drift 768px / 1024px**: O hook `use-mobile.tsx` e classes utilitárias devem convergir para a tri-partição canônica de `docs/DESIGN.md` Princípio 6. Classes `md:` (768px) não podem ser utilizadas como sinônimo exclusivo de desktop.
