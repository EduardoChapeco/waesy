# Reaudit 2026-10-06-05 — Rotas, páginas, formulários e botões

## Escopo e método

Auditoria estática exclusiva do domínio **Rotas/páginas/forms/controles/navegação/estados** em `/home/ubuntu/waesy-audit`. Não houve alteração de código de produto. Foram lidos:

- `src/routes/**/*.tsx|ts`, `src/router.tsx`, `src/routes/__root.tsx` e componentes compartilhados de estado/formulário/navegação;
- testes sob `src/routes/__tests__` e auditorias estáticas existentes;
- migrations relevantes de formulários de lead, gift cards, squads/agentes e eventos;
- serviços BFF usados pelas páginas auditadas.

Comandos/evidências executados:

- `node scripts/audit/audit-interactive-buttons.test.mjs`: **8 testes aprovados**;
- `npx vitest run src/routes/__tests__/store-route-loaders.test.ts src/routes/__tests__/_store.evento-turismo-detail.test.ts`: **2 arquivos, 7 testes aprovados**;
- `node scripts/audit-navigation-completeness.mjs`: **247 links workspace válidos, 0 quebrados, 0 rotas workspace sem link direto**;
- análise AST atual de controles em amostras críticas: **0 issues atuais** no artefato `scripts/audit/button-ast-audit.json` (timestamp 2026-10-06T14:32:08Z). O arquivo antigo `scripts/audit/button-audit-results.json` é de 2026-10-05 e registra 3.310 dead buttons; ele não foi tratado como estado atual porque diverge da análise AST mais recente.

> **Regra de leitura:** fatos observados estão em “Fato”. Impacto provável, quando depende de execução contra banco/rede, está explicitamente marcado como “Hipótese/risco”.

## Sumário executivo

| ID | Severidade | Área | Situação |
|---|---|---|---|
| PAGES-01 | P1 | Home pública / loader | Falhas de múltiplas fontes são convertidas em listas vazias; a página não distingue indisponibilidade de ausência de dados. |
| PAGES-02 | P1 | Workspace Eventos | Falha de `listAdminEvents` cai no empty state “Nenhum evento encontrado” e oferece criar evento, sem erro/retry. |
| PAGES-03 | P1 | Conta / gift cards | BFF e loader engolem erros e sempre retornam `[]`; o usuário pode ver “Nenhum vale” quando houve falha de leitura. |
| PAGES-04 | P1 | Workspace Squads | `useQuery` lê apenas `isLoading`; não há `isError` nem empty state para lista vazia. A ação fica sem contexto quando o catálogo falha. |
| PAGES-05 | P2 | Marketing Studio | Duas queries não expõem loading/error; falhas são indistinguíveis de catálogo vazio e a UI mantém conteúdo default exportável. |
| PAGES-06 | P1 | Financeiro/Caixa | Histórico financeiro usa fallback `[]` por chamada; a tabela não informa que o histórico pode estar incompleto. |
| PAGES-07 | P2 | Governança de cobertura | Inventários versionados não estão sincronizados com o código: 398 definições atuais, 372 entradas no inventário forense e documento declarando 405. |

## Achados detalhados

### PAGES-01 — Home pública mascara falhas de fontes como ausência de conteúdo

- **Severidade:** P1 (bloqueia merge até haver estado de erro/degradação honesto).
- **Fato:** Em `src/routes/_store.index.tsx:128-199`, o loader consulta banners, hero cards, hotpages, marketplace, diretório, classificados, empregos, eventos, notícias, mural e concursos. Cada chamada de `Promise.all` possui `.catch(() => [])` ou fallback vazio (`:148-161`), e o `catch` externo também retorna todas as coleções vazias (`:181-198`). A rota declara apenas `component: VitrineHome` (`:201`); não declara `pendingComponent` nem `errorComponent`.
- **Fato:** O componente usa listas vazias como dados normais (`:204-225`) e o modo grid exibe “Nenhum anúncio encontrado com estes filtros” quando `unifiedItems.length === 0` (`:~1060-1080`). No modo feed, se as listas forem vazias, os trilhos são simplesmente omitidos.
- **Hipótese/risco:** Uma falha de RLS, rede, migration ou BFF pode ser apresentada como uma vitrine legitimamente sem conteúdo. O usuário não recebe retry nem indicação de indisponibilidade; a equipe pode interpretar queda de dependência como falta de oferta local. O risco é alto porque o loader agrega múltiplas áreas públicas e o fallback destrói a origem do erro.
- **Dependências:** `listActiveBanners`, `listHomeHeroCards`, `listHeroSquircleCards`, `listEditorialHotpages`, `getMarketplaceFeed`, `getPublicDirectory`, `getPublicClassifieds`, `listPublicJobs`, `getPublicEvents`, `listPublicArticles`, `getMuralFeed`, `getAllPublicConcursos`; componentes `HorizontalRail`, `ProceduralInfiniteFeed` e a árvore TanStack Router.
- **Correção concreta:** substituir fallbacks anônimos por resultado tipado por fonte, por exemplo `{ status: "ok" | "error", data, errorId }`; manter as fontes independentes para renderização parcial, mas exibir `ErrorState`/banner de retry por trilho que falhar. Adicionar `pendingComponent` (skeleton da vitrine) e um estado de erro global somente quando a página não puder ser renderizada. Não usar `[]` como sinal simultâneo de “sem registros” e “consulta falhou”.

### PAGES-02 — Workspace Eventos confunde falha de consulta com lista vazia

- **Severidade:** P1.
- **Fato:** `src/routes/workspace.eventos.index.tsx:20-34` carrega `listAdminEvents()` e `getStoreSettings()` com `.catch(() => [])`/`.catch(() => null)` e também possui `catch` externo que retorna `{ events: [], store: null }` (`:22-31`). A rota não define `errorComponent` nem `pendingComponent`.
- **Fato:** `src/routes/workspace.eventos.index.tsx:215-229` trata `filteredEvents.length === 0` como estado “Nenhum evento encontrado” e oferece “Criar Primeiro Evento”. O formulário de criação tem submissão real em `:124-186` e `<form onSubmit={handleSave}>` em `:359`, com botão submit em `:555`; portanto, o problema não é o formulário de criação sem handler, e sim o estado de leitura inicial.
- **Hipótese/risco:** Se `listAdminEvents` falhar por sessão, RLS, schema ou rede, o produtor verá um catálogo vazio e poderá iniciar uma ação duplicada de criação. O CTA “Criar Primeiro Evento” reforça uma conclusão falsa de que nunca há eventos.
- **Dependências:** `listAdminEvents`, `getStoreSettings`, `NicheOperationalGuard`, tabelas/contratos de eventos e a invalidação do router após salvar.
- **Correção concreta:** preservar o erro de `listAdminEvents` em um campo `eventsState`; renderizar `ErrorState` com retry/invalidação quando a consulta falhar. Reservar o empty state e o CTA de primeiro evento apenas para resposta bem-sucedida com `events.length === 0`. Separar falha da loja (`store`) da falha do catálogo de eventos.

### PAGES-03 — Gift cards: serviço e rota convertem falha em “nenhum vale”

- **Severidade:** P1.
- **Fato:** `src/services/giftcard.functions.ts:176-209` implementa `listCustomerGiftCards` com `try/catch`; usuário não autenticado retorna `[]` (`:178-182`), erro de query registra apenas `console.warn` e retorna `[]` (`:197-202`), e qualquer exceção também registra warning e retorna `[]` (`:205-208`).
- **Fato:** A rota `src/routes/_store.conta.gift-cards.tsx:17-32` ainda envolve o BFF em outro `try/catch` e retorna `giftCards: []` em qualquer falha (`:25-29`). O empty state em `:150-159` afirma “Nenhum vale ativo vinculado”, sem distinguir sessão ausente, resposta vazia ou erro.
- **Hipótese/risco:** Indisponibilidade da tabela `gift_cards`, erro de RLS ou falha de tenant pode fazer o usuário concluir que não tem saldo/vouchers. Em cenário de suporte ou checkout, essa mensagem é enganosa e pode gerar tentativas repetidas de resgate ou diagnóstico incorreto.
- **Dependências:** `getSSRClient`, `resolveTenantStoreId`, tabela `public.gift_cards`, políticas RLS de gift cards e `claimGiftCard`. A migration `supabase/reference-migrations/travelagencias/20260610000024_p1_coupons_giftcards_rls.sql` também mostra políticas específicas de leitura por agência/cliente; portanto, falha de autorização é uma possibilidade real de integração que precisa permanecer observável.
- **Correção concreta:** no BFF, lançar erro tipado para falhas de consulta/tenant e reservar `[]` somente para “usuário autenticado consultou e não há cartões”. Na rota, adicionar `errorComponent`/`ErrorState` com retry e estado de sessão não autenticada separado. O formulário de resgate (`:101-137`, `onSubmit={form.handleSubmit(handleClaim)}`) possui handler; não alterar esse fluxo sem necessidade.

### PAGES-04 — Squads não têm contrato visual para erro ou vazio do catálogo

- **Severidade:** P1.
- **Fato:** `src/routes/workspace.squads.tsx:27-30` executa `useQuery({ queryKey: ["ai-squads-list"], queryFn: () => listSquads() })`, mas desestrutura apenas `data` e `isLoading`. Não há `isError`, `error`, `ErrorState`, `EmptyState` ou mensagem equivalente no arquivo (`rg` atual encontrou apenas a query, o map e a execução).
- **Fato:** `selectedSquad` é calculado como `squads.find(...) || squads[0]` (`:32`). Os cards são renderizados somente pelo `squads.map` (`:70-109`) e o detalhe/console somente dentro de `{selectedSquad && (...)}` (`:112`). O botão de execução depende do detalhe e chama `executeMutation` (`:172-193`). O serviço `listSquads` retorna o catálogo canônico (`src/services/ai-agent-squad-orchestrator.functions.ts:401-403`), portanto uma resposta vazia é tecnicamente possível mesmo que o seed costume fornecer squads.
- **Hipótese/risco:** Em erro de carregamento, a página pode ficar com cabeçalho e espaço vazio, sem explicação nem retry. Em resposta vazia válida, a área não explica que o catálogo está sem configuração e não oferece caminho operacional. Isso quebra a matriz loading/empty/error de uma tela que dispara execuções de agentes.
- **Dependências:** React Query, `listSquads`, `executeSquad`, migrations de `ai_squad_definitions`/`ai_squad_members` e políticas RLS autenticadas em `supabase/migrations/20261208000000_v144_ai_agents_and_squads_orchestration.sql:124-142`.
- **Correção concreta:** desestruturar `isError`/`error` e renderizar `LoadingState`, `ErrorState(onRetry=queryClient.invalidateQueries)` e `EmptyState` com ação de configuração/contato. Desabilitar ou não renderizar o console quando `selectedSquad` for nulo e anunciar o motivo ao usuário.

### PAGES-05 — Marketing Studio usa fallback visual sem indicar falha do catálogo

- **Severidade:** P2.
- **Fato:** `src/routes/workspace.marketing.studio.tsx:86-94` tem duas queries (`getStoreSettings` e `listAdminProducts`) e desestrutura apenas `data`; não há `isLoading`/`isError` nem estado de erro/vazio explícito no arquivo. O seletor de produto só aparece quando `products.length > 0` (`:279-297`).
- **Fato:** A UI deriva `authorName`/`authorHandle` de defaults (`:111-112`) e os handlers de exportação continuam disponíveis (`:198-224`, botões em `:235-271`) mesmo sem resposta de loja/produtos. Há conteúdo inicial fixo em `DEFAULT_CAROUSEL_SLIDES` (`:50-79`) e campos default (`:97-105`).
- **Hipótese/risco:** Falha de `getStoreSettings` ou `listAdminProducts` pode parecer “catálogo sem produtos/loja ainda configurada”, enquanto o usuário consegue exportar material com “Minha Loja/@loja” e conteúdo default. Isso cria risco de peça comercial publicada com identidade errada; não há prova no código de que defaults sejam proibidos, por isso a classificação é P2 e a parte de identidade incorreta é hipótese.
- **Dependências:** `listAdminProducts`, `getStoreSettings`, `exportElementAsImage`, `exportElementAsPdf` e o catálogo admin.
- **Correção concreta:** separar estados `loading`, `error`, `empty` e `ready`; mostrar skeleton durante queries, `ErrorState` com retry para falha e empty state orientado a cadastrar produto/configurar loja. Bloquear exportação de dados comerciais quando dados obrigatórios falharem, ou declarar visualmente “modelo de demonstração” com intenção explícita.

### PAGES-06 — Histórico de Caixa pode ficar parcialmente vazio sem indicação de erro

- **Severidade:** P1 (domínio financeiro).
- **Fato:** `src/routes/workspace.financeiro.caixa.index.tsx:29-47` faz `getActiveRegister().catch(() => null)` e `listRegisterHistory().catch(() => [])` dentro de `Promise.all`; só o `catch` externo retorna `history: null`. A lista de histórico, portanto, é degradada para `[]` antes de alcançar o componente. A tela exibe tabela/linhas quando há dados e estados de caixa fechado/sem turno, mas não possui estado separado de erro para histórico (`:356-...`, `filteredEntries` em `:113-117`).
- **Fato:** O BFF `src/services/cash.functions.ts:268-327` lança erro quando a consulta de `cash_registers` falha (`:273-280`), o que confirma que o `.catch(() => [])` pertence à camada de apresentação/loader e suprime uma falha real da dependência. O componente possui `errorComponent` (`:46`), mas o catch individual impede que ele seja acionado para essa falha.
- **Hipótese/risco:** O operador pode interpretar ausência de histórico como inexistência de turnos, não como falha de leitura. Em caixa/financeiro isso pode afetar conferência e auditoria operacional; é mais grave que um empty state público genérico.
- **Dependências:** `getActiveRegister`, `listRegisterHistory`, tabela `cash_registers`, `cash_register_entries`, `assertStoreAccess`, políticas RLS e `router.invalidate` após mutações.
- **Correção concreta:** retornar estado discriminado por consulta (`history: { status, data, error }`) ou deixar o erro subir para `errorComponent`; para falha parcial, renderizar `ErrorState` especificamente na seção de histórico e preservar o estado do turno atual se ele carregou. Só renderizar “sem histórico” quando a resposta for bem-sucedida e vazia.

### PAGES-07 — Inventários de rotas não estão sincronizados com o código atual

- **Severidade:** P2 (risco de cobertura/auditabilidade; não é, sozinho, bug de runtime).
- **Fato:** Varredura atual encontrou **398** arquivos com `createFileRoute`/`createRootRoute` em `src/routes`. `.audit/ROUTE_FORENSIC_INVENTORY.json` possui **372** entradas. `.audit/ROUTES.md:3` declara **405** rotas analisadas. A diferença entre fonte e inventário forense é de **26** arquivos; dois são páginas (`_store.conta.atividade.tsx`, `_store.conta.entregador.tsx`) e os demais incluem endpoints/API/sitemaps. O inventário não tem entradas órfãs, mas não cobre todos os arquivos atuais.
- **Hipótese/risco:** Métricas de dead clicks, forms, loaders e estados podem não abranger as duas páginas excluídas; o número 405 também não é reconciliado com a contagem atual. Não afirmar que as páginas excluídas têm defeito funcional sem inspeção própria; o achado é a lacuna de controle de cobertura.
- **Dependências:** gerador do inventário, `src/routes`, `src/routeTree.gen.ts`, `.audit/ROUTES.json`, `.audit/ROUTES.md`.
- **Correção concreta:** regenerar `ROUTE_FORENSIC_INVENTORY.json`, `ROUTES.md` e `ROUTES.json` a partir do mesmo commit/critério; declarar no relatório se API/sitemaps entram ou não no total. Falhar o check quando um arquivo de rota com `createFileRoute` não estiver classificado, distinguindo explicitamente páginas de handlers HTTP.

## Controles positivos e não-achados

1. **Navegação workspace:** `node scripts/audit-navigation-completeness.mjs` encontrou 247 links válidos, zero quebrados e zero rotas workspace sem link direto. Não foi encontrado achado confirmado de destino órfão nesse registry.
2. **Botões/ações no estado atual:** a análise AST atual (`scripts/audit/button-ast-audit.json`, timestamp 2026-10-06) registra 6.145 controles e zero issues; o teste semântico de oito casos também passou. O relatório histórico de 2026-10-05 com 3.310 dead buttons foi tratado como evidência histórica, não como prova do estado atual.
3. **Formulários amostrados:** cadastro (`src/routes/_store.cadastro.tsx:151-284`), gift cards (`src/routes/_store.conta.gift-cards.tsx:101-137`) e eventos (`src/routes/workspace.eventos.index.tsx:359-555`) possuem `onSubmit`/`type="submit"` e handlers que chamam serviços. As tags `<Form>` sem `onSubmit` encontradas pela busca são wrappers de `react-hook-form`, não formulários HTML sem ação.
4. **Estados presentes em partes do produto:** `src/routes/_store.gastronomia.tsx:63-90` declara `errorComponent` e `pendingComponent`, e possui empty state (`:237-249`). O problema remanescente nessa rota é que as chamadas internas também usam fallbacks silenciosos (`:66-74`), portanto não foi duplicado como achado principal separado.
5. **Rota raiz:** `src/routes/__root.tsx:10-30` possui not-found e `:32-73` possui error/retry global. Isso não corrige loaders filhos que capturam a exceção antes do router; os achados acima continuam válidos.

## Plano de correção priorizado

1. **P1 imediato:** corrigir contratos de erro/empty em home, eventos, gift cards e caixa; nunca usar `[]` como erro silencioso.
2. **P1 imediato:** adicionar matriz loading/error/empty a Squads e impedir execução sem `selectedSquad` válido.
3. **P2:** corrigir Marketing Studio para impedir exportação de peça comercial com dados default quando dependências falharem.
4. **P2 de governança:** regenerar inventários de rotas e incluir as duas páginas ausentes; revisar o critério de contagem 372/398/405.
5. **Testes:** adicionar testes de loader/estado para cada achado, cobrindo separadamente: resposta vazia legítima, exceção BFF/RLS, retry e CTA de criação apenas no caso vazio confirmado.

## Limites e caveats

- A auditoria foi estática; não houve login, execução contra banco real, navegação E2E ou simulação de falha de RLS/rede.
- “Hipótese/risco” não é afirmado como incidente observado em produção.
- Nenhum arquivo de código de produto foi alterado; somente este relatório foi criado conforme solicitado.
