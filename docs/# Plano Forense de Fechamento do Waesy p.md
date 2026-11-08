# Plano Forense de Fechamento do Waesy por Manua ai

**Status:** aberto, bloqueado por evidências P0 e P1; este documento não representa conclusão de correções.

**Escopo da fonte:** construído exclusivamente a partir dos resultados fornecidos na solicitação. Não foram usadas fontes externas, não foram inventadas implementações e nenhum arquivo de produto foi alterado.

Falhas: []

---

## 0. Regra de parada

> Nenhuma microfase, correção, migration ou publicação avança sem prova verde, reproduzível e anexada ao ledger. Teste de array, constante, comentário, documentação ou mock não prova RLS, autorização, publicação, operação posterior ou paridade visual.

O Waesy só pode ser declarado **FECHADO** quando, em checkout limpo e ambiente identificável:

1. `npm install`, `npm test`, `npm run typecheck`, `npm run build` e todos os gates terminarem com código 0.

1. Nenhum P0 permanecer aberto em estoque, ledger, tenant, RLS, RBAC, storage, download, publicação, Builder, Marketplace ou turismo.

1. Todo P1 tiver owner, evidência, prazo e exceção formal; nenhum P1 estiver escondido por `catch` que retorna `[]` ou `null`.

1. Cada capacidade tiver um dono de dados, um schema, um BFF, um read model e uma rota de operação claramente identificados.

1. Testes com dois tenants, usuários reais, `auth.uid`, banco efêmero e policies reais provarem isolamento negativo.

1. Houver round-trip DB e schema → BFF → loader ou action → UI → publicação → renderização → operação posterior e eventos.

1. `loading`, `empty`, `error`, `unconfigured`, `forbidden`, `not_found` e `partial` forem distintos e observáveis.

1. Nenhuma resposta comercial contiver quantidade 99, estoque default 10, rating 5.0, cidade, frete, identidade, loja, backorder ou URL pública inventada.

1. Todo claim documental de implementado, ativo, 100 por cento, zero mocks, RLS validado ou E2E verde apontar para comando, commit, data, ambiente e artefato atual.

Se qualquer item falhar, o status permanece **PARCIAL**, **QUEBRADO** ou **NÃO COMPROVADO**.

---

## 1. Veredito executivo

O Waesy tem peças funcionais isoladas, incluindo Server Functions, CRUDs de catálogo e classificados, migrations de CMS e estoque, editor Builder e Omni, rotas públicas, Marketplace Hub, telas de turismo e primitivas de design. Contudo, **não existe uma cadeia ponta a ponta comprovada, segura e fechada**.

### Classificação global

- **P0 quebrado:** isolamento e autorização cross-tenant; contrato de estoque e ledger; storage e download digital; disponibilidade inventada; publicação e listing sem fronteira segura; divergência Builder e Omni; Marketplace lendo classificados como produto; toolchain e CI não verdes.

- **P1 parcial ou frágil:** CMS não transacional; unified listing não usado como fonte única; serviços sem agregado universal; turismo com linhagens concorrentes; estados de erro mascarados; design gates não bloqueantes; upload e realtime client-side; monólitos e duplicações.

- **Não comprovado:** RLS material, E2E completo, scheduler de expiração, bridge classificado para Workspace, paridade editor para publicação, cache invalidation, marketplace idempotente em runtime, ciclo de turismo até operação, testes visuais reais e claims documentais de 100 por cento.

### Causas-raiz

1. Múltiplos donos de dados e contratos: `stock_on_hand` e `stock_reserved` versus `stock` e `reserved_stock`; `products` versus `classifieds` versus `unified_listings_view`; `experience_versions` e `nodes` versus `settings.omni_page` versus `store_page_sections`; quatro linhagens de turismo.

1. Confiança em input de cliente: `store_id`, `targetStoreId`, `authorId`, role, URLs e tenant chegam a mutações sem validação uniforme.

1. Uso amplo de `service_role`: políticas permissivas e ausência de guard tornam a segurança dependente de cada função.

1. Publicação sequencial: arquivar, apagar, inserir e promover sem prova de transação, lock, rollback ou cache invalidation.

1. Fallbacks que mudam semântica: `[]`, `null`, primeiro tenant, root store, 99, 10, rating 5.0, loja fictícia, URL pública e defaults editoriais.

1. Arquiteturas concorrentes não cortadas: Omni versus Builder canônico; Legacy versus experience nodes; três bridges de classificados; Marketplace classificando classifieds como oferta corporativa.

1. Governança não executável: documentação declara 100 por cento e zero mocks, enquanto resultados registram checks abertos, monólitos, testes falhos, typecheck quebrado e ausência de workflow CI.

### P0 prioritários

| Domínio | Evidência fornecida | Decisão de fechamento |
| --- | --- | --- |
| Estoque | `supabase/migrations/0002_catalog.sql:153-174`; `src/services/canonical-stock-ledger.functions.ts:49-53,94-118`; `src/routes/workspace.catalogo.produtos.index.tsx:300-315` | um contrato de campos; todas as mutações via RPC e ledger |
| Tenant e listing | `src/services/unified-listing.functions.ts:131-140`; `src/services/classifieds-workspace-bridge.functions.ts:22-57,83-155` | guard antes de query ou mutation; teste A e B |
| Storage | `src/components/ui/media-uploader.tsx:191-230`; `src/components/classifieds/digital-file-dropzone.tsx:47-74`; migrations de storage | bucket privado, signed URL e ownership; remover browser fallback |
| Download digital | `src/services/classifieds.functions.ts:1219-1263` | entitlement e TTL verificados no servidor; negar por padrão |
| Disponibilidade | `src/types/catalog.ts:118-143`; `src/services/product.functions.ts:123-162` | derivar `on_hand - reserved`; ausência de variante não vende |
| Builder | `src/services/builder.functions.ts:127-129,161,330-341` | corrigir TDZ e filtrar tenant em bindings |
| Publicação | `src/services/omni-builder.functions.ts:23-215`; `src/services/builder.functions.ts:2625-2720` | uma verdade de versão publicada |
| Marketplace | `src/services/unified-listing.functions.ts:224-265`; `src/routes/_store.marketplace.index.tsx:24-50` | read model único; dados de loja, rating e delivery reais |
| Toolchain | 74 arquivos Vitest falharam; `npm run typecheck` exit 2; `.github` sem workflows | dependências e gate CI reproduzíveis |

---

## 2. Evidências aceitas e limitações

### 2.1 Evidência suficiente

Aceitar somente: schema e migration efetivos; código executável com path e linha; teste com comando, ambiente e exit code; banco efêmero com RLS real; E2E de browser com SSR e reload; eventos e outbox observáveis; relatório versionado com hash, timestamp e artefato.

### 2.2 Não é prova

Não são prova de fechamento: teste que filtra arrays em memória; teste que verifica apenas strings; documentação sem comando; view criada sem writer e leitor; `catch` que retorna vazio; migration sem consumidor; screenshot sem assert de tenant e dados; teste de RPC sem banco; mock de identidade; comentário de segurança.

### 2.3 Limitações desta entrega

- Este plano não edita código, migrations, docs ou configurações.

- Os resultados fornecidos registram execuções parciais; não foi feita nova instalação, deploy, provisionamento de banco ou browser nesta etapa.

- Ausência de evidência é classificada como **NÃO COMPROVADO**, nunca como inexistência.

- Linhas citadas podem estar stale; cada fase deve confirmar paths no checkout atual.

- Migration posterior não é considerada revogação de policy anterior sem inspeção e teste.

---

## 3. Critérios de status

- **FUNCIONAL:** comportamento observado no ambiente correto e com teste verde.

- **PARCIAL:** parte material funciona, mas há lacuna, duplicação ou fronteira insegura.

- **QUEBRADO:** falha reproduzida, insegurança ou inconsistência material.

- **NÃO COMPROVADO:** não existe prova suficiente, mesmo que o código pareça plausível.

- **OBSOLETO:** claim ou documento não corresponde ao checkout atual e foi substituído com evidência.

---

## 4. Protocolo de provas

Para cada tarefa:

1. Registrar `task_id`, owner, fase, dependências e arquivos permitidos.

1. Ler os arquivos atuais e confirmar que path e linha existem.

1. Definir hipótese e comportamento observável.

1. Criar ou atualizar teste de aceite antes da implementação.

1. Implementar a menor mudança compatível, sem criar contrato paralelo.

1. Rodar unitário, contrato, typecheck e build relacionados.

1. Rodar integração, RLS, E2E, visual ou concorrência conforme a fronteira.

1. Rodar regressão dos consumidores, migrations, rotas, eventos e docs.

1. Salvar logs, HTML, screenshots, queries, migration hash e commit.

1. Atualizar ledger com status, limitações e próximo bloqueio.

1. Liberar a próxima dependência somente após saída verde.

Artefato mínimo:

```
proof/<fase>/<task>/<timestamp>/
  command.txt
  environment.txt
  git-ref.txt
  migration-hash.txt
  stdout.log
  stderr.log
  result.json
  screenshots-ou-html/
  db-assertions.sql
  limitations.md
```

Se a execução for bloqueada por dependência ausente, banco indisponível, migration ausente, RLS não provisionado ou browser indisponível, registrar blocker e manter o status **NÃO COMPROVADO**. Nunca criar fallback para simular verde.

---

## 5. Ledger de documentação e governança

Claims de `docs`, `ia`, `auditoria`, `melhoria`, `reparo` e `.audit` precisam de:

```
claim_id, texto_exato, domínio, status, owner, commit,
timestamp, comando, ambiente, artefato, path:linha,
limitações, expira_em
```

Os resultados registram contradições entre `docs/ROUTES.md`, `docs/ARCHITECTURE.md`, `docs/BUSINESS_FLOWS.md`, `docs/builder-audit/*`, `docs/auditoria/*`, `docs/platform-recovery/*`, `melhoria/_estado.md`, `reparo/_estado.md`, `ia/plano_anuncios_vitrine.txt` e `.audit/*`. Até reconciliação, claims de completude são **NÃO COMPROVADOS**.

Governança dos prompts:

- todo prompt deve declarar escopo, arquivos, não inventar dados, testes e evidências;

- não fechar por ter criado código;

- parar quando tenant, owner, schema ou dependência estiver indefinido;

- após cada migration ou adapter, reabrir consumidores, rotas, testes e docs;

- nunca autorizar default 99/10, primeiro store, rating 5.0, URL pública ou `USING(true)` para esconder ausência.

---

## 6. Arquitetura alvo client, server, BFF, banco e eventos

### 6.1 Princípios

1. Frontend envia intenção; servidor resolve identidade, tenant, ownership, role e contexto.

1. Cada agregado tem um dono de dados; views e canais são projeções, nunca segundos writers.

1. DTOs são versionados, discriminados e validados na entrada e na saída.

1. RLS é segunda barreira; BFF sempre valida antes da query.

1. Mutação composta é RPC ou transação; outbox e auditoria entram no mesmo commit.

1. Draft é editável; versão publicada é imutável; há uma única versão ativa por documento.

1. Ausência, erro e integração não configurada são estados honestos.

### 6.2 Camada client

- Renderizar somente DTOs server-side.

- Não usar `getBrowserClient` para storage, realtime ou consulta de domínio.

- Não calcular preço, estoque, rating, disponibilidade, status ou autorização.

- Enviar comandos tipados com idempotency key e correlation ID.

- Usar o mesmo renderer do público no preview, recebendo draft explicitamente.

- Exibir loading, data, empty, error, forbidden, not_found, unconfigured e partial separadamente.

### 6.3 Routes, loaders e actions

- Loader/action fino chama somente Server Function ou BFF.

- Não acessar tabelas diretamente.

- Não aceitar `authorId`, `role`, `organizationId` ou `store_id` como autoridade.

- Não converter erro em `[]` ou `null` sem envelope degradado e telemetria.

- Links multi-tenant levam `storeSlug`, host ou contexto canônico suficiente.

### 6.4 BFF e Server Functions

Ordem obrigatória de comando:

```
getServerIdentity
  → resolveTenantContext
  → assertStoreAccess e capability
  → validar DTO de entrada
  → transação ou RPC
  → audit e outbox
  → DTO de saída
```

`service_role` só pode ser usado em jobs internos ou funções com guard explícito, tenant explícito, auditoria e escopo de query. Não é barreira de autorização.

### 6.5 Banco e RLS

- Tenant obrigatório nas entidades comerciais.

- Policies deny-by-default e leitura pública limitada a estados publicados.

- Nenhuma policy global `USING(true)` para dados de negócio.

- FKs para promoção, origem, proposal, contract, trip, voucher e passageiros.

- Constraints para enum canônico, uma publicação ativa, idempotency key e invariantes de saldo.

- Views de read model não substituem a autoridade de escrita.

### 6.6 Eventos e outbox

Evento mínimo: `id`, `tenant_id`, `aggregate_type`, `aggregate_id`, `event_type`, `source_version`, `idempotency_key`, `actor_id`, `occurred_at`, `payload_version`, `payload`, `status`, `attempts` e `last_error`.

Eventos prioritários:

- `listing.created`, `listing.published`, `listing.paused`, `listing.expired`;

- `classified.promoted`, `classified.updated`;

- `product.published`, `product.price_changed`, `product.stock_changed`;

- `experience.draft_saved`, `experience.published`, `experience.publish_failed`;

- `stock.adjusted`, `stock.reserved`, `stock.released`, `stock.sold`, `stock.refunded`;

- `channel.sync_requested`, `channel.sync_succeeded`, `channel.sync_failed`;

- `proposal.created`, `proposal.accepted`, `contract.signed`, `trip.created`, `voucher.issued`, `boarding.checked_in`.

Todo consumer precisa ser idempotente, tenant-scoped, observável, reprocessável e protegido contra replay.

---

## 7. Oferta universal: produto, serviço, anúncio e experiência

### 7.1 Objetivo

Produto físico, serviço, pacote, classificado e experiência publicada participam do mesmo motor de descoberta e transação sem fingir que possuem a mesma persistência. Cada origem mantém suas regras, enquanto o contrato universal normaliza apresentação, preço, capacidade, agenda, fulfillment e operação.

### 7.2 Contrato alvo

```
OfferDTO
  offerId, sourceId
  tenant: storeId, organizationId, slug
  origin: workspace | classified | service | experience | marketplace
  kind: product | service | package | classified | experience
  publication: draft | review | published | paused | expired | archived
  title, description, media
  pricing: type, amount, currency, unit
  availability: stock | capacity | schedule | request | unavailable
  fulfillment: shipping | pickup | booking | digital | contact
  taxonomy e attributes
  provenance: canonicalTable, canonicalId, version
  capabilities: canBuy, canQuote, canBook, canPromote
```

Este contrato é arquitetura alvo, não implementação existente. Deve ser validado contra `src/types/offer.ts:1-27` e `src/types/catalog.ts:55-200` antes de mudança. Não copiar `raw_data:any` como fonte de verdade.

### 7.3 Regras por origem

- **Produto:** preço e mídia no catálogo; disponibilidade é `on_hand - reserved`; somente `published` no público.

- **Serviço:** unidade, agenda, capacidade, política, orçamento e agendamento; não é apenas card de loja.

- **Classificado:** P2P, autor, tenant, moderação, atributos e contato; promoção é transição idempotente.

- **Experiência:** apresentação; bindings resolvem ofertas reais e não criam preço/estoque paralelo.

- **Marketplace:** projeção externa com external ID, sync log, outbox, assinatura e reconciliação.

### 7.4 Aceite universal

Criar produto, serviço/pacote, classificado e experiência; ler os quatro pelo mesmo DTO discriminado; preservar origin, tenant, kind, publication e provenance; criar orçamento/agendamento de serviço; promover classificado duas vezes sem duplicação; e mostrar `error` ou `unconfigured` quando a origem não estiver disponível.

---

## 8. Fluxo Workspace, Vitrine, Marketplace e Classificados

### 8.1 Estado observado

- Catálogo possui CRUD/BFF, mas a edição inline usa `updateProduct` com variante sintética e o cadastro faz etapas separadas, ignora erros e injeta default 10.

- Vitrine possui `experience_documents`, `versions` e `nodes`, mas o editor auditado usa Omni; rotas públicas descartam `builderTree` e `CanonicalStoreProfileView` mantém legado/localStorage.

- Marketplace usa `listUnifiedListings`, mas a função consulta apenas `classifieds` e a UI injeta rating, delivery e identidade genéricos.

- Classificados têm criação básica, mas `store_id` do payload é confiado e coexistem três bridges.

- `unified_listings_view` existe, mas seu consumo como read path único não foi comprovado.

### 8.2 Fluxo alvo fechado

1. Criar origem em draft com tenant derivado no servidor.

1. Validar taxonomia, preço ou quote, mídia, disponibilidade/capacidade, política e autorização.

1. Publicar por máquina única, gravando audit e outbox no mesmo commit.

1. Projetar em `ListingReadModel` com origin, tenant, slug, provenance e versão.

1. Renderizar PDP, Vitrine, Marketplace e Classificados via DTO de leitura apropriado à superfície.

1. Operar compra, reserva, orçamento, agendamento e promoção por commands server-side ligados a `sourceId` ou `offerId`.

1. Sincronizar canal externo por external ID, assinatura, replay protection, sync log e reconciliação.

1. Observar correlation ID, retry, dead-letter, auditoria e métricas de consistência.

### 8.3 Isolamento por superfície

| Superfície | Leitura autorizada | Proibição |
| --- | --- | --- |
| Classificados | origin classified e estados públicos definidos | produto não promovido, payment settings, PII, download sem entitlement |
| Marketplace | origin workspace, service ou experience elegível | classificado P2P como oferta corporativa; rating ou delivery inventado |
| Vitrine | documento publicado e bindings da loja correta | root store, draft de outra loja, árvore de outra tenant |
| Workspace | objetos da loja do membership autorizado | objeto de B por ID sem guard |
| PDP | produto publicado com slug e storeSlug | slug global ambíguo, estoque bruto, backorder implícito |

Invariantes: URL pública resolve tenant; `published` é status canônico; origem não aparece em superfície incompatível sem promoção comprovada; fallback não troca tenant nem inventa quantidade; promoção possui vínculo, evento e rollback.

---

## 9. Turismo contínuo

### 9.1 Veredito

Turismo tem UI, Server Functions e migrations, mas não tem jornada contínua comprovada. Existem `agencies/clients/proposals/trips/vouchers/group_tours`, `travel_proposals/travel_contracts/travel_group_tours`, `tourism_trips/tourism_vouchers`, `travel_vouchers` e `tourism_experiences`. Policies `USING(true)`, fallback de primeiro store e criação de viagem sintética por token são bloqueadores P0.

### 9.2 Agregado alvo TravelCase

```
Agency ou Tenant
  → Client
  → Quote
  → Proposal versionada
  → Contract versionado e assinado
  → Trip
     → Passenger
     → GroupTour, capacity, seat, room
     → Voucher e QR
     → Boarding, check-in, no-show
     → Installment, wallet, document
     → Album e incident
```

Toda entidade possui `tenant_id`, `created_by`, status, timestamps, versão quando mutável e FK para a raiz. JSON ou `description` não substitui tabela operacional.

### 9.3 Estados

- Quote/Proposal: `draft → sent → viewed → accepted → converted → expired → cancelled`.

- Contract: `draft → issued → signed → rejected → cancelled → fulfilled`.

- Trip: `planned → confirmed → open_for_operation → boarding → in_progress → completed → cancelled → refunded`.

- Voucher: `pending → issued → delivered → redeemed → cancelled → expired`.

- Passageiro: `registered → assigned → checked_in → boarded → no_show → cancelled`.

- Sync: `pending → processing → succeeded → retrying → failed → dead_letter`.

Cada transição valida tenant, role e pré-condições e emite auditoria/evento.

### 9.4 Actions e functions

`createQuote`, `updateQuote`, `publishQuote`, `createTravelProposal`, `sendProposal`, `acceptProposal`, `expireProposal`, `convertProposalToContract`, `signContract`, `cancelContract`, `convertContractToTrip`, `updateTripStatus`, `cancelTrip`, `refundTrip`, `createGroupTour`, `allocateSeat`, `assignRoom`, `addBoardingPoint`, `registerPassenger`, `checkInPassenger`, `markNoShow`, `reopenBoarding`, `issueVoucher`, `getPublicVoucherByToken`, `redeemVoucher`, `createSignedDocumentUrl`, `uploadTravelerPhoto`, `listTravelerWallet`, `enqueueTravelEvent`, `reconcileTravelCase` e `retryDeadLetter`.

Nenhuma função deve escolher a primeira loja ou fabricar viagem sintética, como indicado em `src/services/travel-proposal.functions.ts:368-391` e `src/services/travel-lifecycle.functions.ts:2101-2129`.

### 9.5 Eventos

`quote.created`, `proposal.published`, `proposal.accepted`, `contract.issued`, `contract.signed`, `contract.cancelled`, `trip.created`, `trip.confirmed`, `trip.cancelled`, `trip.refunded`, `group_tour.created`, `seat.assigned`, `boarding_point.added`, `passenger.checked_in`, `passenger.no_show`, `voucher.issued`, `voucher.delivered`, `voucher.redeemed`, `traveler.photo_uploaded`, `wallet.pass_issued`, `travel.sync_failed` e `travel.reconciled`.

### 9.6 Telas e aceite

| Tela | Fonte e ação | Aceite negativo |
| --- | --- | --- |
| propostas | lista tenant-scoped e converter | erro não vira `[]`; conflito explícito |
| detalhe proposta | DTO versionado e token | inexistente, expirado e tenant trocado |
| contratos | assinar ou cancelar | assinatura inválida não muda status |
| viagens | TravelCase único | sem trip não fabricar sintética |
| grupos | group_tour canônico, assento, quarto e check-in | duas abas mantêm consistência |
| vouchers | mesmo ID interno e público | manual e automático resolvem no QR/link |
| portal viajante | parcelas, contatos, voucher, carteira e álbum | upload persiste após reload |
| operação | boarding, no-show e reabertura | retry/auditoria observáveis |

---

## 10. Duplicações e quarentena

| Capacidade | Concorrentes | Regra de quarentena |
| --- | --- | --- |
| Estoque | `stock_on_hand`/`stock_reserved`; `stock`/`reserved_stock`; adjust, ledger e updateProduct | bloquear writers fora de RPC |
| Listing | classifieds, products, unified view e bridges | adapter único; não criar writer novo |
| CMS | experience nodes, Omni settings e store page sections | Legacy e Omni somente adapter/read-only |
| Promoção | listing-promotion, bridge legado e conversão de loja | uma command canônica |
| Turismo | proposals/quotes, trips/tourism trips, vouchers múltiplos e grupos múltiplos | congelar dual-write |
| Tenant | workspace members, store members, profiles.role, agency/store/org | não criar nova policy sem mapa |
| Templates | home, Omni, section e DB templates | registry único versionado |
| DTOs | catalog, offer, proposals e tipos locais | shim ou remoção; não duplicar |
| Upload/realtime | BFF e browser Supabase | browser direto em quarentena |

Quarentena precisa de motivo, owner, data de expiração e teste de não regressão. Dead code só é removido após busca de import, dynamic import, routeTree, registry, testes e smoke runtime. Candidato heurístico não é prova de morto.

Resultados informam 1.792 C01, 758 C06, 393 C07, 348 C08, 239 C09, 5.748 C23 e 83 C37; 487 arquivos acima do orçamento; 106 candidatos heurísticos; 74 arquivos de teste falhos; e 7.202 P0 mais 17.922 P1 de design. Números são evidência de dívida e execução informada, não autorização para apagar automaticamente.

---

## 11. Design system

### 11.1 Tokens

Fluxo alvo: `docs/design/tokens.json` → gerador determinístico → `src/styles.css` e `@theme` → primitives → rotas e renderers → design lint e snapshots. Os resultados informam que `scripts/token-sync.mjs` valida, mas não gera; `src/styles.css` mantém hex literais e há 94 tokens mortos. A SSOT não está fechada.

### 11.2 Apple HIG e WCAG

- remover `maximum-scale=1` e `user-scalable=0` em `src/routes/__root.tsx:116-121`;

- target mínimo de 44 px, inclusive variantes `sm`, icon, tabs e botões nativos;

- foco visível e não obstruído, contraste de foco 3:1;

- texto 4.5:1 e controles 3:1;

- label, nome acessível e retorno de foco após dialog ou sheet;

- zoom 200 por cento sem overflow horizontal;

- reduced motion respeitado;

- breakpoints únicos `compact`, `medium`, `expanded`, sem drift com `md/sm`.

### 11.3 Estados

Toda rota assíncrona precisa de loading, data, empty, error com retry e correlation ID, forbidden, not_found, unconfigured e partial. Uma falha de loader não pode renderizar EmptyState como se a loja estivesse vazia.

---

## 12. Estratégia completa de testes

### 12.1 Unitários

Cobrir schemas, transições, cálculo `availableQty`, normalização de slug e tenant, idempotency key, adapters, registry de blocos, tokens e serialização de DTO. Declarar explicitamente que unitário não prova RLS, concorrência ou publicação real.

### 12.2 Contratos e schemas

- Fixtures válidas e inválidas por `origin`, `kind` e `status`.

- Compatibilidade de DTO e migrations.

- `contentSchema`, `styleSchema` e `layoutSchema` aplicados por `block_type` no write e publish.

- Bindings `source` e `type` normalizados.

- Action bindings allowlisted e server-side.

- DTO público sem payment settings, PII, audit fields e URLs internas.

### 12.3 RLS e RBAC real

Provisionar dois tenants e usuários:

- A não lê, insere, atualiza nem apaga objetos de B em produtos, variantes, movimentos, classificados, promoções, documentos, nodes, listings, conectores e storage.

- Anonymous lê somente conteúdo explicitamente publicado.

- Role sem capability recebe 403 ou erro de domínio.

- IDs válidos de outro tenant não vazam dados.

- `service_role` só aparece em job ou função guardada.

- Testes usam `auth.uid`, policies e banco efêmero reais, não arrays em memória.

### 12.4 Integração BFF, loader e action

Para cada domínio, rastrear DB → Server Function → loader/action → componente. Injetar outage de Supabase, RLS denied, join failure, timeout e resposta vazia. Assertar estados distintos, correlation ID, retry e ausência de toast falso.

### 12.5 E2E de catálogo, estoque e marketplace

- Produto sem variantes: saldo zero, ledger vazio, sem default 10.

- Variante real: estoque ajustado somente por RPC e movimento auditado.

- Saldo 5 e reserva 2: PDP e ProductCard retornam 3.

- Duas reservas concorrentes para saldo 1: uma aprovada e uma recusada.

- Checkout, release expirado, cancelamento, retorno e estorno reconciliam ledger e counters.

- Marketplace importa por canal e external ID de forma idempotente; webhook inválido ou replay falha.

- Alteração de preço/estoque gera sync log/outbox, sem produto ou movimento duplicado.

### 12.6 E2E de publicação e vitrine

- V1 publicada continua pública quando V2 falha entre arquivamento e promoção.

- Só existe uma versão published/ativa.

- Editor, preview, SSR público, reload e sitemap usam o mesmo DTO e versão.

- Loja A e B podem usar slug igual, mas URL tenant-aware resolve a correta.

- Bindings de products, category, classifieds e store profile são tenant-scoped.

- Bloco desconhecido tem fallback observável e política documentada; não desaparece silenciosamente.

### 12.7 E2E de classificados e privacidade

- Create com `store_id` de B feito por A falha antes de mutation.

- UUID válido inexistente retorna not_found; UUID inválido retorna invalid_id.

- Público recebe somente DTO allowlistado.

- Download digital: anônimo, não comprador e comprador sem pagamento recebem deny; comprador autorizado recebe URL assinada com TTL.

- Promoção concorrente gera exatamente um produto, links canônicos, status promoted e um evento outbox.

### 12.8 E2E de turismo

- Quote → proposal → contract → trip → voucher → passenger → boarding.

- Conversão repetida retorna o mesmo resultado e não duplica.

- Token válido, inválido, expirado e de outro tenant.

- Grupo, assento, quarto, ponto, check-in, no-show e reabertura persistem após reload.

- Voucher manual e automático usam a mesma busca pública.

- Álbum/foto, contatos, parcelas, carteira e passes vêm do backend e respeitam autorização.

### 12.9 Visual, responsividade e acessibilidade

Playwright e axe em 320, 390, 600, 768, 840 e 1440 px, além de zoom 200 por cento. Assertar ausência de overflow, targets menores que 44 px, foco obstruído, contraste, labels, SSR/hidratação, estado de erro e conteúdo sem hardcode. Cobrir editor, preview, PDP, Marketplace, classificado, vitrine e turismo.

### 12.10 CI mínimo

Confirmar no checkout atual os scripts equivalentes a:

```
npm install
npm run typecheck
npm run build
npm test
npm run audit:all -- --ci
npm run check:size
npm run check:duplication
npm run check:deadcode
npm run check:tokens
npm run lint:design --ratchet
npm run test:e2e
npm run test:rls
npm run test:visual
```

Se um script não existir, registrar gap e criar implementação somente após definir contrato. Não declarar sucesso porque um comando não rodou.

---

## 13. Microfases de fechamento

### P0-A — Toolchain, provas e CI

**Dependências:** nenhuma. **Arquivos:** `package.json`, lockfile, `vitest.config.ts`, `tsconfig.json`, `.github/`, scripts de auditoria e `.audit/`. **Ações:** resolver módulos TanStack e demais dependências confirmadas; fazer checkout limpo; criar workflow versionado; separar unit, integração, RLS e E2E. **Aceite:** install, typecheck, build e test verdes; relatório com commit, comando, ambiente e artefatos; CI falha nos P0/P1 configurados.

### P0-B — Identidade, tenant, RBAC e RLS

**Dependências:** P0-A. **Arquivos:** `src/lib/identity.server.ts`, `src/lib/identity-core.ts`, `src/routes/admin-master.tsx`, `src/routes/workspace.tsx`, services críticos e migrations RLS. **Ações:** remover e-mail/metadata como autoridade; consolidar membership; validar `targetStoreId`; revisar `USING(true)`, `auth_all` e storage. **Aceite:** matriz A/B com anonymous, owner, manager, seller, customer e platform admin; ausência de leitura/mutation cross-tenant; 403/404 tipado.

### P0-C — Storage e privacidade

**Dependências:** P0-B. **Arquivos:** `src/services/storage.functions.ts`, `src/components/ui/media-uploader.tsx`, `src/components/classifieds/digital-file-dropzone.tsx` e migrations storage. **Ações:** buckets privados; path server-generated; MIME, bytes, tamanho e tenant; download com entitlement e TTL; remover fallback browser. **Aceite:** upload inválido, tenant errado, tipo divergente e URL expirada falham; URL assinada válida é temporária; nenhuma URL pública sensível.

### P0-D — Estoque, disponibilidade e concorrência

**Dependências:** P0-A e P0-B. **Arquivos:** migrations 0002/0033/posteriores; `stock.functions.ts`, `canonical-stock-ledger.functions.ts`, `admin-catalog.functions.ts`, `product.functions.ts`, rota de catálogo e alertas. **Ações:** escolher nomes canônicos; migrar compativelmente; remover `updateProduct` de estoque; uma RPC para ajuste, reserva, venda, release, retorno, estorno e transferência; derivar `on_hand - reserved`. **Aceite:** schema smoke; zero variante começa em zero; ajuste cria movimento com actor/reason/reference; concorrência saldo 1 aprova uma reserva; PDP/Card 5 menos 2 retorna 3; zero 99/10/backorder implícito.

### P0-E — Builder, publicação e unified listing

**Dependências:** P0-A e P0-B. **Arquivos:** `builder.functions.ts`, `omni-builder.functions.ts`, editor route, `_store.paginas.$slug.tsx`, `CanonicalStoreProfileView`, unified listing functions/workflow, Marketplace route e migrations. **Ações:** corrigir TDZ `marketing_banners`; filtrar tenant; escolher Builder ou adapter Omni; transação, optimistic concurrency e rollback; read model com origins corretos; remover hardcodes Marketplace. **Aceite:** V1 preservada ao falhar V2; uma publicação ativa; editor→DB→reload→público; A/B isolados; produto e classificado aparecem somente nas superfícies corretas; expiração tem chamada real comprovada.

### P0-F — Classificados e bridge

**Dependências:** P0-B, P0-C e P0-E. **Arquivos:** `classifieds.functions.ts`, `classifieds-workspace-bridge.functions.ts`, `listing-promotion.functions.ts`, editor e migrations RLS. **Ações:** tenant derivado server-side; DTO allowlist; not_found correto; uma bridge transacional e idempotente; outbox e mídia própria. **Aceite:** A não cria em B; UUID inexistente ≠ inválido; duas promoções dão um produto, links, evento e rollback; detalhe sem payment/PII; download não retorna URL direta.

### P1-A — Oferta universal e serviços

**Dependências:** P0-E e P0-F. **Arquivos:** `src/types/offer.ts`, `src/types/catalog.ts`, `_store.servicos.tsx`, services de packages/booking e unified DTO. **Ações:** consolidar Offer e Listing contract; unit, schedule, capacity, policy e fulfillment; conectar serviço a detalhe, orçamento, agendamento e operação. **Aceite:** produto, serviço, anúncio e experiência usam DTO discriminado; serviço não vira produto falso; quote/booking usa IDs canônicos.

### P1-B — Turismo canônico

**Dependências:** P0-B e P1-A. **Arquivos:** migrations turismo, `travel-proposal.functions.ts`, `travel-contract.functions.ts`, `travel-lifecycle.functions.ts`, `group-tours.functions.ts`, `travel-vouchers.functions.ts`, `group-tour-boarding.functions.ts` e rotas. **Ações:** escolher uma linhagem; remover policies públicas; FKs e idempotência; eliminar primeiro store e trip sintética; unificar voucher manual e automático; persistir álbum, carteira e check-in. **Aceite:** jornada inteira com um TravelCase; tokens válido/inválido/expirado/outro tenant; retry sem duplicação; reload preserva operação.

### P1-C — CMS, tema e dados reais

**Dependências:** P0-E. **Arquivos:** `experience-renderer.tsx`, registries/templates, vitrine route, `CanonicalStoreProfileView`, tokens e rotas públicas. **Ações:** registry único; schema por bloco; bindings SSR com tenant; tema global; remover localStorage do conteúdo inicial; unknown block observável. **Aceite:** preset vira nodes e renderiza igual; bindings reais; erro não vira empty; SSR/hidratação determinística; settings.theme aplicado.

### P1-D — Marketplace, channels e eventos

**Dependências:** P0-E e P1-A. **Arquivos:** `marketplace-hub.functions.ts`, channel migrations, Marketplace route e webhook/OAuth. **Ações:** adapter sobre fonte canônica; external ID/idempotência; assinatura/replay; sync log/outbox e reconciliação. **Aceite:** import repetido não duplica; preço/estoque emite evento; webhook inválido falha; rating, loja e delivery vêm do DB ou são explicitamente desconhecidos.

### P1-E — Estados, navegação e realtime

**Dependências:** P0-B e P0-E. **Arquivos:** `_store.tsx`, `_store.index.tsx`, `_store.ofertas.tsx`, links CMS, `realtime-channel.ts` e componentes de operação. **Ações:** envelopes discriminados; `storeSlug` em navegação; ConnectionManager com retry/backoff/re-subscribe idempotente; partial state. **Aceite:** outage, RLS e empty visualmente diferentes; A/B sem mistura; websocket recupera sem listeners duplicados; links não apontam para rota inexistente.

### P2-A — Limpeza e decomposição

**Dependências:** P0 e P1 funcionais. **Arquivos:** monólitos apontados pelo checker, candidatos dead-code, `src/services/proposals.ts`, componentes mock e `.audit/DEBTS.md`. **Ações:** decompor por domínio; shim ou remoção de contratos paralelos; provar dead-code por múltiplos sinais; separar demo de produção. **Aceite:** route budget bloqueante; podas com prova; zero mock operacional sem allowlist; debts atualizadas.

### P2-B — Design e acessibilidade

**Dependências:** P1-C e P1-E. **Arquivos:** tokens, `scripts/token-sync.mjs`, `src/styles.css`, `button.tsx`, `__root.tsx` e shells. **Ações:** geração determinística; remover zoom lock; target, foco, contraste e breakpoints únicos; visual tests. **Aceite:** zero P0/P1 de design ou exceção expirável; axe e Playwright verdes; zoom 200 por cento; no overflow.

### P2-C — Governança recursiva

**Dependências:** todas as anteriores. **Arquivos:** docs, IA, auditoria, reparo, melhoria e `.audit`. **Ações:** reconciliar claims; rodar auditoria recursiva; marcar stale/superseded; publicar pacote de provas. **Aceite:** cada claim tem prova atual; nenhum documento de fechamento contradiz checks; regressão reabre a fase responsável.

---

# 14. Prompts prontos para Antigravity

Todos os prompts desta seção exigem parada em caso de prova ausente. Em todos: não inventar dados, não substituir erro por vazio, não aceitar documentação como prova e não avançar sem teste verde.

## 14.1 Auditoria

### AUD-01 — Veredito material por domínio

**Prompt:** Audite somente o domínio indicado seguindo DB/schema → BFF → route → UI → publicação → operação posterior. **Escopo:** classificar funcional, parcial, quebrado ou não comprovado sem editar. **Arquivos:** apenas paths existentes em `docs`, `src`, `supabase/migrations` e `.audit`. **Não inventar dados:** migration, comentário e doc não provam produção; não preencher gaps com mocks/defaults. **Testes:** executar testes existentes e registrar dependências; não chamar teste de array de RLS. **Evidências:** tabela com path:linha, comando, saída, limitações e blockers; parar sem prova verde.

### AUD-02 — Reconciliar claims documentais

**Prompt:** Compare claims de 100 por cento, implementado, ativo, zero mocks, RLS validado e E2E verde com o checkout atual. **Escopo:** `docs`, `ia`, `auditoria`, `melhoria`, `reparo`, `.audit`. **Arquivos:** documentos e comandos que eles citam. **Não inventar dados:** claim sem comando, ref e data vira não comprovado; não editar texto para parecer verde. **Testes:** executar comandos declarados e capturar exit code. **Evidências:** ledger claim para path, commit, timestamp, ambiente e resultado; parar na primeira contradição P0.

### AUD-03 — Inventário adversarial de P0

**Prompt:** Audite P0 de tenant, storage, estoque, publicação, Builder, Marketplace e toolchain. **Escopo:** somente os bloqueadores P0 fornecidos. **Arquivos:** identity, listing, classifieds, storage, stock, builder, migrations RLS e package scripts. **Não inventar dados:** sem banco, classificar RLS como não comprovado. **Testes:** preparar casos A/B, anonymous, role sem permissão, falha DB e concorrência; se não executar, registrar blocker. **Evidências:** matriz risco, reprodução ou justificativa da não prova; não avançar com P0 aberto.

### AUD-04 — Trace completo de entidade

**Prompt:** Escolha uma entidade autorizada e trace todos os consumidores até operação posterior. **Escopo:** uma entidade por execução. **Arquivos:** migration, types, BFF, loader/action, UI, rota pública, evento/job e docs. **Não inventar dados:** não criar fixture comercial para completar o caminho. **Testes:** smoke de DB, BFF e rota real; erro de join deve continuar error. **Evidências:** mapa de IDs, path:linha, query e gaps; parar se houver dois owners sem decisão.

## 14.2 Inventário

### INV-01 — Rotas, parâmetros e links

**Prompt:** Reconcilie arquivos de rota, `src/routeTree.gen.ts`, manifest e `.audit/ROUTES`. **Escopo:** grupos pathless, parâmetros, links literais e links vindos do banco. **Arquivos:** `src/routes`, route tree, `.audit`, componentes de navegação. **Não inventar dados:** URL dinâmica não é válida sem allowlist e tenant check. **Testes:** crawler, normalização e smoke; não aceitar contagem documental. **Evidências:** diff de inventário, rotas órfãs e comando reprodutível.

### INV-02 — Tabelas, policies e writers

**Prompt:** Mapeie tabelas, views, RPCs, policies, enums e writers de um domínio. **Escopo:** migrations efetivas e consumidores runtime. **Arquivos:** `supabase/migrations` e services/types relacionados. **Não inventar dados:** migration posterior não revoga policy sem SQL comprovado. **Testes:** aplicar migrations em banco efêmero e consultar policies. **Evidências:** tabela owner, writers, readers, RLS, FK e status; parar em duplicidade sem owner.

### INV-03 — Implementações concorrentes

**Prompt:** Detecte owners duplicados de estoque, listing, publicação, turismo, templates, DTOs e tenant. **Escopo:** duplicação funcional material. **Arquivos:** paths dos resultados, imports, registries e routeTree. **Não inventar dados:** candidato dead-code não é morto. **Testes:** import estático, dynamic import, registry e smoke; não apagar. **Evidências:** matriz canônico, adapter, legacy e quarentena com expiração.

### INV-04 — Fallbacks e estados

**Prompt:** Catalogue `catch`, defaults e fallbacks que mudam semântica comercial. **Escopo:** vazio, primeiro tenant, root store, 99, 10, rating, delivery, URL pública e mocks. **Arquivos:** routes, services, components e migrations. **Não inventar dados:** não trocar um fallback factual por outro. **Testes:** injetar erro na fronteira e comparar empty, error e unconfigured. **Evidências:** path:linha, entrada, saída atual e saída alvo.

## 14.3 Contratos

### CON-01 — Estoque canônico

**Prompt:** Feche o contrato de estoque. **Escopo:** reconciliar `stock_on_hand/stock_reserved` e `stock/reserved_stock`, RPC, ledger e counters. **Arquivos:** migrations 0002/0033/posteriores, stock services, admin catalog, product BFF e rota. **Não inventar dados:** não renomear sem compatibilidade, backfill e prova; não usar 10/99. **Testes:** schema smoke, ajuste, reserva, release, venda, retorno, estorno e concorrência. **Evidências:** migration hash, queries, movement rows e reconciliação; parar se houver writer fora da RPC.

### CON-02 — Offer e Listing DTO

**Prompt:** Valide DTO discriminado para produto, serviço, pacote, classificado e experiência. **Escopo:** adapters explícitos e provenance. **Arquivos:** `src/types/catalog.ts`, `src/types/offer.ts`, unified/classifieds/admin services e `/servicos`. **Não inventar dados:** preço, rating, estoque, agenda e identidade ausentes continuam ausentes. **Testes:** schemas válidos/ inválidos por origin, kind e status; quatro round-trips. **Evidências:** contrato versionado, payloads e adapters; parar se houver dois owners.

### CON-03 — State machine de publicação

**Prompt:** Defina a máquina única para listing e experience. **Escopo:** draft, review, published, paused, expired, archived e failed. **Arquivos:** unified listing, builder, Omni, migrations e rotas públicas. **Não inventar dados:** `active` não é `published` sem alias/migration demonstrado. **Testes:** invariantes, concorrência, rollback V1/V2 e read-after-publish. **Evidências:** constraints, auditoria, outbox e DTO público.

### CON-04 — Registry, bindings e actions

**Prompt:** Normalize `data_bindings.source/type`, schemas de bloco e actions allowlisted. **Escopo:** registry, templates, hydrator e renderer. **Arquivos:** `builder-registry.ts`, `builder-types.ts`, libraries de templates, `builder.functions.ts`, `experience-renderer.tsx`. **Não inventar dados:** source desconhecido não vira array vazio silencioso. **Testes:** bindings reais por tenant, unknown block, schema inválido e action proibida. **Evidências:** versão do registry, nodes, SSR e erro observável.

### CON-05 — Contrato turismo

**Prompt:** Formalize a linhagem única quote → proposal → contract → trip → voucher → boarding. **Escopo:** eliminar tabelas concorrentes e criar FKs. **Arquivos:** migrations e services/rotas de turismo citados nos resultados. **Não inventar dados:** não criar trip sintética nem escolher primeiro store. **Testes:** FKs, autorização, idempotência, token válido/inválido/expirado/outro tenant e reload. **Evidências:** diagrama de IDs, SQL, queries e telas; parar com dual-write não reconciliado.

## 14.4 Server-side, BFF e RLS

### SRV-01 — Guard de tenant em mutation

**Prompt:** Imponha `getServerIdentity → resolveTenant → assertStoreAccess → query/mutation`. **Escopo:** classificados, listings, superfície, catálogo, Marketplace, Builder e turismo. **Arquivos:** identity services, services críticos e policies. **Não inventar dados:** `storeId` do cliente é intenção. **Testes:** A com ID/store B em create/update/delete/publish; anonymous e role sem capability. **Evidências:** 403/404, ausência de mutation e auditoria.

### SRV-02 — Service role

**Prompt:** Liste todo uso de service role e prove necessidade. **Escopo:** separar job interno de request user-facing. **Arquivos:** `src/lib/supabase.ts` e importadores de `getServerClient`. **Não inventar dados:** não remover RLS por conveniência nem migrar para anon sem teste. **Testes:** request sem identidade, tenant errado, policy deny e job autorizado. **Evidências:** call graph, guard anterior, scope da query e decisão RLS.

### SRV-03 — Envelope de erro

**Prompt:** Substitua `catch` que retorna `[]` ou `null` por envelope discriminado. **Escopo:** shell público, Marketplace, vitrine, turismo, catálogo e classificados. **Arquivos:** `_store.tsx`, `_store.index.tsx`, `_store.ofertas.tsx`, vitrine e turismo routes. **Não inventar dados:** erro de DB não é empty. **Testes:** outage, RLS denied, not_found e empty real. **Evidências:** JSON/HTML, correlation ID, retry e logs.

### SRV-04 — Storage privado

**Prompt:** Feche upload e download em Server Function signed. **Escopo:** mídia geral, digital classificado e áreas sensíveis. **Arquivos:** `storage.functions.ts`, media uploader, digital dropzone e migrations storage. **Não inventar dados:** não aceitar bucket/folder arbitrário nem devolver URL pública. **Testes:** MIME, magic bytes, tamanho, prefixo tenant, anonymous, TTL e entitlement. **Evidências:** object path, policy decision e signed URL.

### SRV-05 — Realtime seguro

**Prompt:** Retire realtime de componentes e crie adapter autorizado. **Escopo:** MotoLink, pedidos e embarque. **Arquivos:** `motolink-tracking-widget.tsx`, `realtime-channel.ts`, services de operação. **Não inventar dados:** sem courier, ETA, telefone ou veículo default. **Testes:** A/B, disconnect/reconnect, cleanup e listener único. **Evidências:** eventos, escopo order/trip e estados de conexão.

### SRV-06 — DTO público allowlist

**Prompt:** Crie e valide DTOs públicos de classificado, produto, voucher e vitrine. **Escopo:** remover payment settings, PII, audit fields e URLs internas. **Arquivos:** `classifieds.functions.ts`, `product.functions.ts`, `travel-lifecycle.functions.ts` e rotas públicas. **Não inventar dados:** não engolir erro de serialização. **Testes:** snapshot/schema anônimo e cross-tenant. **Evidências:** JSON aprovado, campos proibidos ausentes e status.

## 14.5 Workspace

### WKS-01 — Produto sem variante

**Prompt:** Prove criação de produto com zero variantes explícitas. **Escopo:** saldo zero, ledger vazio, sem default 10 e criação de variante real. **Arquivos:** `admin-catalog.functions.ts`, catálogo route e migrations catalog. **Não inventar dados:** não criar variante sintética. **Testes:** falha em mídia, categoria ou opção precisa fazer rollback total. **Evidências:** rows, FKs, ledger antes/depois e UI.

### WKS-02 — Estoque somente por RPC

**Prompt:** Bloqueie edição inline via `updateProduct` e exija `adjustStock/RPC`. **Escopo:** catálogo e alertas. **Arquivos:** `workspace.catalogo.produtos.index.tsx`, stock services, ledger e alertas. **Não inventar dados:** counter só muda junto de movement. **Testes:** actor, reason, reference, idempotency e tentativa proibida. **Evidências:** chamada RPC, movement row e saldo.

### WKS-03 — Workspace para Vitrine

**Prompt:** Prove que draft e publish do Workspace chegam ao renderer público. **Escopo:** loja A, draft, publish, reload e loja B. **Arquivos:** vitrine route, builder route/functions, public store/profile routes e renderer. **Não inventar dados:** nenhum root store ou fallback global. **Testes:** SSR anonymous, refresh, A/B e desativação. **Evidências:** document/version/node IDs e HTML público.

### WKS-04 — Workspace para Marketplace

**Prompt:** Faça Marketplace consumir somente listings elegíveis. **Escopo:** produto Workspace approved, pending e classificado não promovido. **Arquivos:** unified listing view/functions, Marketplace route/components e marketplace hub. **Não inventar dados:** rating, loja e delivery vêm do DB ou ficam unknown. **Testes:** origin, compliance, tenant e erro de provider. **Evidências:** query read model, cards e ausência indevida.

### WKS-05 — Serviços e ofertas

**Prompt:** Feche serviço → oferta → orçamento/agendamento → operação. **Escopo:** preço, unidade, agenda, capacidade e política. **Arquivos:** `_store.servicos.tsx`, Offer types, package/booking services e rotas. **Não inventar dados:** rails vazios não são serviço criado. **Testes:** criar, publicar, cotar, agendar, operar e recarregar. **Evidências:** IDs, FKs, DTO, rota e operação.

## 14.6 Classificados

### CLS-01 — Create tenant-safe

**Prompt:** Corrija criação, edição e publicação de classificado para derivar tenant da identidade. **Escopo:** create, update, status e delete. **Arquivos:** editor `workspace.conta.classificados.novo`, `classifieds.functions.ts` e migrations RLS. **Não inventar dados:** rejeitar `store_id` sem membership; falha backend não vira sucesso local. **Testes:** A tentando B, autor sem membership, manager, owner e anonymous. **Evidências:** ausência de row cross-tenant, status HTTP e audit event.

### CLS-02 — Preview truthful

**Prompt:** Unifique preview e detalhe no mesmo DTO e renderer. **Escopo:** remover cidade, frete, rating, identidade e entrega fictícios. **Arquivos:** editor, showcases, detalhe público e componentes de preview. **Não inventar dados:** campo ausente permanece ausente ou empty. **Testes:** fixtures por nicho, snapshots desktop/mobile e pós-publicação. **Evidências:** comparação de props/HTML e busca sem hardcodes.

### CLS-03 — Not found e DTO público

**Prompt:** Separe UUID inválido, UUID inexistente, forbidden e erro de banco. **Escopo:** `getPublicClassifiedById` e rota `$id`. **Arquivos:** `src/services/classifieds.functions.ts` e `src/routes/_store.classificados.$id.tsx`. **Não inventar dados:** não acessar propriedade de null nem retornar payment/PII. **Testes:** IDs válidos e inválidos, statuses e anonymous. **Evidências:** HTTP, JSON, HTML e correlation ID.

### CLS-04 — Promoção idempotente

**Prompt:** Consolide as bridges Classificado para Workspace em uma command transacional. **Escopo:** ownership, target tenant, mídia, promoted status, FK, outbox e retry. **Arquivos:** `listing-promotion.functions.ts`, `classifieds-workspace-bridge.functions.ts`, `classifieds.functions.ts`, modal e conta routes. **Não inventar dados:** não criar organization/store automaticamente. **Testes:** duas chamadas concorrentes, retry após falha e target B. **Evidências:** um product, links bidirecionais, um evento, rollback e status.

### CLS-05 — Download digital protegido

**Prompt:** Imponha entitlement para download digital. **Escopo:** owner, comprador pago, NDA, TTL e URL assinada. **Arquivos:** `classifieds.functions.ts`, detalhe classificado, dropzone e storage service. **Não inventar dados:** falha de assinatura nunca devolve URL pública. **Testes:** anonymous, não comprador, comprador sem pagamento, comprador autorizado, token expirado. **Evidências:** deny/allow, TTL e ausência de URL direta.

## 14.7 Vitrine e Builder

### VIT-01 — Escolha de publicação canônica

**Prompt:** Escolha Builder relacional ou Omni como adapter, eliminando duas verdades. **Escopo:** draft, nodes, settings, publish e rota pública. **Arquivos:** `builder.functions.ts`, `omni-builder.functions.ts`, editor route, `_store.paginas.$slug.tsx`, `CanonicalStoreProfileView`. **Não inventar dados:** não declarar cutover sem read-after-publish. **Testes:** editor→DB→reload→publish→SSR e V1/V2. **Evidências:** tabela publicada única e DTO público.

### VIT-02 — Corrigir hidratação real

**Prompt:** Audite e corrija bindings `marketing_banners`, `latest_products`, `category_products`, `classifieds`, `reviews` e `store_profile`. **Escopo:** ordenação de declarações, filtros por tenant e erros. **Arquivos:** `src/services/builder.functions.ts`, registry, renderer e migrations nodes. **Não inventar dados:** ausência de binding não cria loja/produto. **Testes:** matriz real por loja A/B, banco indisponível e unknown source. **Evidências:** SQL, payload de árvore, HTML/JSON e erro observável.

### VIT-03 — Publicação transacional

**Prompt:** Faça publish preservar última versão boa e exigir concorrência otimista. **Escopo:** arquivamento, nodes, promoção, cache e auditoria. **Arquivos:** `builder.functions.ts`, migrations Builder, cache adapter e public routes. **Não inventar dados:** não marcar sucesso antes da confirmação de todos os writes. **Testes:** erro depois de arquivar, duas publicações simultâneas, reload e cache stale. **Evidências:** V1 intacta, uma V2 publicada ou conflito explícito, audit/outbox.

### VIT-04 — Registry e presets únicos

**Prompt:** Converta home library, Omni templates, section templates e DB templates em registry único versionado. **Escopo:** preset, thumbnail, schema e migração de bloco. **Arquivos:** `home-templates-library.ts`, `omni-templates.ts`, `section-templates.ts`, `builder-registry.ts`, `builder-types.ts` e services seed. **Não inventar dados:** image URL, nome, telefone e conteúdo demo não podem parecer fatos. **Testes:** cada preset aplicado, nodes validados e reload público. **Evidências:** lineage do preset, nodes e snapshots.

### VIT-05 — Tema e SSR determinístico

**Prompt:** Faça `settings.theme` e `design_tokens` renderizarem igual no SSR e hidratação. **Escopo:** tema global, tokens locais, localStorage e window. **Arquivos:** `experience-renderer.tsx`, `CanonicalStoreProfileView`, settings migrations e CSS. **Não inventar dados:** ausência de tema usa estado documentado, não identidade fictícia. **Testes:** SSR, hydration, reload, dark/light, store A/B e zoom. **Evidências:** HTML, computed styles e ausência de mismatch.

## 14.8 Turismo

### TUR-01 — Agregado e FKs

**Prompt:** Escolha a linhagem canônica de turismo e elimine dual-write sem reconciliação. **Escopo:** agency, client, quote, proposal, contract, trip, voucher e group tour. **Arquivos:** migrations `20260930000000`, `20260831140000`, `20260904120000`, services de proposal/contract/lifecycle/group/voucher. **Não inventar dados:** não fabricar trip, client, destino ou loja. **Testes:** FKs, tenant, conversão e rollback. **Evidências:** IDs únicos, SQL constraints e read model.

### TUR-02 — Proposal para contrato para viagem

**Prompt:** Feche a conversão idempotente de proposta. **Escopo:** publicação, aceite, contrato versionado, trip e auditoria. **Arquivos:** `travel-proposal.functions.ts`, `travel-contract.functions.ts`, `travel-lifecycle.functions.ts` e rotas. **Não inventar dados:** defaults de cliente, WhatsApp e destino não são dados reais. **Testes:** primeira chamada, retry, concorrência, cancelamento e outro tenant. **Evidências:** uma cadeia de IDs, status e outbox.

### TUR-03 — Voucher público e QR

**Prompt:** Faça voucher manual e automático resolverem o mesmo agregado público. **Escopo:** token, QR, sessão anonymous, tenant e expiração. **Arquivos:** `travel-vouchers.functions.ts`, `travel-lifecycle.functions.ts`, migrations voucher e telas internas/públicas. **Não inventar dados:** token não seleciona primeira loja nem cria viagem sintética. **Testes:** válido, inválido, expirado, trocado e replay. **Evidências:** documento, trip, passageiro e agência corretos.

### TUR-04 — Grupos, assentos e boarding

**Prompt:** Unifique `group_tour`, layout, rooming, ponto, check-in e no-show. **Escopo:** persistência no mesmo `group_tour_id` e `trip_id`. **Arquivos:** `group-tours.functions.ts`, `group-tour-boarding.functions.ts`, migrations group tours/boarding e rotas. **Não inventar dados:** não serializar operação somente em `description`. **Testes:** duas abas, reload, reabrir e concorrência de assento. **Evidências:** rows canônicas, status e histórico.

### TUR-05 — Portal do viajante

**Prompt:** Retire dados estáticos de parcelas, contatos, vouchers, carteira e álbum. **Escopo:** backend, autorização, upload e reload. **Arquivos:** `src/routes/viajante.viagem.$id.tsx`, lifecycle, wallet, storage e portal routes. **Não inventar dados:** toast não é persistência; sem dados não mostrar valores fixos. **Testes:** usuário autorizado, token errado, upload e refresh. **Evidências:** DB/object path, DTO, HTML e audit.

## 14.9 Design

### DSG-01 — Token sync real

**Prompt:** Verifique se tokens geram CSS deterministicamente e feche o drift. **Escopo:** tokens, aliases, CSS, consumidores e tokens mortos. **Arquivos:** `docs/design/tokens.json`, `scripts/token-sync.mjs`, `src/styles.css`, docs de design. **Não inventar dados:** não declarar sync por comparar nomes. **Testes:** alterar um token, executar geração e comparar diff determinístico. **Evidências:** comando, diff e consumidores.

### DSG-02 — HIG e WCAG executáveis

**Prompt:** Teste accessibility real, não somente strings. **Escopo:** zoom, focus, contrast, labels, keyboard, target e reduced motion. **Arquivos:** `__root.tsx`, `button.tsx`, `src/styles.css`, shells e rotas. **Não inventar dados:** não aceitar uma classe Tailwind como prova de DOM acessível. **Testes:** Playwright, axe, zoom 200 e teclado em 320/390/1440. **Evidências:** relatório por elemento, screenshot e exit code.

### DSG-03 — Breakpoints e overflow

**Prompt:** Unifique `compact`, `medium` e `expanded` entre CSS e React. **Escopo:** `use-mobile`, AppShell, bottom nav, sheets e master-detail. **Arquivos:** `src/hooks/use-mobile.tsx`, `app-shell.tsx`, CSS e rotas apontadas na matriz responsiva. **Não inventar dados:** não marcar conformidade pela matriz documental. **Testes:** larguras 320, 390, 600, 768, 840, 1440 e zoom. **Evidências:** screenshots, DOM bounds e ausência de overflow.

### DSG-04 — Estados visuais honestos

**Prompt:** Audite cada tela assíncrona para loading, data, empty, error, forbidden, not_found, unconfigured e partial. **Escopo:** catálogo, classificados, Marketplace, vitrine e turismo. **Arquivos:** loaders, components state e services. **Não inventar dados:** não preencher erro com cards demo ou zeros de negócio. **Testes:** falha real ou fault injection por dependência. **Evidências:** snapshots por estado e correlation ID.

## 14.10 Limpeza e quarentena

### LMP-01 — Route budget bloqueante

**Prompt:** Transforme o checker de tamanho em gate real. **Escopo:** rotas e componentes acima do limite, exceções expiráveis. **Arquivos:** `scripts/check-route-size.mjs`, `package.json`, monólitos reportados. **Não inventar dados:** não alterar limite para esconder dívida. **Testes:** falha em arquivo crítico e sucesso com exceção registrada. **Evidências:** relatório path:linha, owner e prazo.

### LMP-02 — Dead code com múltiplos sinais

**Prompt:** Classifique os 106 candidatos sem apagar por heurística. **Escopo:** import estático, dynamic import, routeTree, registry, teste e smoke. **Arquivos:** `scripts/dead-code-detector.mjs`, candidatos e registries. **Não inventar dados:** file-based route e componente de registry não são mortos por falta de import. **Testes:** busca, build, smoke antes/depois e regressão. **Evidências:** decisão por arquivo, comando e rollback.

### LMP-03 — Remover mock operacional

**Prompt:** Separe demo explícita de produção e remova dados sintéticos visíveis. **Escopo:** smartphone mockup, MotoLink, fallbacks de viagem, loja e vitrine. **Arquivos:** paths apontados em `founder-smartphone-mockup.tsx`, `motolink-tracking-widget.tsx`, travel lifecycle e renderer. **Não inventar dados:** ausência vira empty/unconfigured, não outro exemplo. **Testes:** provider ausente, props vazias e screenshot. **Evidências:** allowlist de demo ou remoção e HTML final.

### LMP-04 — Duplicação de contratos

**Prompt:** Torne `src/services/proposals.ts` shim ou remova com prova. **Escopo:** tipos Flight, Hotel, Transfer e Proposal concorrentes. **Arquivos:** `proposals.ts`, `travel-proposal.functions.ts`, imports e testes. **Não inventar dados:** não fazer cast para esconder incompatibilidade. **Testes:** typecheck, unitários, integração e busca de consumers. **Evidências:** grafo antes/depois e um owner canônico.

## 14.11 Testes

### TST-01 — Clean checkout

**Prompt:** Faça a suíte executar em checkout limpo. **Escopo:** install, lockfile, test, typecheck e build. **Arquivos:** package scripts, lockfile, tsconfig, Vitest config e dependências. **Não inventar dados:** dependência faltante é blocker, não mock local. **Testes:** repetir do zero em ambiente documentado. **Evidências:** logs completos, exit codes e commit.

### TST-02 — RLS adversarial

**Prompt:** Escreva integração RLS com dois tenants e auth.uid real. **Escopo:** products, classifieds, listings, CMS, storage, connectors e tourism. **Arquivos:** migrations e harness de integração. **Não inventar dados:** fixtures precisam ter tenant/membership reais. **Testes:** SELECT/INSERT/UPDATE/DELETE cruzado, anonymous e role sem permissão. **Evidências:** SQL, policies aplicadas e ausência de rows.

### TST-03 — Estoque concorrente

**Prompt:** Prove reserva, venda, release, retorno e estorno sob concorrência. **Escopo:** saldo 1, locks, idempotência e ledger. **Arquivos:** migrations estoque, RPCs e services checkout. **Não inventar dados:** não simular lock em memória. **Testes:** duas transações reais, retry e replay. **Evidências:** movimentos, counters e resultado das duas chamadas.

### TST-04 — Publicação e rollback

**Prompt:** Teste V1/V2 em Builder e listing com falha intermediária. **Escopo:** versão publicada, nodes, cache, audit e outbox. **Arquivos:** builder/unified services, migrations e rotas públicas. **Não inventar dados:** não declarar sucesso por update parcial. **Testes:** falha após arquivar, concorrência e read-after-publish. **Evidências:** versão ativa, snapshot público, logs e retry.

### TST-05 — E2E visual e a11y

**Prompt:** Crie matriz Playwright e axe para superfícies críticas. **Escopo:** 320, 390, 600, 768, 840, 1440 e zoom 200. **Arquivos:** rotas públicas, editor, Marketplace, classificados, turismo e fixtures reais. **Não inventar dados:** snapshots devem usar conteúdo de fixture explicitamente marcado, sem hardcode comercial oculto. **Testes:** keyboard, focus, contrast, overflow, SSR/hydration e estados de erro. **Evidências:** screenshots, axe report e diff.

### TST-06 — Marketplace e webhook idempotentes

**Prompt:** Prove import por canal/external_id e webhook com assinatura/replay. **Escopo:** produto, channel listing, sync log, outbox e estoque. **Arquivos:** `marketplace-hub.functions.ts`, OAuth callback, channel migrations e route. **Não inventar dados:** erro de provider não vira sincronizado. **Testes:** mesma importação repetida, mudança de preço/estoque, assinatura inválida e replay. **Evidências:** contagem de rows, logs, status e reconciliação.

## 14.12 Verificação recursiva

### REC-01 — Reabrir consumidores após migration

**Prompt:** Depois de cada migration, reaudite todos os writers, readers, DTOs, loaders, rotas, policies, views e docs. **Escopo:** impacto direto e indireto. **Arquivos:** migration alterada e grafo de referências. **Não inventar dados:** não marcar migração fechada pelo SQL isolado. **Testes:** smoke schema, contract, RLS e E2E do domínio. **Evidências:** matriz de impacto e novo ledger; parar em consumer sem teste.

### REC-02 — Reabrir após adapter ou bridge

**Prompt:** Após criar adapter de Legacy, Omni, classified ou channel, prove que ele não cria segunda verdade. **Escopo:** ownership, provenance, idempotência, rollback e eventos. **Arquivos:** adapter, fonte canônica, projeção, rotas e docs. **Não inventar dados:** adapter não pode sintetizar preço, status, mídia ou tenant. **Testes:** round-trip, retry, concorrência e falha parcial. **Evidências:** IDs ligados, outbox e read model.

### REC-03 — Regressão cross-surface

**Prompt:** Execute uma matriz por origem e superfície. **Escopo:** product, service, classified e experience em Workspace, Vitrine, Marketplace, PDP e público. **Arquivos:** unified read model, BFFs e rotas. **Não inventar dados:** origin não pode ser remapeada para preencher card. **Testes:** estados published, pending, paused, archived e erro. **Evidências:** DTOs, HTML, queries e ausência de leakage.

### REC-04 — Verificação de documentação final

**Prompt:** Revalide todos os claims de fechamento após as mudanças. **Escopo:** docs, IA, auditoria, reparo, melhoria e `.audit`. **Arquivos:** todos os documentos citados no claim ledger. **Não inventar dados:** claim sem artefato atual vira não comprovado ou obsoleto. **Testes:** executar comandos registrados e comparar hash/commit. **Evidências:** ledger final, diff documental e lista de claims ainda abertos.

### REC-05 — Stop-the-line final

**Prompt:** Faça a auditoria final somente se todos os P0/P1 anteriores tiverem prova verde. **Escopo:** CI, RLS, E2E, visual, docs e artefatos. **Arquivos:** pipeline, reports, proof ledger e paths dos owners. **Não inventar dados:** qualquer falha ou dependência ausente mantém fechamento bloqueado. **Testes:** clean checkout completo, banco efêmero, browser e smoke público. **Evidências:** pacote final com comandos, timestamps, commits, migration hashes, logs e limitações; retornar FECHADO somente com todos os gates verdes.