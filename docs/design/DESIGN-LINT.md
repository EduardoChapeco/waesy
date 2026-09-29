# DESIGN-LINT.md — Catálogo Normativo de Defeitos Visuais (DL-01 a DL-30)

Este catálogo estabelece as regras determinísticas de detecção de defeitos visuais, severidades invioláveis, fundamentação teórica e algoritmos de auditoria mecânica.

## Classificação de Severidades
- **P0 (Bloqueia Entrega):** Falha grave de acessibilidade, cascata ou integridade. Zero tolerância; aborta entrega imediatamente.
- **P1 (Bloqueia Merge):** Quebra de conformidade de tokens, alvos de toque, estados ausentes ou valores arbitrários. Bloqueia PR/Merge.
- **P2 (Fila de Correção):** Desvios de cardinalidade, durações elevadas, prolixidade de títulos ou similares. Registrado na fila de auditoria.
- **P3 (Polimento):** Tokens mortos, transições genéricas ou redundâncias de layout menores.

---

## Catálogo de Regras Normativas

### DL-01: Cor literal fora da camada de token
- **Severidade:** P1
- **Fundamentação:** W3C DTCG / Material 3 Tonal Palette / Atomic Design.
- **Regra:** Proibido declarar códigos `#HEX`, `rgb()`, `rgba()` ou `hsl()` diretamente em arquivos `.tsx`, `.jsx` ou `.css` fora de `tokens.json` e `styles.css`.
- **Detecção:** Regex `#(?:[0-9a-fA-F]{3,4}){1,2}\b` e `\b(?:rgb|hsl)a?\([^)]+\)` em arquivos do diretório `src/`.

### DL-02: Classe arbitrária com valor entre colchetes
- **Severidade:** P1
- **Fundamentação:** Bringhurst / Grid Systems (Müller-Brockmann) / Refactoring UI.
- **Regra:** Proibido uso de utilitários Tailwind com colchetes contendo valores arbitrários (ex: `w-[327px]`, `p-[13px]`, `text-[#333]`).
- **Detecção:** Regex `\b[a-zA-Z0-9_-]+-\[[^\]]+\]` em atributos `className`.

### DL-03: Espaçamento fora da grade de 4px
- **Severidade:** P1
- **Fundamentação:** IBM Carbon 2x Grid / Atlassian Design System.
- **Regra:** Todo valor de padding, margin ou gap deve ser estritamente múltiplo de 4px (`p-1`, `p-2`, `p-3`, `p-4`, etc.).
- **Detecção:** Inspeção das classes `p-`, `m-`, `gap-` validando mapeamento nos tokens `space-0` a `space-16`.

### DL-04: Uso de `!important` ou modificadores de força bruta
- **Severidade:** P0
- **Fundamentação:** Arquitetura CSS e especificidade / Manutenibilidade de Plataforma.
- **Regra:** Proibido uso de `!important` em CSS ou prefixos `!` em classes Tailwind.
- **Detecção:** Busca literal de `!important` e regex `!\w+` em atributos de classe.

### DL-05: Inline style com cor, sombra ou espaçamento
- **Severidade:** P1
- **Fundamentação:** W3C DTCG / Princípio Tokenizado.
- **Regra:** Proibido declarar atributos `style={{ color: ..., padding: ... }}` em elementos de interface.
- **Detecção:** Regex `style\s*=\s*\{\{\s*[^}]*(?:color|background|padding|margin|width|height)[^}]*\}\}`.

### DL-06: Z-index arbitrário acima da escala (ou > 50)
- **Severidade:** P2
- **Fundamentação:** Gestão de Camadas de Superfície e Modais.
- **Regra:** Z-index restrito aos tokens do sistema (0, 10, 20, 30, 40, 50). Proibido `z-[9999]`.
- **Detecção:** Regex `\bz-(?:[6-9]\d|\d{3,}|\[[^\]]+\])\b`.

### DL-07: Sombra em superfície de aplicação
- **Severidade:** P2
- **Fundamentação:** Princípio Silencioso / Tufte Data-Ink / Fluent 2 Elevation.
- **Regra:** Sombras são restritas a popovers, dropdowns e modais. Cards e superfícies utilitárias utilizam bordas de 1px.
- **Detecção:** Classes `shadow-` em elementos que não possuam `role="dialog"`, `role="menu"` ou `Popover`.

### DL-08: Gradiente decorativo em superfície utilitária
- **Severidade:** P2
- **Fundamentação:** Princípio Silencioso / Anti-AI Design.
- **Regra:** Proibido o uso de `bg-gradient-` em cards, botões ou cabeçalhos utilitários da aplicação.
- **Detecção:** Regex `\bbg-gradient-[a-z]+\b` em componentes de aplicação.

### DL-09: Mais de 4 raios distintos na base de componentes
- **Severidade:** P2
- **Fundamentação:** Apple HIG Squircle System / Consistência Geométrica.
- **Regra:** O sistema utiliza estritamente 4 raios: `none` (0), `sm` (4px), `md` (8px), `lg` (12px) e `full`.
- **Detecção:** Verificação do conjunto de classes `rounded-` presentes na tela.

### DL-10: Cardinalidade de tamanhos de fonte acima de 8
- **Severidade:** P2
- **Fundamentação:** Bringhurst Practical Typography / Escala Modular Major Third.
- **Regra:** Máximo de 8 tamanhos de fonte no sistema: `xs`, `sm`, `base`, `lg`, `xl`, `2xl`, `3xl`, `4xl`.
- **Detecção:** Contagem de variações distintas de `text-` em arquivos do módulo.

### DL-11: Superfície de dados sem estado de carregando (Skeleton)
- **Severidade:** P1
- **Fundamentação:** Nielsen Heurística 1 (Visibilidade de Estado) / Core Web Vitals (CLS < 0.1).
- **Regra:** Todo componente que consome query assíncrona deve implementar skeleton com dimensões espelhadas.
- **Detecção:** Análise de chamadas `useQuery` sem verificação de `isLoading` ou `<Skeleton />`.

### DL-12: Superfície de dados sem estado vazio (Empty State)
- **Severidade:** P1
- **Fundamentação:** Nielsen Heurística 5 (Prevenção de Erro e Orientação).
- **Regra:** Toda listagem ou tabela deve renderizar um componente descritivo quando a coleção for vazia (`length === 0`).
- **Detecção:** Análise de renderização condicional de arrays em views de dados.

### DL-13: Superfície de dados sem estado de erro
- **Severidade:** P1
- **Fundamentação:** Nielsen Heurística 9 (Reconhecimento e Recuperação de Falhas).
- **Regra:** Todo fluxo de dados assíncrono deve capturar falhas de rede e renderizar diagnóstico com botão de reintento.
- **Detecção:** Verificação de tratamento de `isError` nas queries da rota.

### DL-14: Alvo interativo abaixo de 44px no mobile
- **Severidade:** P1
- **Fundamentação:** Apple HIG Touch Targets / Parhi, Karlson, Bederson (2006) / WCAG 2.2 AA 2.5.8.
- **Regra:** Todo elemento clicável em telas compactas (<600px) possui altura e largura mínimas de 44x44px (`h-11`).
- **Detecção:** Classes `h-` e `size-` inferiores a `11` em botões, links e tags interativas.

### DL-15: Elemento interativo sem foco visível
- **Severidade:** P0
- **Fundamentação:** WCAG 2.2 AA Critérios 2.4.7 (Focus Visible) e 2.4.11 (Focus Not Obscured).
- **Regra:** Todo controle focável via teclado deve declarar obrigatoriamente `:focus-visible` com anel contrastante de 2px.
- **Detecção:** Presença de `onClick` ou `<button>` desprovido de classes `focus-visible:ring-2`.

### DL-16: Contraste de texto abaixo de 4.5:1
- **Severidade:** P0
- **Fundamentação:** WCAG 2.2 AA Critério 1.4.3 / APCA Lightness Contrast.
- **Regra:** O contraste entre a cor de texto normal (<18pt) e o plano de fundo deve ser maior ou igual a 4.5:1.
- **Detecção:** Avaliação de luminância relativa dos pares de cores declarados nos componentes.

### DL-17: Contraste de controle de interface abaixo de 3:1
- **Severidade:** P0
- **Fundamentação:** WCAG 2.2 AA Critério 1.4.11 (Non-text Contrast).
- **Regra:** Bordas de inputs ativos, caixas de seleção e interruptores devem ter contraste de pelo menos 3:1 contra o fundo.
- **Detecção:** Cálculo de luminância das bordas de controle (`border-control`) sobre a superfície.

### DL-18: Texto branco ou preto literal hardcoded
- **Severidade:** P1
- **Fundamentação:** Princípio Tokenizado / Suporte Dinâmico a Temas.
- **Regra:** Proibido uso de classes literais `text-white`, `text-black`, `bg-white`, `bg-black`.
- **Detecção:** Regex `\b(?:text|bg)-(?:white|black)\b` no código fonte.

### DL-19: Título de tela composto ou com mais de 6 palavras
- **Severidade:** P2
- **Fundamentação:** Shopify Polaris Content / Krug Don't Make Me Think.
- **Regra:** Títulos de cabeçalho (`h1`, `h2`, abas) não podem ultrapassar 6 palavras.
- **Detecção:** Contagem de palavras nas tags de cabeçalho da view.

### DL-20: Subtítulo redundante em relação ao título
- **Severidade:** P2
- **Fundamentação:** Princípio Silencioso / Tufte.
- **Regra:** Subtítulos que apenas repetem os termos do título com prolixidade são terminantemente proibidos.
- **Detecção:** Análise de sobreposição lexical superior a 70% entre título e subtítulo imediato.

### DL-21: Parágrafo dentro de cartão explicando o cartão
- **Severidade:** P3
- **Fundamentação:** Princípio Silencioso / Densidade Cognitiva.
- **Regra:** Proibido texto descritivo redundante que explica a finalidade de um card com título autoevidente.
- **Detecção:** Presença de blocos de texto instrutivo dentro de cards utilitários.

### DL-22: Mais de 2 linhas de texto em item de lista
- **Severidade:** P2
- **Fundamentação:** Scannability / Miller (1956).
- **Regra:** Itens de listagens densas devem truncar títulos em 1 linha e descrições em no máximo 2 linhas (`line-clamp-2`).
- **Detecção:** Ocorrência de parágrafos sem controle de truncamento em itens repetitivos.

### DL-23: Emoji em interface do produto
- **Severidade:** P2
- **Fundamentação:** Princípio Silencioso / Governança Visual Waesy.
- **Regra:** Proibido o uso de emojis na interface ou em documentos técnicos de especificação. Substituir por Phosphor/Lucide.
- **Detecção:** Regex de caracteres Unicode na faixa `[\u{1F300}-\u{1F9FF}]`.

### DL-24: Rótulo de botão acima de 3 palavras
- **Severidade:** P2
- **Fundamentação:** Shopify Polaris Action Labels / Fitts (1954).
- **Regra:** Botões devem conter no máximo 3 palavras no formato `[Verbo] + [Substantivo]`.
- **Detecção:** Contagem de palavras no conteúdo textual de elementos `<Button>` e `<button>`.

### DL-25: Componentes duplicados por similaridade
- **Severidade:** P2
- **Fundamentação:** Atomic Design / Eliminação de Código Órfão.
- **Regra:** Proibido criar variações duplicadas de componentes existentes no catálogo (`src/components/ui/`).
- **Detecção:** Comparação de similaridade de nomes e estruturas no diretório de componentes.

### DL-26: Animação acima de 300ms sem justificativa
- **Severidade:** P2
- **Fundamentação:** Nielsen Limites de Resposta / Material 3 Motion Tokens.
- **Regra:** Transições e animações de interface não podem ultrapassar a duração de 300ms.
- **Detecção:** Regex `\bduration-(?:[4-9]\d{2}|\d{4,})\b`.

### DL-27: Transição genérica que anima todas as propriedades
- **Severidade:** P3
- **Fundamentação:** Web Performance / Redução de Reflows de GPU.
- **Regra:** Proibido uso de `transition-all`. Animar estritamente propriedades de composição: `transform`, `opacity`, `colors`.
- **Detecção:** Regex `\btransition-all\b`.

### DL-28: Ausência de respeito a movimento reduzido
- **Severidade:** P1
- **Fundamentação:** WCAG 2.2 AA Critério 2.3.3 (Animation from Interactions).
- **Regra:** Transições ativas devem incluir a classe `motion-reduce:transition-none` ou regra CSS correspondente.
- **Detecção:** Verificação de `motion-reduce` em arquivos contendo animações declaradas.

### DL-29: Layout que apenas encolhe sem trocar de shell
- **Severidade:** P2
- **Fundamentação:** Material 3 Window Size Classes / Princípio Nativo por Plataforma.
- **Regra:** Telas móveis (<600px) devem bifurcar layout, proibindo tabelas horizontais encolhidas.
- **Detecção:** Presença de classes de grid desktop sem contrapartida móvel responsiva.

### DL-30: Variável de token declarada e não usada
- **Severidade:** P3
- **Fundamentação:** Piso de Integridade / Eliminação de Dead Code.
- **Regra:** Toda variável declarada em `tokens.json` e `styles.css` deve possuir ao menos um consumidor no código fonte.
- **Detecção:** Cruzamento da lista de variáveis CSS com o conteúdo de todos os componentes em `src/`.
