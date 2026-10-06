# Auditoria E2E — Domínio 04: Mapas, locais, rotas e roteiros

**Projeto:** Waesy  
**ID:** `chat-e2e-domain-04-maps-routing`  
**Status geral:** **PARCIAL — há superfícies reais de mapa, diretório, turismo, cotação e persistência de pedidos, mas o domínio não é um caminho único UI → BFF → banco/estado → resposta confiável. Existem bloqueadores de contrato, dados sintéticos visíveis, autorização incompleta, ausência de routing real e ações do chat sem handler no Copilot de tela cheia.**

## Escopo e método

Arquivos de entrada lidos:

- `src/services/marketplace.functions.ts`
- `src/services/booking.functions.ts`
- `src/routes/`
- `src/components/chat/`

Arquivos adicionais lidos apenas para fechar o rastreio E2E:

- `src/routes/_store.mapa.tsx`
- `src/routes/_store.mobilidade.tsx`
- `src/routes/_store.places.$placeSlug.tsx`
- `src/routes/_store.turismo.index.tsx`
- `src/routes/_store.turismo.$id.tsx`
- `src/routes/_store.copilot.tsx`
- `src/routes/viajante.viagem.$id.tsx`
- `src/services/social.functions.ts`
- `src/services/tourism.functions.ts`
- `src/services/mobility.functions.ts`
- `src/services/integrations.functions.ts`
- `src/components/mobility/maplibre-canvas.tsx`
- `src/components/chat/waesy-copilot-drawer.tsx`
- `src/services/ai-conversations.functions.ts` e migrations relevantes

A classificação usada é: **real** = o caminho observado está implementado e o contrato é coerente no recorte; **parcial** = existe implementação, mas há lacuna de segurança, persistência, semântica, contrato ou confiabilidade; **ausente** = a promessa não tem implementação observável ou o botão não produz o efeito anunciado. Não foi inferido funcionamento não demonstrado pelo código.

## Veredito executivo

1. **Mapa social é real apenas como renderizador de tiles e marcadores.** `MapLibreCanvas` inicializa MapLibre e lê configuração pública de tiles (`src/components/mobility/maplibre-canvas.tsx:68-120`), e `_store.mapa` consulta `getMomentsMap` (`src/routes/_store.mapa.tsx:28-39,67-72`). Porém, o BFF atribui coordenadas de uma lista fixa a live moments, locais sem GPS e eventos (`src/services/social.functions.ts:925-937,965-1021`). Isso é dado sintético apresentado como posição real.
2. **A promessa de “lugares, eventos e moments” está quebrada na própria UI.** `getMomentsMap` retorna `events`, mas `_store.mapa` só cria marcadores para `moments` e `places` (`src/routes/_store.mapa.tsx:105-138`); eventos nunca chegam ao mapa. O callback de clique espera um ID, enquanto `MapLibreCanvas` chama o callback com um objeto `MapMarkerItem` (`src/routes/_store.mapa.tsx:173-180`; `src/components/mobility/maplibre-canvas.tsx:27-33,240-242`). Marcador de local pode aparecer e não abrir nada.
3. **Não existe cálculo de rota/geometry no componente de mapa.** `MapLibreCanvas` apenas coloca origin/destination e faz `fitBounds` (`src/components/mobility/maplibre-canvas.tsx:279-294`); não chama OSRM/Mapbox/Google Directions, não desenha polyline e não persiste uma rota. A tela de mobilidade calcula distância por linha reta multiplicada por 1,3 no cliente (`src/routes/_store.mobilidade.tsx:137-148`) e duração por fórmula.
4. **Cotação e pedido de mobilidade têm persistência real, mas aceitam valores críticos do cliente.** `calculateMobilityQuote` usa tabelas ativas quando existem e fallback de tarifas fixas quando não existem (`src/services/mobility.functions.ts:194-237`); `createMobilityRequest` insere pedido em `orders` (`src/services/mobility.functions.ts:283-366,368-413`). Contudo, `distance_km` e `estimated_price_cents` vêm do caller e `final_price_cents` é igual ao estimado (`src/services/mobility.functions.ts:297-303,354-364`). Não há idempotency key, lock ou recomputação server-side.
5. **Turismo público lê registros reais e expõe itinerário cadastrado, mas o detalhe pode expor qualquer status e não há mapa do destino.** A listagem usa cliente anônimo, filtra `status = active` e exclui IDs sintéticos conhecidos (`src/services/tourism.functions.ts:83-105`); o detalhe por ID usa cliente anônimo mas não filtra status (`src/services/tourism.functions.ts:170-183`). O itinerário é somente mapeado de `row.itinerary`/`attributes` (`src/services/tourism.functions.ts:186-223`) e renderizado se existir (`src/routes/_store.turismo.$id.tsx:657-660`); não há coordenadas, geocoding ou rota do roteiro.
6. **Reserva turística persiste, mas não é atomicamente idempotente nem exige autenticação no BFF.** A UI abre o modal com `requireAuth` (`src/routes/_store.turismo.$id.tsx:89-98`), porém `bookTourismExperience` aceita `getCurrentIdentity().catch(() => null)` e grava `profile_id` nulo quando chamado diretamente (`src/services/tourism.functions.ts:253-265,354-376`). Atualização de assentos e inserção de espelho/reserva são operações separadas; erro do espelho é ignorado (`src/services/tourism.functions.ts:313-340`). Duas reservas concorrentes podem ler o mesmo array e sobrescrever disponibilidade.
7. **O portal do passageiro é uma maquete estática, não um roteiro real por `id`.** `src/routes/viajante.viagem.$id.tsx` não possui loader/BFF. Exibe PNR, voo LATAM, hotel, clima, financeiro e contatos hardcoded (`src/routes/viajante.viagem.$id.tsx:8-39,114-166,169-253`); o `id` só é interpolado no texto do cabeçalho. Upload de fotos apenas mostra toast e não faz upload/persistência (`src/routes/viajante.viagem.$id.tsx:197-225`).
8. **Roteiros/ações do chat são renderizados, mas não são E2E em todas as superfícies.** `StructuredMessageView` possui blocos `places_carousel`, `mobility_quote` e `travel_itinerary` e gera ações (`src/components/chat/structured-message-view.tsx:978-1091,1095-1187,1718-1731`). O drawer flutuante passa `onActionClick`, mas a rota de Copilot que monta `AIChatShell` não passa callback de ação (`src/routes/_store.copilot.tsx:292-305`; `src/components/chat/ai-chat-shell.tsx:80-114`). No drawer, `call_ride` só navega para `/mobilidade`, perdendo payload; `request_travel_quote` grava uma solicitação com Chapecó e telefone fallback; ações não conhecidas só navegam se houver `payload.url` (`src/components/chat/waesy-copilot-drawer.tsx:126-176,272-276`).
9. **Streaming, retry automático e custo de IA não fecham no domínio.** O chat aguarda a execução síncrona no `sendAiConversationMessage`; `isStreaming`/cursor é estado visual e não entrega deltas nem reconstrói execução. O retry é opcional e externo ao componente; não existe idempotência de mensagem/ação. O payload estruturado aceita telemetria opcional (`src/components/chat/structured-message-view.tsx:106-115`), mas o domínio não prova que tokens/custo real acompanham o roteiro, quote ou ação.
10. **`marketplace.functions.ts` e `booking.functions.ts` não fornecem um BFF de mapas/rotas/roteiros.** Marketplace só consulta lojas/produtos (`src/services/marketplace.functions.ts:230-414,432-520`); booking cobre agendamentos/recursos e não geocoding/routing. Não deve ser afirmado que esses dois serviços suportam a promessa de mapas/roteiros.

## Matriz de promessas

| Promessa/contrato | Classificação | Evidência e julgamento |
|---|---|---|
| Abrir mapa da cidade com tiles reais | **Real** | `_store.mapa.tsx:169-183` monta `MapLibreCanvas`; `maplibre-canvas.tsx:68-120` busca configuração e inicializa MapLibre. É visualização de tiles, não prova de dados geográficos corretos. |
| Usar localização atual para centralizar mapa | **Real/parcial** | `_store.mapa.tsx:153-167` usa `navigator.geolocation` e altera estado local. Não persiste consentimento, localização ou contexto no BFF. |
| Buscar/filtrar moments no mapa | **Parcial** | Busca e filtros são locais (`_store.mapa.tsx:78-103`), mas o BFF não recebe `category`/cidade no query efetivo (`social.functions.ts:848-871,918-923`), então o resultado pode ser global e a UI só muda centro. |
| Exibir places do diretório com posição real | **Parcial** | O BFF lê `directory_listings` reais (`social.functions.ts:873-878`) e usa settings de latitude/longitude quando válidos, mas cai para `KNOWN_COORDINATES` por índice (`social.functions.ts:990-1007`). Sem GPS, a posição é sintética. |
| Exibir eventos no mapa | **Ausente na UI** | BFF retorna eventos com coordenadas fixas (`social.functions.ts:1009-1022`), mas `_store.mapa.tsx:105-138` nunca adiciona `events` a `mapMarkers`. |
| Clicar em qualquer marcador e abrir detalhe | **Ausente/quebrado** | `MapLibreCanvas` chama `onMarkerClick(m)` com objeto (`maplibre-canvas.tsx:240-242`), mas a tela trata o parâmetro como ID e só procura em `moments` (`_store.mapa.tsx:173-180`). Places e events não têm caminho de abertura. |
| Publicar um momento a partir do mapa | **Parcial** | O botão abre `PublishMomentModal` e refaz a query (`_store.mapa.tsx:196-213,381-385`); a persistência depende do modal/serviço não incluído no recorte, e não há feedback de coordenada/retorno de post neste arquivo. |
| “Moments ao vivo” em coordenada correta | **Parcial/contém sintético** | Posts com lat/lng são lidos do banco (`social.functions.ts:857-871,941-963`), mas `live_moments` sem coordenadas recebem coordenadas fixas cíclicas (`social.functions.ts:965-985`). O texto de “ao vivo” vem de metadata/default `true`. |
| Detalhe de local com endereço real | **Real/parcial** | `places/$placeSlug` carrega `getPlaceDetailBySlugFn` no loader (`src/routes/_store.places.$placeSlug.tsx:45-74`) e exibe dados do DTO. O código não prova, neste recorte, a política de ownership/RLS do serviço. |
| “Como chegar” para local | **Parcial** | O botão é um link externo OSM/Google (`src/routes/_store.places.$placeSlug.tsx:134-140,274-281`). Não é uma rota calculada pelo Waesy nem um mapa embutido com origem do usuário. |
| Listar turismo/pacotes/hospedagens reais | **Real/parcial** | `listPublicTourism` consulta `tourism_experiences` via anon, status ativo e ordenação real (`tourism.functions.ts:83-127`); a tela usa loader/query e filtros (`_store.turismo.index.tsx:21-45,98-123`). Erros são convertidos em listas vazias. |
| Abrir somente experiências públicas ativas | **Parcial** | A listagem filtra `active`, mas `getPublicTourismById` só faz `.eq("id")` (`tourism.functions.ts:170-183`), podendo retornar draft/inactive/published se o UUID for conhecido. |
| Mostrar roteiro dia a dia cadastrado | **Real/parcial** | O detalhe normaliza `experience.itinerary` (`_store.turismo.$id.tsx:76-87`) e renderiza `TravelItineraryTimeline` somente quando há itens (`:657-660`). É leitura/renderização; não há edição ou persistência nessa superfície. |
| Mostrar mapa/rota do destino turístico | **Ausente** | A página de detalhe mostra localização textual, weather e timeline (`_store.turismo.$id.tsx:596-609,650-660`), mas não usa `MapLibreCanvas`, coordenadas ou Directions. |
| Reservar experiência e emitir voucher | **Parcial** | A UI exige login antes de abrir (`_store.turismo.$id.tsx:89-98`) e chama `bookTourismExperience` (`:120-142,287-291`). O BFF insere `tourism_inquiries` e retorna voucher real (`tourism.functions.ts:354-389`), mas permite chamada guest direta, não tem idempotência e trata assento em operações separadas. |
| Reserva de assentos sem corrida/oversell | **Ausente** | O BFF lê e altera um array JSON sem lock/versão (`tourism.functions.ts:273-319`); duas execuções concorrentes podem reservar o mesmo assento. Inserção em `trip_seat_reservations` falha silenciosamente (`:326-340`) e não há rollback da atualização. |
| Cotação de corrida/entrega | **Parcial** | `calculateMobilityQuote` lê tabelas ativas e calcula preço (`mobility.functions.ts:194-277`), mas usa fallback fixo em caso de tabela vazia (`:215-237`). A distância é calculada localmente por linha reta (`_store.mobilidade.tsx:137-148`), não por rede viária. |
| Rota real no mapa | **Ausente** | O mapa só fitBounds entre dois pontos (`maplibre-canvas.tsx:279-294`); não há polyline, Directions API, OSRM/Valhalla/GraphHopper ou geocoding server-side no caminho auditado. |
| Solicitar corrida e salvar pedido | **Parcial** | A tela exige sessão no handler de submit (`_store.mobilidade.tsx:259-299`) e chama `createMobilityRequest`; o BFF insere pedido canônico em `orders` (`mobility.functions.ts:283-413`). A sessão não é exigida no BFF (`identity` pode ser nula), defaults substituem dados ausentes e o preço cliente é aceito. |
| Motorista em tempo real/status de corrida | **Ausente no recorte** | A descrição da tela promete “motoristas locais em tempo real” (`_store.mobilidade.tsx:16-24`), mas o caminho auditado só grava `orders` com status inicial `searching`/`accepted` (`mobility.functions.ts:340-366`). Não há subscription, tracking ou polling UI demonstrado. |
| Itinerário estruturado no chat | **Parcial** | `TravelItineraryBlock` renderiza days/destination/budget e emite `request_travel_quote` (`structured-message-view.tsx:1095-1187`). Não cria `tourism_experiences`, não salva itinerary e usa defaults (`Destino Turistico`, 3 dias, 2 viajantes). |
| Place card do chat → perfil | **Parcial** | `PlacesCarouselBlock` emite `open_place` com id/slug/storeId (`structured-message-view.tsx:933-945`). No drawer, navega para `/places/...` (`waesy-copilot-drawer.tsx:126-131`); no Copilot fullscreen não há callback de ação passado pelo route (`_store.copilot.tsx:292-305`). |
| Chat itinerary → cotação real | **Parcial** | Drawer chama `requestTravelQuote` e persiste uma solicitação (`waesy-copilot-drawer.tsx:140-176`), mas força origem Chapecó, datas flexíveis, 1 quarto e telefone fallback `49999999999` (`:149-160`). Não é uma reserva nem confirma preço/disponibilidade. |
| Chat mobility quote → chamada de corrida | **Ausente como chamada** | O bloco emite `call_ride` com origem/destino/preço (`structured-message-view.tsx:1067-1089`), mas o drawer apenas fecha e navega para `/mobilidade` (`waesy-copilot-drawer.tsx:132-135`), descartando o payload. |
| Artefato de roteiro → exportação/Builder | **Parcial** | `ChatArtifactCard` reconhece `itinerary`/`travel_itinerary` e promete PDF (`chat-artifact-card.tsx:66-75`), mas o export é callback opcional (`:219-223`); sem callback, não há export no card. O viewer do shell exibe timeline/copia JSON, não persiste um roteiro de viagem. |
| Portal do passageiro carregar viagem pelo id | **Ausente** | `viajante.viagem.$id.tsx:8-16` declara rota mas não loader/query; os blocos são constantes (`:114-253`). O id não seleciona banco/estado. |
| Marketplace/booking suportar mapas/rotas/roteiros | **Ausente** | `marketplace.functions.ts` é feed de lojas/produtos (`:230-414`) e `booking.functions.ts` é agenda/recursos (`:320-448,654-758`); não há contrato de geocoding, mapa, routing ou itinerary nesses arquivos. |

## Rastreios E2E observados

### A. Mapa social

1. `_store.mapa` loader chama `getMomentsMap({ data: {} })` e engole erro para `{ moments: [], places: [], events: [] }` (`_store.mapa.tsx:28-39`).
2. Query client repete a chamada sem filtro (`_store.mapa.tsx:67-72`). `activeVibe` e `searchQuery` só filtram a resposta em memória (`:78-103`).
3. `getMomentsMap` consulta `posts`, `directory_listings` e `events` (`social.functions.ts:857-887`) e também uma consulta adicional de live moments (`:888-923`).
4. Posts com coordenadas preservam lat/lng do banco; live moments recebem `KNOWN_COORDINATES[idx % ...]`; directory/eventos também recebem coordenadas da mesma lista (`social.functions.ts:925-1022`).
5. A UI cria markers de moments e places, mas omite events (`_store.mapa.tsx:105-138`).
6. `MapLibreCanvas` chama o callback com o objeto marker (`maplibre-canvas.tsx:240-242`); a tela tenta tratar como string e apenas busca moments (`_store.mapa.tsx:177-180`). O contrato UI→mapa está quebrado para o caminho normal de click.

**Conclusão:** mapa/tiles **parcial**; dados de posição e eventos **não confiáveis E2E**.

### B. Local → “Como chegar”

1. A rota carrega `getPlaceDetailBySlugFn` com slug (`_store.places.$placeSlug.tsx:64-74`).
2. O DTO é exibido como endereço/telefone/avaliação. A URL é montada no cliente usando OSM Directions com apenas o destino ou Google Maps Search sem coordenadas (`:134-140`).
3. O botão abre nova aba externa (`:274-281`).

**Conclusão:** há ponte de navegação externa **parcial/real como link**, mas não há rota, distância, duração ou persistência calculadas pelo Waesy.

### C. Origem/destino → cotação → pedido

1. A tela começa com coordenada/default de Chapecó e presets fixos (`_store.mobilidade.tsx:40-101`).
2. GPS usa `navigator.geolocation` e chama Nominatim reverse geocode diretamente do browser (`:194-232`); falha cai para rótulo “Minha Localização (GPS)”. Não há retry/backoff/rate limit.
3. Clique no mapa apenas grava pontos no estado (`:245-257`).
4. Distância/duração são fórmulas euclidianas locais (`:137-148`); a cotação é chamada com esses valores (`:150-163`).
5. Submit valida apenas destino e sessão na UI; envia fallback de nome/telefone, coordenadas e `estimated_price_cents` (`:259-299`).
6. BFF checa débitos do usuário quando há identidade, mas permite identity nula; insere pedido em `orders` (`mobility.functions.ts:308-326,340-413`).

**Conclusão:** quote/pedido têm caminho real de banco, porém a “rota” e o preço final não são verificados server-side e o pedido não é idempotente.

### D. Turismo → itinerary → reserva

1. Index loader chama banners, hotpages e `listPublicTourism` (`_store.turismo.index.tsx:31-45`); query refaz listagem para categoria/pesquisa (`:98-108`).
2. Card navega para `/turismo/$id` (`:347-364`).
3. Detalhe usa `getPublicTourismById` e `getUserSession` (`_store.turismo.$id.tsx:45-51`).
4. O BFF de detalhe devolve `row.itinerary`/`attributes.itinerary` sem coordenadas (`tourism.functions.ts:170-223`); a UI normaliza e exibe timeline se não vazia (`_store.turismo.$id.tsx:76-87,657-660`).
5. Reserva abre após guard de login, mas o BFF não exige identidade (`:89-98`; `tourism.functions.ts:253-255`) e insere voucher/reserva (`:354-389`).
6. Assentos alteram JSON primeiro e espelho depois; falha do espelho é apenas warning (`:313-340`).

**Conclusão:** catálogo/itinerary cadastrado/reserva básica **parciais**; mapa/rota e concorrência **ausentes**.

### E. Chat → Places/quote/itinerary/mobility

1. `StructuredMessageView` aceita payload sem schema runtime forte: `blocks` e `actions` carregam `Record<string, any>` (`structured-message-view.tsx:50-115`).
2. Places, mobility e travel itinerary renderizam cards e chamam `onAction?.` (`:933-945,1067-1089,1164-1187`). Sem callback, o clique não produz efeito.
3. `waesy-copilot-drawer` passa callback e possui alguns cases (`waesy-copilot-drawer.tsx:126-176,370-381`).
4. `_store.copilot` usa `AIChatShell` e passa `onSendMessage`, mas não passa callback de ação ao shell (`_store.copilot.tsx:292-305`). O shell aceita apenas props de envio/threads (`ai-chat-shell.tsx:80-114`).
5. Portanto, o mesmo payload pode funcionar no drawer flutuante e ficar sem efeito no Copilot fullscreen.
6. O drawer navega para `/mobilidade` em `call_ride`, sem transferir origem/destino/preço (`waesy-copilot-drawer.tsx:132-135`), e o quote de viagem usa defaults/fallbacks (`:149-160`).

**Conclusão:** Generative UI é renderização real, mas o contrato de ação é **parcial/ausente por consumidor**.

## Autenticação, autorização e RLS

### Pontos observados

- Turismo público usa `getAnonServerClient` para listagem e detalhe (`tourism.functions.ts:94,173`), portanto o comportamento depende de políticas públicas do Supabase.
- Reserva turística consulta `getCurrentIdentity`, mas captura erro e continua com identidade nula (`tourism.functions.ts:253-255`); o BFF não repete o guard da UI.
- Mobilidade usa `getServerIdentity().catch(() => null)` e grava `customer_id` nulo se não houver sessão (`mobility.functions.ts:308-310,340-342`).
- Mapa social usa `getServerClient` sem `getServerIdentity`/escopo de cidade/tenant (`social.functions.ts:854-887`).
- Detalhe turístico não filtra `status = active`; listar e detalhar possuem contratos de visibilidade diferentes (`tourism.functions.ts:97-105` vs. `175-183`).
- O código auditado não permite certificar RLS final para posts/directory/events/tourism/inquiries/orders. Como o projeto usa cliente server-side e há caminhos de serviço em outros arquivos, a segurança não deve ser inferida somente de `.eq(...)`. É obrigatório testar policies com anon, usuário de outro tenant e service-role/server function.

### Gaps de segurança prioritários

1. Exigir identidade no handler de booking, ou separar explicitamente endpoint guest com consentimento/anti-abuse e limitação.
2. Revalidar no servidor que a experiência está `active`, que a reserva é permitida e que assentos pertencem à experiência.
3. Não aceitar `estimated_price_cents` como preço final; recomputar no BFF a partir de uma rota verificada/tarifa vigente.
4. Definir política e query de cidade/tenant no mapa social; não retornar dados globais quando a UI mostra uma cidade.
5. Exercitar RLS com usuário A tentando ler/escrever reserva, order, post e artefato do usuário B.

## Persistência, idempotência e consistência

- **Mapa:** centro, filtros, seleção e localização são estado React; não há persistência, bookmark de rota ou histórico de lugares em `_store.mapa.tsx:53-167`.
- **Tourism itinerary:** é leitura de JSON/array do registro (`tourism.functions.ts:219`); não há mutation na tela pública para editar/salvar roteiro.
- **Booking:** voucher é um código aleatório de seis dígitos (`tourism.functions.ts:344-348`) sem idempotency key no input. A inserção de `tourism_inquiries` ocorre após update de seats; retry pode duplicar reserva/voucher. Não há transaction/RPC única nem `ON CONFLICT` observável.
- **Seats:** update de `tourism_experiences` não tem condição de versão/status; insert em `trip_seat_reservations` ignora erro. A quantidade de assentos pode divergir de `guestsCount` (`tourism.functions.ts:269-273,310-319,350-369`).
- **Mobility:** `createMobilityRequest` gera novo `magic_token` a cada chamada e insere novo `orders` (`mobility.functions.ts:340-365,409-413`). Não há `client_request_id`, constraint de deduplicação ou retry seguro.
- **Chat:** o shell/composer não fornece idempotency key; o envio limpa o textarea antes do callback e uma repetição pode criar outra mensagem (`src/components/chat/chat-composer.tsx:74-89`). O runtime síncrono de AI não tem transação única para mensagem, resposta, memória e artefato.

## Erros, retries e estados

- Map loader e query transformam falhas em listas vazias (`_store.mapa.tsx:28-39`; `_store.turismo.index.tsx:34-44`), sem diferenciar “sem dados” de “banco/API indisponível”.
- `MapLibreCanvas` apenas `console.warn` em erro de tiles e pode deixar loader visual sem diagnóstico (`maplibre-canvas.tsx:141-146,314-318`).
- Nominatim no browser faz uma tentativa e usa fallback textual (`_store.mobilidade.tsx:194-232`), sem retry/backoff ou limite explícito.
- Reserva mostra toast no erro (`_store.turismo.$id.tsx:135-142`), mas não consegue distinguir falha de assento, duplicidade, pagamento ou persistência parcial.
- Existe botão “Tentar Novamente” no error component de turismo (`_store.turismo.index.tsx:50-63`), mas o loader captura várias falhas e retorna vazio, evitando que o error component seja acionado.
- O chat possui estados `failed`/retry visual em componentes gerais, mas a rota `_store.copilot` não passa `onRetryMessage` nem `onCancelActiveRun` (`_store.copilot.tsx:292-305`).

## Streaming e custo de IA

- `StructuredMessagePayload.telemetry` é opcional e apenas descreve `latency_ms`, `tokens_used` e `model` (`structured-message-view.tsx:106-115`); não é validado nem usado pelo domínio.
- `isStreaming` no shell/view serve para cursor/rolagem; não há endpoint que entregue deltas de roteiro/places/quote nem persistência incremental. O caminho da rota usa `await sendAiConversationMessage`/`executeGuestCopilotMessage` e só então adiciona a mensagem (`_store.copilot.tsx:163-229`).
- O gateway de IA possui telemetria/custo em outro serviço, mas o resultado de domínio não carrega provenance/cost guard para impedir que um itinerary gerado seja confundido com dados de fornecedor. Não há budget/rate-limit específico para ações de mapa/roteiro no recorte.
- Recomendação: registrar `model`, `input_tokens`, `output_tokens`, `cost_usd`, `source_ids`, `synthetic` e `generated_at` no artefato/ação; cobrar/limitar antes do call; não emitir confirmação de reserva/rota com resposta apenas de modelo.

## Dados sintéticos e defaults identificados

1. `social.functions.ts:925-937` — `KNOWN_COORDINATES` fixas de Chapecó usadas para itens sem coordenadas.
2. `social.functions.ts:966-985,990-1021` — live moments, directory listings sem GPS e eventos recebem coordenadas por índice.
3. `_store.mapa.tsx:61-64` — centro default `(-26.7264,-53.5186)` não coincide com o default canônico usado em outros mapas (`-27.1004,-52.6152`), causando viewport inconsistente.
4. `_store.mobilidade.tsx:40-49,95-101,137-148` — origem, presets e estimativas padrão hardcoded.
5. `mobility.functions.ts:215-237,354-365` — tabela de preço fallback fixa, duração calculada por fórmula e token de pedido gerado sem relação com rota real.
6. `waesy-copilot-drawer.tsx:149-160` — origem Chapecó, data flexível, quarto 1 e telefone `49999999999`.
7. `structured-message-view.tsx:1102-1107` — itinerary usa defaults `Destino Turistico`, 3 dias e 2 viajantes quando payload omite campos.
8. `viajante.viagem.$id.tsx:114-253` — PNR, hotel, clima, parcelas, telefones de agência/seguradora/consulado/companhia são constantes; não são dados do id.

Esses valores devem ser marcados como `synthetic`/`default` no contrato ou removidos da experiência de produção. Não devem aparecer como “real”, “em tempo real”, “confirmado” ou “rota calculada”.

## Contratos quebrados e ações sem handler

- **Callback de marker:** `MapLibreCanvasProps.onMarkerClick` recebe `MapMarkerItem` (`maplibre-canvas.tsx:27-33`), mas `_store.mapa` compara o argumento a `m.id` como string (`_store.mapa.tsx:177-180`). Corrigir para `onMarkerClick={(marker) => ... marker.id ...}`.
- **Markers de places:** mesmo corrigindo o tipo, o handler busca somente `moments`; precisa abrir `/places/$placeSlug` ou drawer de local para `kind === "place"`.
- **Events:** adicionar eventos a `mapMarkers` ou remover a promessa do BFF/UI.
- **`category` ignorado:** `getMomentsMap` valida category (`social.functions.ts:848-854`) mas não aplica filtro; a API promete parâmetro que não muda consulta.
- **Ações estruturadas:** `StructuredMessageView` chama callback opcional (`structured-message-view.tsx:1753-1768`); `AIChatShell` não expõe `onActionSelect`/`onActionClick` e `_store.copilot` não conecta dispatcher. Portanto, botões de itinerary/places/mobility podem ser silenciosos no Copilot fullscreen.
- **`call_ride`:** drawer navega para `/mobilidade` sem os dados da ação (`waesy-copilot-drawer.tsx:132-135`); deve abrir a tela pré-populada ou chamar BFF com confirmação.
- **Fallback de ação:** dispatcher trata somente `payload.url` no default (`waesy-copilot-drawer.tsx:272-276`), enquanto outros mappers usam `payload.href`; navegações podem morrer sem feedback.
- **DTO drift de turismo:** `TourismItemDTO` declara campos básicos (`tourism.functions.ts:13-50`), mas detalhe acessa `documentation_notes`/`hotel_policies` (`_store.turismo.$id.tsx:683-700`) sem que esses campos estejam no contrato mostrado; alinhar schema/DTO e validar runtime.
- **Portal do passageiro:** rota declara `id` mas não consulta entidade; links/ações de álbum, emergência e financeiro são somente apresentação.

## Correções recomendadas (ordem de prioridade)

### P0 — segurança e integridade

1. Criar `bookTourismExperience` server-side com `requireIdentity` (ou endpoint guest explicitamente separado), revalidar `status = active`, datas, capacidade e autorização; nunca confiar apenas no guard de UI.
2. Mover reserva de assento para RPC transacional com `SELECT ... FOR UPDATE`/controle de versão, unique `(experience_id, seat_number, active_status)`, criação da inquiry e mirror no mesmo commit; retornar erro de conflito determinístico.
3. Adicionar `idempotency_key` obrigatório a booking, mobility request e ações mutáveis do chat; constraint por usuário/entidade e resposta replayável.
4. Recalcular distância/tempo/preço no servidor a partir de provider de routing configurado; tratar o valor enviado pela UI apenas como preview.
5. Auditar e testar RLS em todas as tabelas (`posts`, `directory_listings`, `events`, `tourism_experiences`, `tourism_inquiries`, `trip_seat_reservations`, `orders`) com anon, usuário sem vínculo, tenant cruzado e staff.

### P1 — contratos funcionais

6. Corrigir `onMarkerClick` para usar `MapMarkerItem`, suportar `kind` e abrir place/event/moment; adicionar events à lista ou retirar a promessa.
7. Fazer `getMomentsMap` receber cidade/lat/lng/bounding box e aplicar `category`; remover `KNOWN_COORDINATES` como fallback de produção. Sem coordenada real, omitir marker e explicar “sem localização”.
8. Conectar `AIChatShell`/`_store.copilot` a um dispatcher tipado; compartilhar o mesmo executor com o drawer. Validar `AIChatAction` por Zod e rejeitar payload sem `source_id`, `href`/`slug` ou confirmação necessária.
9. Fazer `call_ride` transportar payload para a tela de mobilidade (estado/URL assinada) ou abrir confirmação que chama `createMobilityRequest`; não navegar descartando origem/destino.
10. Corrigir `navigate` para aceitar `href` e `url` após allowlist de rotas internas; exibir toast quando ação não tiver handler.
11. Implementar loader real para `viajante.viagem.$id`, com autorização por voucher/usuário e DTO de viagem; remover todos os valores hardcoded ou marcá-los como demonstração fora de produção.

### P2 — confiabilidade, observabilidade e IA

12. Diferenciar `empty`, `forbidden`, `upstream_error` e `db_error` nos DTOs; não transformar indiscriminadamente erro em `[]`/`null`.
13. Implementar retry com backoff somente para falhas transitórias de tiles/geocoding/IA, com timeout e circuit breaker; não repetir mutações sem idempotency key.
14. Entregar streaming real (ou retirar a promessa): deltas assinados, execução persistida, cancelamento e fechamento de estado; não usar apenas cursor `isStreaming`.
15. Anexar provenance/custo de IA e flag `synthetic` a cada bloco/artefato de roteiro; impedir que o modelo invente preço, assento, fornecedor, clima ou posição sem fonte.
16. Criar métricas para p95 de geocoding/routing, erro de tiles, ações sem handler, conflitos de assento, duplicidade de pedidos e custo por geração de itinerary.

## Testes que faltam

1. Teste de contrato TypeScript para `MapLibreCanvas.onMarkerClick` e teste de click de marker `moment`, `place` e `event`.
2. Teste E2E que garante que eventos retornados por `getMomentsMap` aparecem ou que a UI não promete eventos.
3. Teste de filtro `category`, cidade e bounding box do BFF de mapa; verificar que nenhum ponto fora da região é retornado.
4. Teste sem coordenadas reais: marker deve ser omitido, não receber coordenada fixa.
5. Teste de tiles inativos, timeout, erro de provider e recuperação sem spinner infinito.
6. Testes de RLS anon/auth/tenant cruzado para mapa, turismo público, inquiries, seats e orders.
7. Teste concorrente de duas reservas do mesmo assento; uma deve confirmar e a outra receber conflito, sem inquiry órfã.
8. Teste de retry da reserva/mobilidade com a mesma idempotency key; deve retornar a primeira resposta e não criar segunda linha/voucher/order.
9. Teste de preço: alterar `distance_km`/`estimated_price_cents` no request não pode alterar valor final sem cálculo server-side.
10. Teste de sessão ausente chamando diretamente `bookTourismExperience` e `createMobilityRequest`; definir explicitamente se deve rejeitar ou criar fluxo guest controlado.
11. Teste do Copilot fullscreen garantindo callback de `open_place`, `request_travel_quote` e `call_ride`; teste de ação não suportada com feedback visível.
12. Teste de `payload.href` e `payload.url` com allowlist; nenhuma navegação silenciosa.
13. Teste de streaming/cancelamento/reconstrução de execução e retry sem mensagem/artefato duplicado.
14. Teste do portal `/viajante/viagem/$id` com dois IDs diferentes: conteúdo deve mudar a partir do BFF e nunca exibir PNR/hotel/parcelas fixos.
15. Teste de provenance: itinerary gerado sem fonte deve ser rotulado como sugestão/sintético e não permitir reservar como confirmado.

## Alterações realizadas nesta auditoria

Nenhum código de produto foi alterado. Foi criado apenas este relatório em:

`/home/ubuntu/waesy-audit/audits/chat-e2e-domain-04-maps-routing.md`
