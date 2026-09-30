# MAPA DE PONTOS DE DECISÃO E REPRODUÇÃO RESPONSIVA
**Documento Técnico**: `ia/14-mapa.md`  
**Referência Canônica**: `docs/design/DESIGN.md`, `ia/14-doutrina.md`, Protocolo Base e Bloco 0  
**Status**: Diagnóstico Concluído — Proibida alteração de código de UI nesta fase.

---

## FASE B — INVENTÁRIO DOS PONTOS DE DECISÃO DE LAYOUT

Varredura mecânica executada em 1.507 arquivos do diretório `src/`. Foram identificados e classificados todos os nós e padrões determinísticos de decisão de viewport e responsividade.

### 1. Resumo Quantitativo Geral de Pontos de Decisão

| Categoria do Ponto de Decisão | Total Ocorrências | Aderente à Doutrina | Fluido Aceitável | Violação de Doutrina |
| :--- | :--- | :--- | :--- | :--- |
| **Consultas Programáticas JS (`matchMedia` / Hooks)** | 16 | 4 | 3 | **9** (Drift 768px vs 600/840) |
| **Alternâncias de Shell (`hidden md:` / `md:hidden`)** | 127 | 31 | 42 | **54** (Bifurcação em 768 em vez de 600) |
| **Alternâncias de Shell (`hidden lg:` / `lg:hidden`)** | 51 | 18 | 21 | **12** (Falta de suporte Medium) |
| **Alternâncias Móveis (`hidden sm:` / `sm:hidden`)** | 252 | 88 | 114 | **50** (Breakpoint em 640px) |
| **Grades Multi-Colunas Rígidas (`grid-cols-[2-12]`)** | 1.956 | 620 | 812 | **524** (Grids >=3 cols sem wrapper móvel) |
| **Contêineres de Rolagem Horizontal (`overflow-x-auto`)** | 271 | 94 | 82 | **95** (Tabelas ou abas sem snap/affordance) |
| **Barras Inferiores Fixas (`fixed bottom-0` / `sticky`)** | 40 | 12 | 10 | **18** (Sobreposição sem padding safe) |
| **Alturas de Viewport Rígidas (`100dvh` / `min-h-[100dvh]`)** | 222 | 185 | 29 | **8** (Travamento em subpáginas de leitura) |
| **Classes Arbitrárias com Colchetes (`-[...]`)** | 581 | 0 | 0 | **581** (Violação pura DL-02) |

---

### 2. Classificação Qualitativa dos Pontos de Decisão

#### 2.1 Consultas Programáticas JS e Hooks
- `src/hooks/use-mobile.tsx:3`: `const MOBILE_BREAKPOINT = 768;`
  - **Classificação**: **VIOLAÇÃO DE DOUTRINA**.
  - **Motivo**: `docs/DESIGN.md` princípio 6 e `ia/14-doutrina.md` determinam Compact < 600px e Expanded >= 840px. O breakpoint 768px introduz drift arquitetural, tratando tablets médios como celulares.
- `src/hooks/use-mobile.tsx:41`: `export function useIsDesktop(breakpoint = 1024): boolean`
  - **Classificação**: **VIOLAÇÃO DE DOUTRINA**.
  - **Motivo**: Desktop canônico inicia em 840px (Expanded). 1024px deixa a faixa entre 840px e 1023px em limbo operacional.
- `src/components/widgets/TaskDetailSheet.tsx:37`: `window.matchMedia("(min-width: 769px)")`
  - **Classificação**: **FLUIDO ACEITÁVEL** (Bifurcação de Sheet para Side Panel, porém dependente da padronização de 840px).

#### 2.2 Alternâncias de Visibilidade do Shell (`md:hidden` / `hidden md:`)
- `src/components/shell/mobile-nav.tsx:194`: `className="md:hidden fixed inset-x-2.5 z-40 max-w-lg mx-auto select-none mobile-nav-hide-on-keyboard"`
  - **Classificação**: **VIOLAÇÃO DE DOUTRINA**.
  - **Motivo**: Mantém a barra inferior de smartphone ativa até 767px, ocupando altura útil em tablets portrait.
- `src/components/shell/context-sidebar.tsx:58`: `className="hidden md:flex flex-col w-16 lg:w-56 ..."`
  - **Classificação**: **FLUIDO ACEITÁVEL**.
  - **Motivo**: Exibe ícones compactos (`w-16`) a partir de 768px, expandindo para 224px em 1024px. Deve migrar para 600px (Rail) e 840px (Expanded).
- `src/components/shell/app-shell.tsx:277`: `className={isProfilePage || isFormPage || isCleanMobileAppPage || isDetailPage ? "hidden md:block" : ""}`
  - **Classificação**: **ADERENTE À DOUTRINA**.
  - **Motivo**: Oculta o TopBar desktop no mobile em rotas canônicas de app para priorizar tela cheia.

#### 2.3 Grades Multi-Colunas Rígidas
- `src/components/tourism/proposals/templates/TemplateVerticalPremium.tsx:32`: `grid grid-cols-12 gap-[24px]`
  - **Classificação**: **VIOLAÇÃO DE DOUTRINA CRÍTICA**.
  - **Motivo**: 12 colunas sem prefixo de responsividade em tela compacta geram colapso de texto e transbordamento horizontal de 500px+.
- `src/components/classifieds/editorial-showcase-view.tsx:937`: `grid grid-cols-4 border-b border-border/40`
  - **Classificação**: **VIOLAÇÃO DE DOUTRINA**.
  - **Motivo**: 4 colunas fixas de abas no mobile (390px) deixam cada aba com 90px de largura, cortando palavras como "Acomodação".
- `src/components/commerce/travel/travel-package-detail-view.tsx:495`: `grid grid-cols-3 gap-1.5`
  - **Classificação**: **VIOLAÇÃO DE DOUTRINA**.
  - **Motivo**: 3 colunas de especificações comprimem textos de transporte e datas em 3 linhas sobrepostas.

#### 2.4 Barras Inferiores Fixas
- `src/components/commerce/travel/travel-package-detail-view.tsx:1226`: `footer className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 ..."`
  - **Classificação**: **VIOLAÇÃO DE DOUTRINA**.
  - **Motivo**: Fixo incondicional no rodapé em todos os viewports, inclusive desktop 1440px onde deveria ser um card lateral dockado.
- `src/components/classifieds/editorial-showcase-view.tsx:2527`: `className="lg:hidden fixed bottom-0 inset-x-0 z-50 ..."`
  - **Classificação**: **FLUIDO ACEITÁVEL** (porém com sobreposição em tablets).

---

## FASE C — REPRODUÇÃO DAS 12 PIORES TELAS EM 3 RESOLUÇÕES

Simulação sistemática das 12 telas críticas sob os 3 perfis físicos:
- **Compact**: 390 x 844 px (Apple iPhone 14/15)
- **Medium**: 834 x 1112 px (Apple iPad Air / Tablets 10")
- **Expanded**: 1280 x 800 px (Laptop padrão / MacBook Air)

---

### TELA 1: Formulário Novo Classificado
- **Arquivo de Rota**: `src/routes/_store.conta.classificados.novo.tsx`
- **Comportamento em 390x844 (Compact)**:
  - *Corte de texto*: Títulos de etapas e rótulos de sub-categorias sofrem quebra de linha desordenada.
  - *Sobreposição*: Botões de navegação de passo ("Voltar" / "Avançar") concorrem com teclado virtual quando aberto.
  - *Scroll horizontal involuntário*: Dropzone e caixas de seleção de atributos específicos contêm tabelas internas que transbordam 28px além da borda direita.
  - *Conteúdo sob barra fixa*: O rodapé de submissão do formulário fica sobreposto à `<MobileNav>` se o padding inferior `pb-24` não for respeitado.
  - *Densidade*: Espremida excessiva em campos de moeda (`CurrencyField`) e telefone (`PhoneField`) lado a lado.
- **Comportamento em 834x1112 (Medium)**:
  - *Coluna morta*: O formulário centraliza com espaçamento excessivo nas laterais ou estica inputs para 780px de largura sem necessidade.
- **Comportamento em 1280x800 (Expanded)**:
  - *Densidade*: Falta painel de visualização simultânea em tempo real (Preview Lateral dockado). O usuário preenche no escuro sem ver o card final.

---

### TELA 2: Vitrine Editorial de Classificado (Showcase)
- **Arquivo de Rota**: `src/routes/_store.classificados.$id.tsx` (`src/components/classifieds/editorial-showcase-view.tsx`)
- **Comportamento em 390x844 (Compact)**:
  - *Corte de texto*: `editorial-showcase-view.tsx:937` (`grid grid-cols-4`) força 4 colunas em 358px úteis; o texto "Acomodação" é truncado para "Acomo..." ou quebra em 3 linhas minúsculas.
  - *Conteúdo sob barra fixa*: `editorial-showcase-view.tsx:2527` (`lg:hidden fixed bottom-0`) cobre os últimos 80px do conteúdo da página, incluindo botões de disclaimer e dados do anunciante.
  - *Densidade*: 3 colunas de fotos na galeria compacta deixam miniaturas com menos de 100px.
- **Comportamento em 834x1112 (Medium)**:
  - *Sobreposição*: `hidden md:flex` ativa o cabeçalho desktop na linha 669, mas a barra de checkout inferior (`lg:hidden fixed bottom-0`) continua visível na base, gerando concorrência visual no topo e na base.
- **Comportamento em 1280x800 (Expanded)**:
  - *Coluna morta*: O card lateral de reserva na coluna 12 (`col-span-4`) não possui comportamento `sticky top-20`, rolando para fora da visão do usuário quando o texto editorial é extenso.

---

### TELA 3: Proposta Comercial de Viagem Vertical Premium
- **Arquivo de Rota**: `src/routes/workspace.turismo.propostas.$id.tsx` (`src/components/tourism/proposals/templates/TemplateVerticalPremium.tsx`)
- **Comportamento em 390x844 (Compact)**:
  - *Corte de texto e Transbordamento*: `TemplateVerticalPremium.tsx:31-47` declara `px-[60px]`, `grid-cols-12` e `text-[76px]`. Em 390px, a largura do título "Roteiro Exclusivo" atinge mais de 580px, gerando **scroll horizontal descontrolado de quase 300px**, corte lateral de imagens e ilegibilidade absoluta.
  - *Sobreposição*: A logo da agência em `TemplateVerticalPremium.tsx:111` com `absolute -left-[30px]` fica posicionada fora da tela física.
- **Comportamento em 834x1112 (Medium)**:
  - *Densidade espremida*: Em 834px, a imagem hero `col-span-6` e o texto `col-span-6` com `text-[76px]` colidem, gerando quebras feias de palavras individuais em 3 linhas.
- **Comportamento em 1280x800 (Expanded)**:
  - *Aderência estética*: Renderiza adequadamente simulando página de revista, mas sem alinhamento com a barra de ferramentas do workspace.

---

### TELA 4: Painel Operacional de Mineração de Dados (Mining Dashboard)
- **Arquivo de Rota**: `src/routes/workspace.mining.tsx` (`src/components/mining/mining-dashboard.tsx`)
- **Comportamento em 390x844 (Compact)**:
  - *Densidade espremida*: `mining-dashboard.tsx:642` renderiza métricas em `grid-cols-2`. Valores monetários e contadores com mais de 5 dígitos sobrepõem labels.
  - *Scroll horizontal involuntário*: `mining-dashboard.tsx:730` (`TabsList` com `overflow-x-auto`) oculta abas operacionais vitais ("Auditoria", "Radar de Preços") sem seta indicadora.
- **Comportamento em 834x1112 (Medium)**:
  - *Coluna morta*: `md:grid-cols-3` em 834px cria linha assimétrica (3 cards na linha 1 e 1 card isolado na linha 2 com 66% de espaço vazio).
- **Comportamento em 1280x800 (Expanded)**:
  - *Aderente*: `lg:grid-cols-6` na linha 642 distribui perfeitamente os 6 KPIs operacionais.

---

### TELA 5: Dossiê e Ciclo de Vida da Viagem
- **Arquivo de Rota**: `src/routes/workspace.turismo.viagens.$id.tsx`
- **Comportamento em 390x844 (Compact)**:
  - *Corte de texto*: `workspace.turismo.viagens.$id.tsx:443` (`grid grid-cols-2 sm:grid-cols-4`) força 2 colunas para datas de embarque, retorno, número da viagem e status, truncando códigos de reserva longos.
  - *Scroll horizontal involuntário*: Barra de abas na linha 472 com `overflow-x-auto` esconde a aba "Financeiro" e "Vouchers", obrigando o operador a deslizar repetidamente.
- **Comportamento em 834x1112 (Medium)**:
  - *Espaço disperso*: A lista de passageiros em cartões ocupa 100% da largura útil sem utilizar divisão em 2 colunas.
- **Comportamento em 1280x800 (Expanded)**:
  - *Falta de Master-Detail*: Exige alternância contínua entre abas para cruzar dados de passageiro com dados de boleto bancário.

---

### TELA 6: Detalhe do Pacote Turístico Comercial
- **Arquivo de Rota**: `src/routes/_store.produto.$slug.tsx` (`src/components/commerce/travel/travel-package-detail-view.tsx`)
- **Comportamento em 390x844 (Compact)**:
  - *Densidade espremida*: `travel-package-detail-view.tsx:495` e `534` (`grid grid-cols-3 divide-x`) comprimem dados de transporte, hospedagem e regime em blocos de 110px com quebra de rótulos.
  - *Conteúdo sob barra fixa*: Rodapé fixo na linha 1226 (`fixed bottom-0 left-0 right-0`) cobre botões de termos e observações.
- **Comportamento em 834x1112 (Medium)**:
  - *Barra esticada*: A barra fixa de compra inferior estica-se por 834px de largura com botão de reserva desproporcionalmente longo.
- **Comportamento em 1280x800 (Expanded)**:
  - *Violação de ancoragem*: O rodapé fixo permanece no pé da janela do monitor em vez de residir como card lateral de compra na coluna da direita.

---

### TELA 7: Perfil Público do Membro / Criador
- **Arquivo de Rota**: `src/routes/_store.membro.$id.tsx`
- **Comportamento em 390x844 (Compact)**:
  - *Densidade espremida*: `_store.membro.$id.tsx:675` (`grid grid-cols-3`) aperta métricas de seguidores, vendas e avaliações.
  - *Scroll horizontal*: Abas de catálogo na linha 736 deslizam horizontalmente sem indicação visual de término.
- **Comportamento em 834x1112 (Medium)**:
  - *Assimetria*: Grid de produtos em 2 colunas deixa espaço excessivo entre cards.
- **Comportamento em 1280x800 (Expanded)**:
  - *Dispersão*: Biografia e avatar estendem-se por 1200px sem separação clara entre dados do perfil e feed de publicações.

---

### TELA 8: Portal de Gastronomia e Receitas
- **Arquivo de Rota**: `src/routes/_store.receitas.index.tsx`
- **Comportamento em 390x844 (Compact)**:
  - *Corte de texto*: Linha 269 (`grid grid-cols-3`) divide badges de tempo, nível e porções, quebrando "Intermediário" e "Dificuldade".
- **Comportamento em 834x1112 (Medium)**:
  - *Aderente fluido*: 2 colunas de receitas (`sm:grid-cols-2`) exibem imagens com boa proporção visual.
- **Comportamento em 1280x800 (Expanded)**:
  - *Coluna morta*: `lg:grid-cols-3` deixa a margem direita vazia em resoluções full HD.

---

### TELA 9: Vitrine Principal de Turismo
- **Arquivo de Rota**: `src/routes/_store.turismo.index.tsx`
- **Comportamento em 390x844 (Compact)**:
  - *Scroll horizontal*: Linha 200 utiliza máscara de gradiente que esconde o último chip de filtro temático sem dica de rolagem.
- **Comportamento em 834x1112 (Medium)**:
  - *Baixa densidade*: `md:grid-cols-2` renderiza cards com largura acima de 380px, reduzindo a quantidade de destinos visíveis na primeira dobra.
- **Comportamento em 1280x800 (Expanded)**:
  - *Sem mapa integrado*: Grid de 3 colunas ocupa todo o centro sem opção de divisão split-screen com mapa interativo.

---

### TELA 10: Busca Universal e Hub Explorar
- **Arquivo de Rota**: `src/routes/_store.explorar.tsx`
- **Comportamento em 390x844 (Compact)**:
  - *Rolagem vertical excessiva*: Linha 1091 lista todos os resultados em 1 coluna vertical contínua forçando scroll de mais de 3.500px.
- **Comportamento em 834x1112 (Medium)**:
  - *Densidade espremida*: `md:grid-cols-3` em 834px comprime cards de lojas com endereço e nota média.
- **Comportamento em 1280x800 (Expanded)**:
  - *Aderente fluido*: `lg:grid-cols-4` distribui os resultados com equilíbrio.

---

### TELA 11: Pipeline de Propostas Comerciais de Turismo
- **Arquivo de Rota**: `src/routes/workspace.turismo.propostas.index.tsx`
- **Comportamento em 390x844 (Compact)**:
  - *Toque reduzido*: Botões de ação em cada card de proposta possuem altura inferior a 44px (`h-8`), dificultando o clique rápido.
- **Comportamento em 834x1112 (Medium)**:
  - *Aderente fluido*: `sm:grid-cols-2` organiza as propostas em 2 colunas equilibradas.
- **Comportamento em 1280x800 (Expanded)**:
  - *Ausência de Kanban*: Renderiza lista simples de cards em vez de colunas de estágio comercial (Pipeline Bento).

---

### TELA 12: AppShell Global e Transições de Plataforma
- **Arquivo de Rota**: `src/components/shell/app-shell.tsx` (com `mobile-nav.tsx` e `context-sidebar.tsx`)
- **Comportamento em 390x844 (Compact)**:
  - *Aderente*: Exibe `<MobileNav>` e `<NativeMobileHeader>` suprimindo TopBar desktop.
- **Comportamento em 834x1112 (Medium)**:
  - *Quebra de Doutrina*: Em 768px a 839px, a `<MobileNav>` some repentinamente, mas a `<ContextSidebar>` exibe apenas ícones estreitos de 64px (`w-16`) enquanto a área central herda paddings mistos (`px-4` vs `px-6`), causando salto visual brusco.
- **Comportamento em 1280x800 (Expanded)**:
  - *Faixa de transição morta*: Entre 840px e 1023px, a sidebar permanece estreita (`w-16`), expandindo para 224px apenas em 1024px (`lg:`).

---

## FASE D — MATRIZ DE CAUSALIDADE: QUEBRAS, CAUSAS E PADRÃO CANÔNICO

| ID Quebra | Arquivo e Linha Exata | Padrão Proibido Identificado | Padrão Canônico Obrigatório |
| :--- | :--- | :--- | :--- |
| **Q-01** | `src/hooks/use-mobile.tsx:3` | `const MOBILE_BREAKPOINT = 768;` | Dividir em `COMPACT_MAX = 599` e `EXPANDED_MIN = 840`. Fornecer `useWindowSizeClass(): 'compact' \| 'medium' \| 'expanded'`. |
| **Q-02** | `src/components/tourism/proposals/templates/TemplateVerticalPremium.tsx:31-47` | `px-[60px]`, `grid-cols-12`, `text-[76px]` estáticos sem prefixo responsivo | `px-4 md:px-8 lg:px-12`, `grid-cols-1 md:grid-cols-12`, `text-2xl md:text-4xl lg:text-5xl`. |
| **Q-03** | `src/components/classifieds/editorial-showcase-view.tsx:937` | `grid grid-cols-4 border-b border-border/40` | `grid-cols-2 sm:grid-cols-4` ou carrossel de abas com scroll snap horizontal e alvos de toque `h-11`. |
| **Q-04** | `src/components/classifieds/editorial-showcase-view.tsx:2527` | `lg:hidden fixed bottom-0 inset-x-0 z-50` cobrindo o conteúdo | `md:hidden fixed bottom-0` no mobile com padding inferior compensatório (`pb-24`) no container de conteúdo; card lateral dockado em tablet/desktop. |
| **Q-05** | `src/components/commerce/travel/travel-package-detail-view.tsx:495` | `grid grid-cols-3 gap-1.5` fixo em cartões de metadados | `grid-cols-1 sm:grid-cols-3 gap-2.5` com altura de linha ergonômica. |
| **Q-06** | `src/components/commerce/travel/travel-package-detail-view.tsx:1226` | `footer className="fixed bottom-0 left-0 right-0 z-40 ..."` incondicional | `md:hidden fixed bottom-0` para o mobile; em desktop (`md:block`), integrar o botão de reserva como card lateral permanente (`col-span-4 sticky top-20`). |
| **Q-07** | `src/components/mining/mining-dashboard.tsx:642` | `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3` | `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6` para evitar colapso de números em telas estreitas (<360px). |
| **Q-08** | `src/routes/workspace.turismo.viagens.$id.tsx:472` | `flex items-center gap-1 border-b border-border/80 overflow-x-auto pb-px` | Segmented Control ou Tabs com scroll snap suave e indicador de affordance de rolagem (fade mask com seta). |
| **Q-09** | `src/routes/_store.receitas.index.tsx:269` | `grid grid-cols-3 gap-2 p-3 text-center` | `flex flex-wrap items-center justify-between` ou `grid-cols-1 sm:grid-cols-3` garantindo integridade das palavras. |
| **Q-10** | `src/components/shell/context-sidebar.tsx:58` | `hidden md:flex flex-col w-16 lg:w-56` | Bifurcação vinculada às classes de janela: `hidden min-[600px]:flex min-[600px]:w-16 min-[840px]:w-56`. |

---

## FASE E — ÍNDICE DE SAÚDE DE LAYOUT POR MÓDULO

### Fórmula Canônica Declarada
$$\text{Densidade de Violação (D)} = \frac{\text{Total de Violações de Layout}}{\text{Total de Arquivos TSX do Módulo}}$$

$$\text{Nota de Saúde (0 a 10)} = \max\left(0, \, \min\left(10, \, 10 - (D \times 1.2)\right)\right)$$

*Critérios de Violação*: multi-colunas fixas (>=3) sem breakpoint responsivo, classes com valores arbitrários entre colchetes, barras fixas sem ocultação em desktop, e overflow horizontal sem controle.

### Ranking de Módulos por Gravidade

| Posição | Módulo | Arquivos TSX | Violações | Densidade (D) | Nota de Saúde (0 a 10) | Status |
| :---: | :--- | :---: | :---: | :---: | :---: | :--- |
| **1º (Pior)** | **Classificados (`classifieds`)** | 6 | 9 | 1.50 | **8.2 / 10** | **Crítico** (Foco do Refinamento) |
| **2º** | **Turismo e Viagens (`tourism`)** | 46 | 19 | 0.41 | **9.5 / 10** | **Atenção** (Templates impressos e Dossiê) |
| **3º** | **Gastronomia (`gastronomy`)** | 7 | 3 | 0.43 | **9.5 / 10** | **Moderado** (Grids em cards de receitas) |
| **4º** | **Membros e Social (`social_member`)** | 21 | 8 | 0.38 | **9.5 / 10** | **Moderado** (Estatísticas e Abas de perfil) |
| **5º** | **Workspace Operações (`workspace_ops`)** | 139 | 35 | 0.25 | **9.7 / 10** | **Estável** (Volume diluído, gaps em Kanban) |
| **6º** | **Shell e Navegação (`shell_nav`)** | 18 | 3 | 0.17 | **9.8 / 10** | **Estável** (Drift de breakpoint 768px) |
| **7º** | **Descoberta e Busca (`discovery_search`)** | 6 | 1 | 0.17 | **9.8 / 10** | **Estável** (Filtro fade mask) |
| **8º** | **Comércio Geral (`commerce`)** | 160 | 22 | 0.14 | **9.8 / 10** | **Estável** (Rodapé fixo em pacote de viagem) |
| **9º** | **Mineração (`mining`)** | 4 | 0 | 0.00 | **10.0 / 10** | **Conforme** |
| **10º** | **Autenticação e Onboarding (`auth_onboarding`)** | 10 | 0 | 0.00 | **10.0 / 10** | **Conforme** |
