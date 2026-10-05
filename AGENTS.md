# AGENTS.md — Contrato Operacional do Repositório

## B.1 Missão e Escopo
O Waesy é um ecossistema operacional integrado de comércio, serviços e gestão local para cidades e comunidades.
Não é uma rede social genérica, não é um agregador de links descartável e não é uma coleção de telas desconexas.
Qualquer alteração deve reforçar a integridade transacional, a governança multi-tenant e a consistência visual do produto.

## B.2 Mapa do Repositório
- `src/components/`: Primitivas e blocos modulares de interface. Proibido declarar cores literais ou regras de negócio brutas.
- `src/services/`: Camada BFF (Server Functions) e integrações. Proibido importar bibliotecas de UI ou manipular DOM.
- `src/lib/`: Utilitários puros, schemas Zod, formatadores e clientes de infraestrutura.
- `src/routes/`: Definições de rota via TanStack Router. Proibido acoplar persistência direta sem passar por `services/`.
- `docs/design/`: Fonte Única da Verdade (SSOT) de design tokens, layout adaptativo, movimento e diretrizes visuais.
- `docs/UX_RESEARCH.md`: SSOT de pesquisa com usuários e síntese de evidências empíricas.
- `docs/FILE_MANAGEMENT.md`: SSOT de governança de operações com arquivos e lote seguro.
- `docs/THEME_FACTORY.md`: SSOT da Fábrica de Temas e estilização canônica de artefatos.
- `docs/PERFORMANCE.md`: SSOT de performance web, Core Web Vitals e orçamentos de carregamento.
- `.agents/`: Skills, agentes especializados, fluxos operacionais e regras canônicas do IDE Antigravity.
- Áreas proibidas: `node_modules/`, `dist/`, `.git/`, e arquivos de outros módulos fora do escopo da tarefa.

## B.3 Ordem de Leitura Obrigatória
1. `AGENTS.md`: Contrato de operação e limites absolutos do repositório.
2. `docs/design/DESIGN.md`: Constituição visual, princípios, geometria e papéis semânticos.
3. `docs/design/DESIGN-LINT.md`: Catálogo normativo de defeitos visuais (DL-01 a DL-30) e severidades.
4. Spec da tarefa ativa (ex: `docs/specs/SPEC-*.md`): Escopo delimitado, critérios de aceite e evidência esperada.

## B.4 Gates de Design
- DL-04 (`!important` no CSS ou utilitários) → Busca literal de `!important` ou `!\w+` → Severidade P0 (Bloqueia entrega).
- DL-15 (Ação interativa sem `:focus-visible`) → Detecção de `onClick`/botão sem anel de foco → Severidade P0 (Bloqueia entrega).
- DL-16/DL-17 (Contraste abaixo de 4.5:1 em texto ou 3:1 em controle) → Cálculo de luminância APCA/WCAG → Severidade P0 (Bloqueia entrega).
- DL-01 (Cor literal hex/rgb fora de token) → Busca de hex ou rgb fora de tokens.json/styles.css → Severidade P1 (Bloqueia merge).
- DL-02 (Classes com valores arbitrários entre colchetes) → Detecção de `-[\w#%]+` → Severidade P1 (Bloqueia merge).
- DL-03 (Espaçamento fora da grade de 4px) → Detecção de valores mágicos não múltiplos de 4px → Severidade P1 (Bloqueia merge).
- DL-14 (Alvo de toque abaixo de 44px no mobile) → Detecção de altura/largura inferior a `h-11` (44px) → Severidade P1 (Bloqueia merge).
- DL-11/DL-12/DL-13 (Ausência de loading/empty/error state) → Inspeção de visualizações de dados → Severidade P1 (Bloqueia merge).

## B.5 Fluxo Obrigatório de Trabalho
1. Especificar: Declarar a spec em sintaxe EARS com entradas, saídas, invariantes e evidências.
2. Aprovar a spec por escrito: Registrar em documento de especificação antes de alterar código.
3. Implementar um item: Modificar estritamente os arquivos autorizados pelo escopo atômico.
4. Verificar com evidência: Provar conformidade via testes automatizados, build limpo e design lint.
5. Registrar no log: Atualizar `docs/design/DECISIONS.md` ou relatório de fechamento de módulo.

## B.6 Contrato de Saída
- O agente responde exclusivamente em schema: tabela de arquivos criados/modificados, relatório de 6 linhas ou diff limpo.
- Proibido qualquer prefácio conversacional ("Com certeza", "Vou analisar", "Ótima ideia").
- Proibido resumo redundante do pedido do usuário ou conclusão motivacional ("Espero ter ajudado!").
- Relatórios numéricos devem ser apresentados em formato tabular Markdown estrito.

## B.7 Economia de Contexto
- Memória persistida em disco (`docs/design/`, `auditoria/`) em vez de retenção em histórico de chat.
- Uma sessão por módulo de trabalho; leitura cirúrgica por janela delimitada (`StartLine`/`EndLine`).
- Handoff padronizado de no máximo 12 linhas ao final de cada fase em `docs/design/DECISIONS.md`.
- Selo de módulo fechado registrado na fila de auditoria com hash e confirmação de build.

## B.8 Proibições Absolutas
- Proibido uso de `!important` ou modificadores de força bruta no Tailwind e CSS.
- Proibido declarar cores hexadecimais, RGB ou HSL diretamente nos componentes.
- Proibido usar classes arbitrárias com valores mágicos entre colchetes (`w-[327px]`, `mt-[13px]`).
- Proibido usar espaçamentos, margens ou paddings fora da grade modular de 4px.
- Proibido aplicar sombras decorativas em superfícies de aplicação (sombras restritas a overlays/modais).
- Proibido uso de gradientes decorativos em superfícies utilitárias de aplicação.
- Proibido emoji na interface do produto ou em arquivos técnicos de especificação.
- Proibido modal de confirmação para ações destrutivas reversíveis (usar ação imediata com desfazer via toast).
- Proibido texto de interface que explica a própria tela ou jargões prolixos de boas-vindas.
- Proibido título composto ou com mais de 6 palavras em cabeçalhos, abas e tabelas.
- Proibido mais de uma ação primária (`variant="default"`) por superfície ou tela.
- Proibido criar componente duplicado quando já existe primitivo canônico equivalente.
- Proibido alterar arquivos pertencentes a módulos vizinhos sem autorização explícita da spec.

## B.9 Definition of Done
- [ ] Especificação técnica aprovada e registrada em `docs/specs/`.
- [ ] Tokens consumidos estritamente a partir da camada de componente de `tokens.json` e `styles.css`.
- [ ] Zero erros de compilação TypeScript (`npm run typecheck` com Exit Code 0).
- [ ] Build de produção aprovado (`npm run build` gerando assets e worker com Exit Code 0).
- [ ] Lint visual executado com 0 violações P0 e 0 violações P1 em `scripts/design-lint.mjs`.
- [ ] Matriz de estados completa: dados, carregamento (skeleton), vazio (empty) e erro.
- [ ] Alvos de toque móveis com dimensão mínima de 44x44px (`h-11`).
- [ ] Contraste verificado conforme WCAG 2.2 AA (>= 4.5:1 em texto, >= 3:1 em controles).
- [ ] Registro de decisão e handoff documentado em `docs/design/DECISIONS.md`.

## B.10 Protocolo de Parada
O agente deve interromper imediatamente o trabalho e devolver a decisão ao humano nos seguintes casos:
1. Achado de escopo divergente que exija refatoração fora da árvore delimitada pela spec.
2. Ambiguidade de regra de negócio ou conflito entre duas especificações normativas ativas.
3. Necessidade de alteração simultânea em mais de 2 arquivos estruturais não previstos.
4. Detecção de falha crítica de segurança (P0) em autenticação, RLS, bypass de tenant ou dados financeiros.

## B.11 Registro de Decisões
- Todas as decisões arquiteturais, exceções de design lint e substituições de tokens são salvas em `docs/design/DECISIONS.md`.
- Formato obrigatório: Data (ISO), ID da Decisão (DEC-XXX), Contexto, Decisão Adotada, Fundamentação Teórica, Consequências.
- Proibido manter decisões apenas no histórico de mensagens volátil do chat.

## B.12 Índice de Skills e Agentes
- `design-foundations`: Criação e estruturação inicial de telas, componentes e layouts canônicos.
- `color-and-contrast`: Seleção, derivação e auditoria de contraste e paletas tonais.
- `typography-scale`: Definição e revisão de escala, pesos, medidas de linha e entrelinha.
- `spacing-and-grid`: Ajuste de espaçamento, colunas, gutters e alinhamento pela grade de 4px.
- `motion-and-feedback`: Implementação de micro-interações, durações, curvas e redução de movimento.
- `layout-adaptivity`: Decisão e bifurcação de layout entre compacto (<600px), médio e expandido (>=840px).
- `component-api`: Criação e refatoração de contratos de componentes com matriz de estados.
- `content-density`: Revisão de concisão textual, rótulos de ação e eliminação de prolixidade.
- `accessibility-floor`: Auditoria e garantia de conformidade com o piso WCAG 2.2 AA.
- `design-lint`: Verificação determinística automatizada de regras visuais DL-01 a DL-30.
- `prompt-optimizer`: 27. **Mandato de Otimização EARS** (Sintaxe EARS e requisitos estruturados).
- `decompose-prd`: 28. **Mandato de Decomposição Hierárquica MECE** (DAG MECE de épicos e tarefas).
- `pm`: 29. **Mandato do Gerente de Produto Autônomo** (.agents/skills/pm/SKILL.md, "Você É o PM").
- `web-performance`: 30. **Mandato de Alta Performance Web** (docs/PERFORMANCE.md e Core Web Vitals).
- `ux-research-synthesis`: Pesquisa empírica (Regra 31: Mandato de Pesquisa Empírica & Síntese de UX).
- `file-manager`: Operações seguras (Regra 32: Mandato de Governança de Arquivos, Pastas & Operações em Lote).
- `theme-factory`: 10 temas canônicos (Regra 33: Mandato da Fábrica de Temas & Estilização de Artefatos).
- Agentes especializados (`design-system-architect`, `visual-auditor`, `flow-architect`, `platform-splitter`, `component-craftsman`, `content-editor`, `a11y-guardian`, `spec-writer`).

## B.20 Invariante de Bilateralidade do CMS de Vitrines & Personalização Master
- Todo bloco de destaque, hero, atalho de acesso rápido ou trilho visual apresentado nas vitrines públicas (`_store.*`) DEVE ser 100% configurável pelo painel do Admin Master através das tabelas `marketplace_surfaces`, `marketplace_sections` ou `hotpages`. É expressamente proibido declarar blocos comerciais com textos, imagens, links e badges hardcoded sem espelho de edição no Admin Master.

## B.21 Invariante de Nativização e Desbloqueio de Módulos Verticais (Mobilidade / MotoLink)
- Rotas públicas de serviços urbanos e utilitários (ex: `_store.mobilidade.tsx`) NÃO DEVEM conter bloqueios artificiais de role no loader que forcem redirecionamento para classificados. Visitantes e usuários civis possuem direito irrestrito de visualizar a interface, simular corridas e estimar fretes. Apenas a confirmação transacional final exige autenticação civil (via `ActionAuthGuardModal`).

## B.22 Invariante de CTAs Táteis e Padronização de Cards de Vitrine
- Todo card de produto ou oferta em vitrines (`OfferCard`) DEVE conter CTA primário proeminente ("Ver Oferta" ou "Adicionar") com altura mínima de 44px (`h-11 min-h-11`), anel de foco teclado (`:focus-visible`) e área tátil adequada. Todo card de estabelecimento (`StoreCard`) DEVE conter botão explícito ("Ver Loja" ou "Ver Empresa") assegurando affordance clara e conformidade total com o piso WCAG 2.2 AA.

## B.23 Invariante do Modelo Operacional Waesy Go (0% de Comissão Abusiva & Taxa Fixa)
- O ecossistema Waesy Go opera sob taxa fixa estrita de R$ 0,99 por corrida ou entrega finalizada. É terminantemente proibido cobrar porcentagens sobre o valor das corridas dos profissionais. As tarifas (base, KM, condomínio e escada) são geridas com autonomia pelo condutor, respeitando o piso mínimo de viabilidade econômica (R$ 2,00/km moto e R$ 2,50/km carro).

## B.24 Invariante de Tolerância de 3 Minutos e Inadimplência Vinculada ao CPF
- A tolerância máxima de espera pelo passageiro após chegada do motorista é de 3 minutos cronometrados com telemetria GPS. Caso o cliente não compareça, o condutor cancela com cobrança integral do valor cotado, registrado no CPF do cliente em `customer_debt_ledger`. Uma barreira Zero-Trust impede novos chamados de corrida, fretes e pedidos de delivery enquanto a dívida não for quitada.

## B.25 Invariante de Integridade de Parâmetros em Server Functions
- Toda função BFF (`*.functions.ts`) que recebe payload tipado via Zod DEVE desestruturar 100% dos parâmetros utilizados no escopo da função ou referenciar o objeto raiz de dados, incluindo tratamento defensivo para valores opcionais/nulos, acompanhada de testes unitários que exercitem branches com parâmetros presentes e ausentes.

## B.26 Invariante de Altura Canônica de Controles de Cabeçalho (Piso 44px)
- Todos os controles interativos na barra de topo global (`TopBar`, `UtilityCluster`, `LocationMasterPill`, campo de busca global, botões de ação e gatilho de perfil) DEVEM compartilhar a altura canônica exata de 44px (`h-11 min-h-11`), com área de toque mínima de 44x44px (`size-11`) e anéis de foco `:focus-visible:ring-2`.

## B.27 Invariante de Renderização Direta de Avatar Civil com Fallback Sem Fricção
- O gatilho de perfil do cabeçalho e superfícies públicas DEVE renderizar a imagem de perfil (`profiles.avatar_url`) diretamente via elemento `<img>` com tratamento defensivo de erro (`onError`), sem depender de máquinas de estado assíncronas externas que fiquem presas na inicial, caindo para a inicial apenas se a imagem não existir ou falhar.

## B.28 Invariante de Padronização Vertical e CTA Proeminente de Cards de Ofertas e Vitrines
- Cards de marketplace, produtos e classificados em trilhos públicos DEVEM compartilhar proporções verticais canônicas uniformes (`aspect-[4/3]` ou `aspect-square`), com título, preço formatado, localização e CTA primário obrigatório (`h-11 min-h-11`) com texto descritivo claro ("Ver Oferta" / "Ver Anúncio" / "Comprar"). Cards editoriais líderes (`HitsLeadCard`) DEVEM ocupar a altura exata dos cards da fileira sem lacunas.

## B.29 Invariante de Programação Temporal e Auto-Arquivamento de Campanhas CMS
- Banners, seções de marketplace (`marketplace_sections`) e hotpages (`hotpages`) DEVEM suportar agendamento temporal (`starts_at`, `ends_at`, `auto_archive_at`), onde itens fora do intervalo são automaticamente omitidos pelas queries BFF e seções vazias são completamente ocultadas da interface sem quebrar o layout.

## B.30 Invariante de Integridade Visual do Feed Social em Trilhos de Vitrine
- Cards do feed social em trilhos de descoberta DEVEM ser renderizados com estrutura completa de post social (autor, avatar com fallback, handle, badge, data relativa, texto formatado, contadores de engajamento e CTA tátil). Imagens inexistentes ou inválidas NUNCA devem renderizar elementos de imagem quebrada (`<img>` vazio/órfão).

