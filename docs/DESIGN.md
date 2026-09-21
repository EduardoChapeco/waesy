# Waesy DESIGN SYSTEM — Canonical Core, Dual-Universe, Organic Geometry & News Telemetry

> **Documento Canônico VINCULANTE (Single Source of Truth).**
> Toda a interface visual, superfícies, componentes e interações da Waesy devem ser estritamente derivados deste documento e de `src/styles.css`.
> **Proibição Total de Hardcode**: Não use valores Tailwind literais (ex: `bg-red-500`, `text-white` solto). Use sempre os tokens semânticos (`var(--color-*)`, `var(--radius-*)`).

---

## 🏛️ FILOSOFIA V11: ULTRA-MINIMALISMO FUNCIONAL (WHATSAPP / APPLE HIG STANDARD)

A Waesy adota o **Ultra-Minimalismo Funcional** como lei suprema de design para Mobile-First e Desktop:

1. **Abolição do Fundo Colorido em Elementos Secundários:**
   - Badges, chips, tags e botões secundários **NÃO PODEM** ter cor de fundo sólida preta ou vibrante.
   - Devem utilizar fundo transparente (ou branco) com texto na cor de destaque, ou no máximo um fundo com 5% a 10% de opacidade da cor principal (`bg-primary/5` ou `bg-primary/10`, `border border-primary/20 text-primary`).
2. **Botões e Call-to-Actions (CTAs):**
   - **Primário (`default`):** Único elemento que pode ter fundo sólido (Preto/Azul/Verde profundo) com texto branco de alto contraste.
   - **Secundário (`secondary`):** Fundo branco/transparente, borda fina (1px) na cor primária e texto na cor primária (`border border-primary text-primary bg-background hover:bg-primary/5`).
   - **Neutro/Cancelamento (`outline`):** Fundo branco/transparente com borda fina neutra (`border border-border bg-background text-foreground hover:bg-muted/50`).
3. **Tipografia e Hierarquia "Flat":**
   - Fundos de tela: `#FFFFFF` (Branco puro) no Light Mode e `#0A0A0A` no Dark Mode.
   - Separação hierárquica pelo peso da fonte (Bold/Medium) e cor (Preto vs. Cinza médio `#6B7280`), **NUNCA** por blocos coloridos ou sombras pesadas.
   - Sombras projetadas extintas (`--shadow-*: none`), valorizando o contorno e a respiração do layout.
4. **Ícones:**
   - Apenas ícones estilo **Outline** (contorno fino 1.5px a 2px), sem círculos ou caixinhas coloridas decorativas atrás deles.
5. **Erradicação do Glassmorphism & AI-Smell:**
   - Proibição de `backdrop-blur` excessivo, gradientes espalhafatosos e caixas conversacionais prolixas.
   - Qualquer tela ou objetivo deve ser resolvido em no máximo **3 passos lógicos**.

---

## 0. Arquitetura dos Dois Universos Visuais

A Waesy unifica dois universos complementares sob a mesma fundação de tokens semânticos:

### 0.1 Universo Social / Descoberta / Notícias / Mural / Mercado / Mapa (Mobile & Desktop)
- **Foco:** Expressividade visual, retenção, credibilidade editorial e dinamismo comunitário.
- **Padrões Canônicos:**
  - **Manchetes & Artigos de Notícias (`news_articles`):** Tipografia mista com contraste editorial (`Fraunces` para títulos de grande impacto + `Inter` para leitura longa fluida).
  - **Formato Duplo de Leitura:**
    - *No Feed/Mural*: Card compacto com resumo de 3 linhas expansível estilo WhatsApp ("Ver mais") + botão de ação para abrir a matéria inteira.
    - *Página Dedicada (`/noticias/$slug`)*: Leitura imersiva com barra de progresso de scroll, tempo estimado de leitura, blocos de patrocinadores inseridos harmonicamente e comentários de membros reais.
  - **Módulo de Patrocinadores Reais (`sponsors`):** Banners e cards com IntersectionObserver para medição precisa de visualização única, tempo de tela ativo e taxa de cliques (CTR).
  - **Top Banners Hero:** Aspect ratio fixo 16:9 / 21:9 com suporte para Imagens, Vídeos e GIFs com switches de Mídia Limpa (capacidade de ocultar título, badges ou sombras).
  - **Master Location Pill:** Ativação instantânea de GPS por long-press ou abertura de modal com aba de **Pin no Mapa em Tela Cheia** com geocodificação reversa.
  - **Navegação Sem Duplicações:** A barra superior (`TopBar`) abriga o logotipo, Location Pill, busca inteligente e o cluster de utilidades (sacola e perfil), sem duplicar botões da barra lateral.

### 0.2 Universo Workspace / Gestão / PDV / Redação de Notícias (Desktop-First)
- **Foco:** Operação ultra-clean, máxima área útil, silêncio visual absoluto (estilo _Linear_, _iFood Portal_ e _Stripe Dashboard_).
- **Padrões Canônicos:**
  - Zero sombras pesadas, zero placeholders ou dados fictícios.
  - Superfícies `surface-paper` (`bg-background` e `bg-card`) com bordas sutis (`border-border/80`).
  - Edição em múltiplos níveis: Edição de Célula (inline na tabela), Edição Lateral (Side-panel Sheet) e Edição Completa In-Page com *Truthful Preview* lateral.
  - Redator de Matérias por Blocos: Composição de parágrafos, subtítulos, citações e galerias em tempo real.
  - Painel de Telemetria de Audiência: Gráficos de alcance único, impressões e engajamento dos patrocinadores.

---

## 1. Escala de Tokens Semânticos & Cores

### 1.1 Light Mode (Base Minimalista)
- `--background`: `oklch(1 0 0)` (#FFFFFF Branco puro operacional)
- `--foreground`: `oklch(0.12 0 0)` (Preto suave, legibilidade ótima)
- `--card`: `oklch(1 0 0)` (Branco puro)
- `--primary`: `oklch(0.12 0 0)` (Preto Apple-like)
- `--primary-foreground`: `oklch(0.99 0 0)` (Branco)
- `--secondary`: `oklch(0.96 0 0)` (Cinza claríssimo)
- `--secondary-foreground`: `oklch(0.15 0 0)`
- `--muted`: `oklch(0.96 0 0)`
- `--muted-foreground`: `oklch(0.45 0 0)`
- `--border`: `oklch(0.93 0 0)`

### 1.2 Dark Mode (Alto Contraste AAA — Sem Texto Invisível)
- `--background`: `oklch(0.12 0 0)` (#0A0A0A Preto operacional profundo)
- `--foreground`: `oklch(0.96 0 0)` (Branco suave)
- `--card`: `oklch(0.16 0 0)` (Superfície sutilmente elevada)
- `--primary`: `oklch(0.98 0 0)` (Branco puro para ação primária)
- `--primary-foreground`: `oklch(0.10 0 0)` (Preto forte para contraste total com o botão)
- `--secondary`: `oklch(0.20 0 0)` (Cinza grafite sutil)
- `--secondary-foreground`: `oklch(0.96 0 0)`
- `--muted`: `oklch(0.20 0 0)`
- `--muted-foreground`: `oklch(0.70 0 0)`
- `--border`: `oklch(0.22 0 0)`

---

## 2. Família de Botões & Ações (Pill-Squircle System V11 Ultra-Minimalista)

| Variante | Classe / Tailwind | Propósito & Sensação Visual |
| :--- | :--- | :--- |
| **`default`** | `bg-primary text-primary-foreground font-bold shadow-xs hover:bg-primary/90` | **CTA Primário Único**: Único elemento com fundo sólido de alto contraste. |
| **`secondary`** | `bg-background border border-primary text-primary hover:bg-primary/5 font-semibold` | **CTA Secundário / Chat Action**: Fundo branco/transparente, borda 1px na cor primária e texto na cor primária. |
| **`outline`** | `border border-border bg-background hover:bg-muted/50 text-foreground font-semibold` | Botões neutros, cancelamento, alternadores e ações terciárias. |
| **`ghost`** | `hover:bg-muted text-muted-foreground hover:text-foreground` | Ações compactas e ícones outline sem caixa decorativa. |
| **`destructive`** | `bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/15 font-semibold` | Ações destrutivas com fundo sutil não-agressivo. |
| **`link`** | `text-primary underline-offset-4 hover:underline font-semibold` | Ações de texto em linha direta. |

### 2.1 Família de Badges & Chips (V11 Sem Fundo Sólido)

| Variante | Classe / Tailwind | Propósito & Sensação Visual |
| :--- | :--- | :--- |
| **`default`** | `bg-primary/5 text-primary border border-primary/20 hover:bg-primary/10` | Destaque neutro elegante sem fundo chapado. |
| **`secondary`** | `bg-muted/60 text-muted-foreground border border-border/50 hover:bg-muted` | Tag neutra sutil de contexto. |
| **`outline`** | `bg-transparent text-foreground border border-border hover:bg-muted/30` | Pílula transparente com contorno fino. |
| **`success`** | `bg-success/10 text-success border border-success/20 hover:bg-success/15` | Status positivo/confirmado (5-10% tint + contorno). |
| **`warning`** | `bg-warning/10 text-warning border border-warning/20 hover:bg-warning/15` | Status pendente/atenção (5-10% tint + contorno). |
| **`destructive`** | `bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/15` | Status cancelado/erro (5-10% tint + contorno). |
| **`info`** | `bg-info/10 text-info border border-info/20 hover:bg-info/15` | Status informativo/processando (5-10% tint + contorno). |

---

## 3. Geometria Orgânica & Padrão de Botões Squircle ("Quadrado Inflado")

- **Botões Squircle / Gordinhos (`rounded-2xl` ~16px-20px com h-10/h-11):** Todos os botões interativos de ação, triggers de busca/sacola/perfil e botões de adicionar ao carrinho usam geometria squircle tátil ("quadrado inflado", estilo Apple / VisionOS / Linear), NUNCA pílulas compridas finas ou cápsulas verticais estranhas.
- **`shape.soft` (`.squircle-soft` / `rounded-xl` ~12px-14px):** Chips internos, tags, selects, pequenos badges e inputs.
- **`shape.media` (`.squircle-media` / `rounded-2xl` ~18px-22px):** Fotos de produtos, mídias de post, avatares e miniaturas de stories.
- **`shape.card` (`.squircle-card` / `rounded-3xl` ~24px-32px):** Containers de posts do Mural, caixas de banners herói, cards de lojas e trilhos de produtos.

---

## 4. Largura Canônica Única & Fim do Efeito Sanfona

Para eliminar qualquer variação abrupta de largura ao navegar entre abas ("efeito sanfona"):
- **Container Canônico Único:** `max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-8`.
- Todas as rotas de descoberta (`Home`, `Mercado`, `Mural`, `Notícias`, `Agenda`, `Diretório`, `Mapa`) utilizam rigorosamente essa mesma largura máxima e mesmo ritmo de padding.

---

## 5. Anatomia Canônica Quádrupla de Páginas de Descoberta

Toda página pública de exploração segue o mesmo ritmo visual hierárquico:
1. **Camada 1 — Top Banner Hero:** Banner dinâmico carrossel com fotos reais do Supabase (16:9 / 21:9) e fallback curado.
2. **Camada 2 — HotpagesRail Contextual:** Trilho de cartões visuais de categorias/nichos da região.
3. **Camada 3 — Chips de Subcategorias & Filtros:** Barra horizontal de filtros rápidos com scroll suave (`DiscoveryControlBar`).
4. **Camada 4 — Trilhos & Grades de Cards Grandes:** Sliders horizontais e grades com proporção generosa para produtos, ofertas relâmpago, lojas e publicações.

### 5.1 Regra Absoluta de Silêncio Visual na Vitrine Pública (Sem Títulos/Descrições Prolixas)
- **Zero Textos Introdutórios Redundantes:** As páginas públicas NUNCA exibem caixas de texto com boas-vindas prolixas ("Bem-vindo ao Mercado...", "Aqui você encontra..."). O usuário quer ver produtos, lojas, ofertas e ações imediatas.
- **`HorizontalRail` com `hideHeader={true}`:** Em vitrines públicas, os carrosséis fluem naturalmente através de snap-scroll sem cabeçalhos textuais redundantes competindo com a riqueza visual dos cards.
- **Botões com Geometria Squircle (`rounded-xl` / `rounded-2xl`):** Proibição de botões tipo cápsula fina ou `rounded-full` em botões de ação e checkout. Usar sempre squircle tátil com tipografia em peso `font-bold`.

---

## 6. Telemetria de Audiência & Padrões Antifraude

1. **Visualizações Únicas:** Calculadas combinando `user_id` autenticado com `session_hash` (IP + User-Agent mascarados via hash SHA-256 no backend).
2. **Tempo de Visualização Ativo:** Monitorado via evento de heartbeat a cada 5 segundos enquanto o elemento estiver visível no viewport (IntersectionObserver com ratio > 0.5 e document em foco).
3. **Curtidas Únicas:** Inserção atômica com chave primária composta `(item_id, user_id)` impedindo contagens duplicadas.

---

## 7. Responsividade Adaptativa Mobile & Ergonomia Tátil Proporcional (Apple HIG, Material 3, iFood, Threads, Avec, Belasis)

### 7.1 A Regra de Adaptação ao Frame de Visualização (Viewport Elasticity)
A interface móvel deve se adaptar organicamente ao frame de qualquer aparelho móvel (de iPhones compactos de 320px/375px a modelos Max/Plus de 430px e dobráveis):
- **Tipografia Fluida com `clamp()`**: Títulos e textos de corpo utilizam funções `clamp(min, val, max)` para escalar continuamente sem saltos bruscos de breakpoint.
- **Touch Targets Invioláveis de 44x44px**: Todo botão, ícone de ação, trigger de filtro, switch ou chip possui área de toque mínima de **44x44px** (altura `h-11` ou padding compensado com `.touch-target`), mesmo quando o elemento visual for visualmente menor.
- **Safe Areas & Dynamic Viewport (`dvh`)**:
  - Uso obrigatório de `safe-bottom` (`env(safe-area-inset-bottom)`) em barras fixas inferiores, drawers (`Vaul`) e botões de checkout para não colidir com o Home Indicator do iOS.
  - Uso de `safe-top` (`env(safe-area-inset-top)`) em cabeçalhos fixos para acomodar Dynamic Island e Notch sem sobreposição.
  - Alturas de tela cheia usam sempre `100dvh` (Dynamic Viewport Height) em vez de `100vh`, evitando o salto de layout ao abrir a barra de endereços do Safari/Chrome.

### 7.2 Compressão Progressiva & Colapso de Rótulos
Em telas ultra-compactas ou com alta densidade de informação:
- **Prioridade Visual de Texto**: Textos secundários e descrições são truncados ou omitidos antes de qualquer redução de legibilidade.
- **Colapso Inteligente de Botões (`.mobile-collapse-label`)**: Em viewports estreitos (< 380px), botões que continham texto + ícone mantêm apenas o ícone centralizado com `touch-target` de 44px intacto e `aria-label` para acessibilidade.
- **Container Queries em Cards**: Cards de produtos de gôndola (`GroceryProductCard`), cards de lojas (`StoreCard`) e feeds (`ThreadsFeedCard`) usam `@container` para rearranjar a imagem e informações conforme a largura real do slot, evitando quebras de linha artificiais.

### 7.3 Arquitetura da Zona do Polegar (Thumb-Zone Navigation)
Inspirada nos aplicativos de alta retenção (*iFood, Instagram, Threads, WhatsApp*):
- **Ações Primárias no Terço Inferior**: Botões de "Adicionar à Sacola", "Confirmar Pedido", "Finalizar Atendimento" e abas de navegação principal residem fixos no terço inferior da tela, ao alcance natural do polegar.
- **Snap-Scroll Horizontal**: Trilhos de banners e categorias usam `scroll-snap-type: x mandatory` com desaceleração nativa de toque (`-webkit-overflow-scrolling: touch`) e sem barras de rolagem visíveis.

---

## 8. O Framework das 7 Camadas de Completude & Ergonomia dos 3 Toques

> **Regra Vinculante de Engenharia:** Toda e qualquer funcionalidade ou página na Waesy deve atender rigorosamente às 7 Camadas de Completude antes de ser considerada concluída.

### 8.1 As 7 Camadas Canônicas
1. **Camada 1 (Persistência & RLS):** Tabela, colunas, chaves estrangeiras, índices e RLS deny-by-default via migration aplicada.
2. **Camada 2 (BFF & Contratos Atômicos):** Server Functions (`createServerFn`) com validação Zod e checagem de autoridade por sessão.
3. **Camada 3 (UI de Ação Reativa):** Componente interativo (Modal/Sheet/Form) com estados de loading esqueleto, feedback real e validação.
4. **Camada 4 (Superfície de Governança):** Painel operacional no Workspace ou Admin Master para consulta, auditoria e reversão.

---

## 9. Padrões Canônicos de Estações Operacionais: KDS Cozinha (QSR) vs. Gestor de Balcão & Isolamento por Nicho

### 9.1 KDS Cozinha (Kitchen Display System — Padrão Internacional QSR)
- **Propósito:** Estação de bancada de produção gastronômica (Tablet ou Smart TV de Cozinha).
- **Diretrizes Visuais & Funcionais:**
  1. **Tipografia Gigante de Ingredientes (`text-xl` a `text-2xl font-black`):** Leitura instantânea a 2 metros de distância em bancada movimentada.
  2. **Checklist Tátil por Item:** O cozinheiro pode marcar item a item com 1 toque na tela ou atalho físico.
  3. **Caixas de Modificadores & Observações:** Alertas visuais destacados (`+ SEM CEBOLA`, `⚠️ ATENÇÃO: PONTO DA CARNE`).
  4. **Controle de SLA Progressivo:** Alerta visual com cronômetro em tempo real (🟢 Verde < 10m, 🟡 Amarelo 10-20m, 🔴 Vermelho > 25m pulsante).
  5. **Controles Físicos & Bump Bar (Hardware de Cozinha QSR):**
     - **Espaço / Enter:** Bump do pedido mais urgente na fila.
     - **Teclas 1 a 9:** Acesso e avanço direto por slot de pedido.
     - **Tecla F:** Alterna modo Fullscreen (Tela Cheia).
     - **Tecla S:** Alterna som de sino sonoro de novos pedidos.
     - **Tecla R:** Força sincronização instantânea.
  6. **Zero Poluição Financeira:** Nenhum valor monetário ou bandeira de cartão na cozinha — foco estrito na produção gastronômica.

### 9.2 Gestor de Pedidos (Balcão, Recepção & Expedição)
- **Propósito:** Frente de caixa, expedição de motoboys e atendimento de balcão.
- **Diretrizes:** Visão 360° do cliente, dados de pagamento (Pix, Cartão, Dinheiro), endereço de entrega, integração com WhatsApp e impressão em bobina térmica de 80mm.

### 9.3 Isolamento Semântico e Contextual por Nicho (Zero Contaminação)
- Cada segmento comercial da plataforma possui vocabulário, entidades e navegação estritamente especializados e canônicos:
  - **Turismo:** `Pacotes & Roteiros`, `Passageiros (CRM)`, `Cotações`, `Lâminas de Proposta`, `Contratos & ANTT`, `Passeios & Ingressos`. Não exibe "Frente de Caixa (PDV)" nem itens de varejo.
  - **Gastronomia:** `Cardápio & Itens`, `KDS Cozinha`, `Mesas & Comandas`, `Adicionais & Insumos`, `Entregadores & Despacho`.
  - **Varejo & Moda:** `Produtos & Variações`, `Grades (Cores/Tamanhos)`, `Estoque & Alertas`, `Trocas & Devoluções`.
  - **Saúde & Beleza:** `Grade de Agendamentos`, `Profissionais & Salas`, `Catálogo de Procedimentos`, `Pacotes & Passes`.
