# DESIGN.md — A Constituição Visual do Projeto Waesy

## C.0 Como este Documento é Usado
Este documento é a constituição visual e autoridade normativa máxima de design para o projeto Waesy.
É lido obrigatoriamente por todos os agentes e desenvolvedores imediatamente após `AGENTS.md` e antes de qualquer codificação.
Nenhuma decisão de cor, espaço, tipografia, movimento ou layout pode originar-se fora dos limites fixados aqui.
Qualquer desvio não previsto requer aprovação formal via especificação técnica e registro em `docs/design/DECISIONS.md`.
A violação das diretrizes deste documento é detectada de forma determinística pelo executor `scripts/design-lint.mjs`.

### Violações típicas
- Iniciar implementação de interface sem consulta prévia às seções normativas deste documento.
- Assumir valores arbitrários no componente sem validar na matriz de tokens e regras do sistema.

---

## C.1 Os Dez Princípios Fundamentais

### 1. Hierárquico
- **Definição:** Uma intenção central por superfície, exatamente uma ação primária em destaque visual.
- **Regra Operacional:** Cada tela possui no máximo um botão primário com preenchimento sólido (`variant="default"`). Ações secundárias devem usar outline ou ghost. Em telas compactas móveis, a ação primária reside no terço inferior da viewport (Hoober thumb zone, Fitts 1954).
- **Contra-exemplo:** Tela de checkout com três botões pretos sólidos concorrentes: "Salvar Endereço", "Aplicar Cupom" e "Finalizar Compra".

### 2. Honesto
- **Definição:** A interface não promete o que o dado ou a infraestrutura não é capaz de entregar.
- **Regra Operacional:** Proibido o uso de mocks estáticos ou fallbacks inventados no cliente. Se o dado não existe, a interface renderiza um estado vazio explícito ou desabilita a ação com justificativa técnica direta (Nielsen, Visibilidade de Estado).
- **Contra-exemplo:** Card de turismo exibindo "5D / 4N" e "All Inclusive" como fallback silencioso para pacote sem cadastro de duração.

### 3. Silencioso
- **Definição:** Cor, sombra e movimento existem exclusivamente para carregar significado semântico e estado.
- **Regra Operacional:** Proibido uso de gradientes decorativos, fundos policromáticos ou ilustrações não utilitárias em superfícies de aplicação. Superfícies utilizam fundo neutro limpo, bordas sutis de 1px e zero sombras decorativas (Tufte, Data-Ink Ratio; Bringhurst).
- **Contra-exemplo:** Card de produto com borda brilhante em gradiente roxo, sombra difusa e badge pulsante sem alteração de estado.

### 4. Previsível
- **Definição:** O mesmo problema de interação é resolvido pelo mesmo padrão canônico em todo o sistema.
- **Regra Operacional:** Componentes reutilizáveis idênticos resolvem busca, paginação, seleção e confirmação. Proibido inventar um novo modal, gaveta ou seletor se já existe primitiva no catálogo (Jakob's Law; Atomic Design).
- **Contra-exemplo:** PDV utilizando drawer lateral para adicionar cliente enquanto a tela de pedidos abre um modal centralizado flutuante.

### 5. Denso onde Importa
- **Definição:** Informação densa e compacta em superfícies de leitura; respiro e foco em momentos de decisão.
- **Regra Operacional:** Tabelas operacionais, listagens de estoque e caixas usam altura de linha compacta (36px a 40px) e tipografia tabular `font-mono`. Telas de checkout, pagamento e onboarding usam espaçamentos generosos (16px a 24px) e no máximo 5 campos visíveis (Miller 1956; Cowan 2001).
- **Contra-exemplo:** Tabela de conferência financeira com padding de 24px por linha forçando paginação excessiva a cada 5 itens.

### 6. Nativo por Plataforma
- **Definição:** Dispositivos móveis compactos e desktops expandidos constituem dois produtos especializados distintos.
- **Regra Operacional:** A interface não encolhe fluidamente o layout desktop. Em viewport < 600px (Compact), o sistema renderiza listas edge-to-edge estilo WhatsApp, sheets inferiores (100dvh) e barra de navegação no polegar. Em viewport >= 840px (Expanded), renderiza Bento Grid e Master-Detail de 2 ou 3 colunas (Material 3 Window Size Classes).
- **Contra-exemplo:** Tabela desktop com 8 colunas horizontais exibida com scroll horizontal cortado em tela de smartphone de 390px.

### 7. Interrompível
- **Definição:** Toda transição, movimento ou gesto pode ser cancelado ou revertido instantaneamente em curso.
- **Regra Operacional:** Animações e transições não podem bloquear a entrada do usuário por mais de 100ms. Gestos de arraste em bottom sheets e abas acompanham a velocidade física do dedo e revertem sem saltos se soltos antes do limite (Apple Fluid Interfaces; Nielsen Limites de Resposta).
- **Contra-exemplo:** Modal com transição de entrada bloqueante de 500ms durante a qual toques na tela são descartados.

### 8. Acessível por Padrão
- **Definição:** Acessibilidade não é refinamento pós-entrega, é requisito inviolável de aceitação.
- **Regra Operacional:** Contraste mínimo de texto de 4.5:1 (normal) e 3:1 (UI e texto grande). Alvos de toque com área mínima de 44x44px no mobile. Todos os controles operáveis por teclado com anel de foco visível de 2px e deslocamento de 2px (WCAG 2.2 AA 1.4.3, 1.4.11, 2.4.7, 2.5.8).
- **Contra-exemplo:** Botão de fechar modal medindo 20x20px sem atributo `aria-label` e invisível na navegação por tecla Tab.

### 9. Tokenizado
- **Definição:** Nenhum valor estético (cor, tamanho, raio, margem, duração) nasce isolado no componente.
- **Regra Operacional:** Todo estilo consome tokens semânticos e de componente definidos em `tokens.json` e exportados via variáveis CSS em `src/styles.css`. Proibido hexadecimais, valores em pixels ou modificadores soltos no JSX (W3C DTCG).
- **Contra-exemplo:** Componente declarando `className="bg-[#1f2937] text-[13px] rounded-[7px] p-[11px]"`.

### 10. Verificável
- **Definição:** Toda regra da constituição possui método mecânico e determinístico de auditoria.
- **Regra Operacional:** Não existem diretrizes subjetivas baseadas em gosto. Cada proibição é mapeada para uma regra do `scripts/design-lint.mjs` com código de saída binário (0 aprovado, 1 reprovado) (IBM Carbon Governance).
- **Contra-exemplo:** Diretriz de estilo prescrevendo "faça o design parecer moderno e acolhedor" sem parâmetros quantitativos.

### Violações típicas
- Introduzir elementos decorativos arbitrários que violem o princípio Silencioso.
- Tratar layout mobile como mero encolhimento de colunas desktop em violação ao princípio Nativo por Plataforma.

---

## C.2 Cor e Camadas Semânticas

### Arquitetura em Três Camadas
1. **Camada Primitiva:** Escala perceptual tonal neutra e acromática baseada no espaço uniforme OKLCH/APCA (M3 HCT / APCA):
   - `neutral-0` (`#FFFFFF`), `neutral-50` (`#F9FAFB`), `neutral-100` (`#F3F4F6`), `neutral-200` (`#E5E7EB`), `neutral-300` (`#D1D5DB`), `neutral-400` (`#9CA3AF`), `neutral-500` (`#6B7280`), `neutral-600` (`#4B5563`), `neutral-700` (`#374151`), `neutral-800` (`#1F2937`), `neutral-900` (`#111827`), `neutral-950` (`#030712`).
2. **Camada Semântica:** Nomeação estrita por função na interface:
   - Superfície: `--surface-canvas` (`#FFFFFF`), `--surface-card` (`#FFFFFF`), `--surface-subtle` (`#F9FAFB`).
   - Texto: `--text-primary` (`#111827`, contraste 16.8:1), `--text-secondary` (`#4B5563`, contraste 7.2:1), `--text-muted` (`#6B7280`, contraste 5.1:1).
   - Linhas e Controles: `--border-default` (`#E5E7EB`, contraste 1.5:1 decorativo), `--border-control` (`#9CA3AF`, contraste 3.2:1 para inputs/checkboxes).
   - Feedback: `--feedback-danger` (`#DC2626`), `--feedback-warning` (`#D97706`), `--feedback-success` (`#16A34A`), `--feedback-info` (`#2563EB`).
3. **Camada de Componente:** Variáveis associadas diretamente aos elementos consumíveis:
   - `--button-primary-bg`, `--button-primary-text`, `--input-border-active`, `--toast-surface`.

### Regras Duras de Cor
- **A cor nunca é o único portador de significado:** Mensagens de erro, alerta ou sucesso devem conter obrigatoriamente ícone semântico e texto explicativo (WCAG 1.4.1).
- **Proibição de Hexadecimal no Código:** Componentes em TSX/JSX nunca declaram códigos `#HEX` ou funções `rgb()`. O consumo é restrito a classes utilitárias semânticas (`bg-card`, `text-primary`, `border-border`).

### Violações típicas
- Utilizar `text-white` fixo em badges coloridos com luminosidade média (ex: amarelo ou laranja), gerando falha grave de contraste (DL-16, DL-18).
- Usar cores utilitárias brutas como `bg-red-500` em vez de `bg-destructive` (DL-01).

---

## C.3 Tipografia e Escala Modular

### Escala Canônica
A escala tipográfica é estritamente travada em 8 tamanhos com escala modular 1.25 (Major Third, Bringhurst):
- `text-xs`: 12px (0.75rem), line-height 16px (1.33). Usado em badges, timestamps e micro-legendas.
- `text-sm`: 14px (0.875rem), line-height 20px (1.43). Usado em corpo secundário, inputs, labels e tabelas compactas.
- `text-base`: 16px (1.0rem), line-height 24px (1.50). Usado em corpo padrão de leitura e botões primários.
- `text-lg`: 18px (1.125rem), line-height 26px (1.44). Usado em títulos de cards e subtítulos operacionais.
- `text-xl`: 20px (1.25rem), line-height 28px (1.40). Usado em cabeçalhos de seção e títulos de modais.
- `text-2xl`: 24px (1.50rem), line-height 32px (1.33). Usado em títulos de páginas operacionais no desktop.
- `text-3xl`: 30px (1.875rem), line-height 36px (1.20). Usado em KPIs e destaques numéricos.
- `text-4xl`: 36px (2.25rem), line-height 40px (1.11). Teto máximo do sistema para manchetes editoriais públicas.

### Regras Tipográficas
- **Cardinalidade Máxima de Pesos:** No máximo 3 pesos ativos no sistema: Regular (400), Medium (500), Semibold (600). Proibido uso de Black (900) ou Hairline (100) em interface operacional (DL-10).
- **Medida de Linha (Line Length):** Parágrafos e blocos de leitura contínua possuem largura máxima entre 45 e 75 caracteres (`max-w-prose` ou `max-w-2xl`) para garantir retenção cognitiva (Dyson & Haselgrove 2001).
- **Tracking (Letter Spacing):** Textos display (`text-2xl` e acima) utilizam tracking negativo sutil (`tracking-tight`, -0.015em). Textos compactos (`text-xs`) utilizam tracking neutro ou levemente expandido (0.01em) (Apple HIG).

### Violações típicas
- Declarar classes tipográficas inexistentes ou colchetes arbitrários como `text-[13px]` ou `text-[15px]` (DL-02).
- Usar mais de 4 pesos tipográficos concorrentes na mesma tela (DL-10).

---

## C.4 Espaço e Grade Modular (8pt / 4pt Grid)

### A Grade Canônica
O sistema é estruturado na grade espacial de base 8px com sub-múltiplo de 4px para micro-alinhamentos (IBM Carbon; Müller-Brockmann):
- `space-1`: 4px (micro-ajustes de ícones e espaçamentos internos de tags)
- `space-2`: 8px (gap entre ícone e texto, paddings compactos)
- `space-3`: 12px (padding interno de inputs compactos e badges)
- `space-4`: 16px (gutter padrão móvel, padding de cards padrão)
- `space-5`: 20px (espaçamento médio entre seções em telas pequenas)
- `space-6`: 24px (gutter de tablets e padding de modais)
- `space-8`: 32px (gutter desktop e respiro entre blocos de conteúdo)
- `space-10`: 40px (margens superiores de páginas e separadores de grupo)
- `space-12`: 48px (espaçamento master em landing pages)

### Colunas e Margens por Classe de Janela
- **Compact (<600px):** 4 colunas fluidas, margem externa fixa de 16px (ou 1px de shell operacional no mobile), gutter entre colunas de 12px.
- **Medium (600px a 839px):** 8 colunas fluidas, margem externa de 24px, gutter entre colunas de 16px.
- **Expanded (>=840px):** 12 colunas fluidas, margem externa de 32px, gutter de 24px, largura máxima centralizada de 1440px.

### Violações típicas
- Margens mágicas ou valores ímpares arbitrários como `p-[7px]` ou `mr-[11px]` (DL-03).
- Margens duplas no shell mobile acumulando paddings de componentes filhos (Regra 15).

---

## C.5 Raio de Borda, Superfície e Elevação

### Escala de Raios
A escala de raios de borda é travada em 4 níveis canônicos (Apple HIG Squircle):
- `radius-none`: 0px (superfícies contínuas e divisórias)
- `radius-sm`: 4px (micro-tags, check-boxes e indicadores)
- `radius-md`: 8px (botões padrão, inputs, seletores e menus suspensos)
- `radius-lg`: 12px (cards operacionais, modais, sheets e painéis)
- `radius-full`: 9999px (chips de filtro e avatares estritamente circulares)

### Borda antes de Sombra
- Em conformidade com o Paradigma Clean, a separação visual de superfícies é realizada prioritariamente por contraste de borda de 1px (`border border-border`) ou por divisão sutil de espaçamento (Gestalt, Região Comum).
- **Sombras em Aplicação:** Sombras são terminantemente proibidas em cards normais de conteúdo, tabelas e cabeçalhos de tela. O uso de sombra é restrito a camadas flutuantes (popovers, dropdowns e modais) com elevação física sutil (Fluent 2 Key + Ambient, DL-07).

### Violações típicas
- Aplicar `shadow-lg` ou `shadow-xl` em cartões estáticos de dados dentro do dashboard (DL-07).
- Usar mais de 4 raios concorrentes na mesma hierarquia de tela (DL-09).

---

## C.6 Movimento, Resposta e Acessibilidade Fisiológica

### Tabela de Durações e Curvas
O movimento serve exclusivamente para manter a continuidade cognitiva do usuário (Apple Fluid Interfaces; Nielsen Limites):
- **Micro-interações (hover, focus, active):** 100ms a 150ms, curva `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out).
- **Entrada e Saída de Componentes (dropdown, tooltip, sheet):** 200ms a 250ms, curva `cubic-bezier(0.16, 1, 0.3, 1)`.
- **Navegação de Rota e Troca de Página:** 250ms a 300ms.
- **Teto Máximo do Sistema:** Nenhuma animação ou transição pode ultrapassar 300ms (DL-26).

### Respeito a Movimento Reduzido (prefers-reduced-motion)
- Todo componente com animação deve conter obrigatoriamente a regra defensiva:
  `@media (prefers-reduced-motion: reduce) { animation: none !important; transition: none !important; }` ou classe `motion-reduce:transition-none` (WCAG 2.3.3, DL-28).

### Violações típicas
- Transições genéricas com `transition-all` animando propriedades de pintura pesadas (DL-27).
- Ausência de cancelamento de movimento em ambientes de usuário com sensibilidade vestibular (DL-28).

---

## C.7 Densidade e Alvos de Toque (Touch Targets)

### Regra de Toque por Plataforma
- **Compacto / Mobile (<600px):** Todo elemento interativo (botão, link, ícone clicável, checkbox, item de lista) possui área de toque mínima absoluta de **44x44px** (`h-11 min-w-11`), independentemente do tamanho visual do ícone interno (Apple HIG; Parhi, Karlson, Bederson 2006; WCAG 2.5.8, DL-14).
- **Espaçamento entre alvos:** Espaço mínimo de 8px entre as bordas de alvos de toque adjacentes para evitar toques acidentais em dispositivos móveis.
- **Expanded / Desktop (>=840px):** Alvos de clique por mouse ou trackpad possuem altura mínima de 32px (`h-8`), com padding interno ergonômico.

### Violações típicas
- Botão de exclusão ou ícone de fechar com `h-6 w-6` (24x24px) solto sem padding de expansão no mobile (DL-14).
- Empilhar múltiplos botões de ação com menos de 4px de distância entre si.

---

## C.8 Adaptatividade e Layouts Canônicos

### Os Três Layouts Canônicos (Material 3)
1. **Lista-Detalhe (Master-Detail):**
   - Compact: A lista ocupa 100% da viewport; o toque navega em profundidade para tela inteira com botão de retorno.
   - Expanded: Coluna de lista fixa à esquerda (320px a 380px) e painel de detalhes amplo à direita (flex-1).
2. **Painel de Apoio (Supporting Panel):**
   - Compact: Painel de apoio aberto sob demanda como Bottom Sheet de 100dvh.
   - Expanded: Painel lateral dockado de 320px à direita da área de trabalho principal.
3. **Feed / Bento Grid Operacional:**
   - Compact: Trilho vertical único com snap horizontal para coleções de destaque.
   - Expanded: Grid multi-colunas assimétrico com cards agrupados por afinidade semântica.

### Violações típicas
- Implementar tabelas largas que apenas espremem o conteúdo no mobile gerando truncamento ilegível (DL-29).
- Manter menus laterais desktop ocupando 50% da largura útil em smartphones.

---

## C.9 Conteúdo, Concisão e Silêncio Textual

### Diretrizes de Linguagem
- **Voz e Tom:** Direto, factual, neutro, sem jargões de marketing e sem adjetivos decorativos (Shopify Polaris; Krug Don't Make Me Think).
- **Rótulos de Botão:** Máximo de 3 palavras no formato `[Verbo de Ação] + [Objeto]` (ex: "Salvar Produto", "Excluir Pedido", "Emitir Nota") (DL-24).
- **Títulos de Tela:** Máximo de 6 palavras, atômicos e objetivos (ex: "Configurações de Entrega", "Estoque de Matriz") (DL-19).
- **Proibição de Textos Explicativos Óbvios:** Proibido caixas de boas-vindas redundantes como "Bem-vindo ao módulo de clientes. Aqui você pode gerenciar seus clientes..." (DL-20, DL-21).
- **Zero Emoji:** Proibido o uso de emojis na interface ou como substituto de ícones semânticos (DL-23).

### Violações típicas
- Cabeçalhos de tela compostos com instruções didáticas para o usuário (DL-19, DL-20).
- Botões com textos prolixos como "Clique aqui para confirmar e prosseguir com o pagamento" (DL-24).

---

## C.10 Matriz Obrigatória de Estados de Componente

Todo componente de dados ou superfície interativa DEVE implementar exaustivamente os 4 estados fundamentais (Nielsen, Visibilidade de Estado):
1. **Estado de Dados (Data/Success):** Renderização limpa do payload recebido, com tipagem estrita e sem fallback inventado.
2. **Estado de Carregamento (Loading/Pending):** Skeleton estruturado com dimensões espelhadas no layout final, evitando Layout Shift (CLS < 0.1) (DL-11).
3. **Estado Vazio (Empty State):** Mensagem de exatamente 2 linhas explicando a ausência do dado e fornecendo ação primária clara para criação (DL-12).
4. **Estado de Erro (Error State):** Caixa de diagnóstico contextual com código do erro, texto amigável e botão para nova tentativa sem reload de página (DL-13).

### Violações típicas
- Tela branca ou spinner genérico travando o layout enquanto dados assíncronos são carregados (DL-11).
- Listagem vazia que renderiza tela em branco sem componente indicativo (DL-12).

---

## C.11 Acessibilidade Universal (WCAG 2.2 Nível AA)

### Critérios Normativos Invioláveis
- **Foco Visível e Não Obstruído (WCAG 2.4.7 e 2.4.11):** Todo elemento focável via teclado possui anel de foco visível com espessura mínima de 2px, contraste de 3:1 contra o fundo e `scroll-margin` mínimo de 80px superior e 60px inferior para evitar ocultação por barras fixas (DL-15).
- **Contraste de Texto e UI (WCAG 1.4.3 e 1.4.11):** 4.5:1 para texto normal, 3:1 para texto grande (>= 18pt) e 3:1 para elementos gráficos essenciais de controle (DL-16, DL-17).
- **Identificação de Campos (WCAG 3.3.2):** Todo `<input>` possui elemento `<label>` programaticamente associado via `htmlFor` e `id`. Proibido depender exclusivamente do atributo `placeholder`.

### Violações típicas
- Omitir `:focus-visible` em botões customizados baseados em `div` ou `span` (DL-15).
- Associar inputs de formulário sem tags `<Label>` correspondentes.

---

## C.12 Lista Consolidada de Proibições com ID de Detecção

| ID | Proibição Absoluta | Severidade | Detecção Automatizada |
| --- | --- | --- | --- |
| DL-01 | Cor literal hex/rgb fora dos tokens | P1 | Regex `#[0-9a-fA-F]{3,8}` e `rgb\(` em arquivos TSX/JSX |
| DL-02 | Classe arbitrária entre colchetes | P1 | Regex `-\[[^\]]+\]` em atributos `className` |
| DL-03 | Espaçamento fora da grade modular de 4px | P1 | Checagem de múltiplos de 4 em classes de padding/margin |
| DL-04 | Uso de `!important` no CSS ou utilitários | P0 | Regex `!important` ou `!\w+` |
| DL-05 | Inline style com cor, sombra ou espaço | P1 | Regex `style=\{\{` contendo propriedades de layout ou cor |
| DL-06 | Z-index arbitrário acima de 50 | P2 | Detecção de `z-[...]` ou `z-50+` fora da escala de tokens |
| DL-07 | Sombra em superfície normal de app | P2 | Detecção de classes `shadow-` fora de modais/popovers |
| DL-08 | Gradiente decorativo em superfícies | P2 | Detecção de `bg-gradient-` em superfícies de aplicação |
| DL-09 | Mais de 4 raios distintos na base | P2 | Contagem de cardinalidade em classes `rounded-` |
| DL-10 | Mais de 8 tamanhos de fonte distintos | P2 | Contagem de cardinalidade em classes `text-` |
| DL-11 | Superfície de dados sem loading/skeleton | P1 | AST check em views de dados assíncronos |
| DL-12 | Superfície de dados sem empty state | P1 | AST check em componentes de listagem |
| DL-13 | Superfície de dados sem error state | P1 | AST check em rotas e loaders assíncronos |
| DL-14 | Alvo interativo abaixo de 44px no mobile | P1 | Checagem de `h-` e `size-` < 11 em botões móveis |
| DL-15 | Elemento interativo sem foco visível | P0 | Inspeção de `onClick` desacompanhado de `:focus-visible` |
| DL-16 | Contraste de texto abaixo de 4.5:1 | P0 | Cálculo determinístico de contraste em pares de cores |
| DL-17 | Contraste de controle abaixo de 3:1 | P0 | Cálculo determinístico de contraste em bordas de input |
| DL-18 | Texto branco ou preto literal | P1 | Detecção de `text-white`, `text-black`, `bg-white` |
| DL-19 | Título de tela acima de 6 palavras | P2 | Contagem de palavras em elementos `h1` e títulos |
| DL-20 | Subtítulo redundante em relação ao título | P2 | Análise de sobreposição de termos entre `h1` e `p` |
| DL-21 | Parágrafo explicativo dentro de cartão | P3 | Detecção de blocos de texto instrutivos redundantes |
| DL-22 | Mais de 2 linhas de texto em item de lista | P2 | Checagem de truncamento em linhas de tabela/lista |
| DL-23 | Emoji na interface ou arquivos de spec | P2 | Regex de caracteres Unicode na faixa de emojis |
| DL-24 | Rótulo de botão com mais de 3 palavras | P2 | Contagem de palavras no conteúdo textual de botões |
| DL-25 | Componentes duplicados por similaridade | P2 | Análise de duplicidade nominal no diretório components |
| DL-26 | Animação acima de 300ms sem justificativa | P2 | Detecção de `duration-400`, `duration-500+` |
| DL-27 | Transição genérica `transition-all` | P3 | Busca literal de `transition-all` |
| DL-28 | Ausência de respeito a movimento reduzido | P1 | Checagem de `motion-reduce` em transições ativas |
| DL-29 | Layout que não bifurca shell em 1024px | P2 | Ausência de controle adaptativo móvel vs desktop |
| DL-30 | Token declarado sem uso no projeto | P3 | Cruzamento de variáveis de styles.css com código fonte |
