# Auditoria E2E — Domínio 03: Ações dinâmicas e tool calling

**Projeto:** Waesy  
**Escopo exato:** UI de mensagens estruturadas e ações tipadas → BFF/server functions → banco/estado → resposta, incluindo busca interna, despacho de ferramentas, autenticação, RLS, persistência, idempotência, erros/retries, streaming, custo de IA e dados sintéticos.  
**Arquivos de entrada:**

- `src/types/chat.ts`
- `src/components/chat/structured-message-view.tsx`
- `src/services/copilot-internal-search.ts`
- `src/components/chat/structured-chat.test.ts`

**Arquivos adicionais lidos para fechar o rastreio:** `src/components/chat/waesy-copilot-drawer.tsx`, `src/components/chat/ai-chat-shell.tsx`, `src/routes/_store.copilot.tsx`, `src/routes/workspace.atendimento.index.tsx`, `src/routes/_store.conta.conversas.$id.tsx`, `src/services/ai-conversations.functions.ts`, `src/services/ai-core-gateway.functions.ts`, `src/services/mcp-server.functions.ts`, `src/registries/mcp-tool-registry.ts`, `src/services/chat.functions.ts`, `src/lib/supabase.ts`, `src/lib/server-access.ts`, `src/services/copilot-execution-persistence.ts`, serviços de carrinho/turismo/JUS/classificados e migrations de chat/IA.

## Veredito executivo

**Status do domínio: PARCIAL, com gaps críticos de produção.** Há uma implementação real para renderizar payloads estruturados, gravar mensagens/artefatos em algumas rotas autenticadas, pesquisar tabelas do catálogo e despachar ferramentas MCP registradas. Porém, a promessa de “ação dinâmica/tool calling ponta a ponta” não é cumprida como um contrato único:

1. A maioria das ações exibidas pela UI não tem handler no único dispatcher do Copilot (`handleDrawerAction`); em três superfícies a UI nem sequer fornece callback.
2. Os cards retornados pela busca interna emitem `navigate` com `payload.href`, mas o dispatcher só trata `payload.url`; portanto, o caminho principal de descoberta → clique → navegação fica quebrado.
3. O pipeline chamado de “tool-calling real” usa, para a maior parte dos intents, JSON produzido por prompt e branches determinísticos. O gateway não envia `tools`/function definitions aos provedores. Só o ramo WebMCP, quando o nome do intent coincide com o registry, executa um handler MCP real.
4. `sendAiConversationMessage` usa cliente Supabase `service_role` e valida somente que a thread existe, sem confirmar que a thread pertence ao usuário/tenant antes de inserir a mensagem e executar IA. Isso é uma lacuna de autorização server-side de alta severidade.
5. Há retornos sintéticos e defaults fixos apresentados como resultados reais: rastreio com UUID aleatório, orçamento de viagem fixo, rota de mobilidade fixa, proposta/arte genéricas e modificadores fictícios. A busca de produtos é real, mas os modificadores não são lidos do banco.
6. O retry visual existe, mas não há retry automático de ação nem idempotency key no contrato de mensagem/tool. Repetições podem duplicar mensagens, artefatos, anúncios, demandas ou chamadas mutáveis.
7. Streaming SSE existe isoladamente no gateway, mas o fluxo Copilot usado pela UI é síncrono; `isStreaming` no componente é apenas cursor visual. Não há persistência/reconstrução de deltas nem fechamento de execução no pipeline principal.

## Classificação das promessas

| Promessa/contrato auditado | Classificação | Evidência e conclusão |
|---|---|---|
| Renderizar mensagens estruturadas e múltiplos blocos | **Real** | `structured-message-view.tsx:50-81, 1563-1750` possui união de blocos e switch de renderização. O teste valida que o componente e os shapes existem (`structured-chat.test.ts:14-17, 19-150`). É renderização, não prova de execução de negócio. |
| Ações tipadas em base de mensagem | **Parcial** | `structured-message-view.tsx:83-115, 1753-1768` gera botões e chama callback opcional. Sem callback, o clique não produz efeito. O union aceita 16 `action_type`, mas não existe schema Zod correspondente; `payload` é `Record<string, any>`. |
| Ações originadas por blocos individuais | **Parcial** | Há `onAction?.(...)` em produto, proposta, carrinho, formulário, enquete, evento, vaga, financeiro, Places, mobilidade, viagem, jurídico, comida e anúncio (`structured-message-view.tsx:259-271, 349-360, 1604-1611, 1641-1669, 606-618, 656-664, 700-711, 744-755, 790-801, 934-945, 1067-1084, 1164-1181, 1263-1280, 1390-1406, 1451-1466`). O dispatch depende do consumidor; a maior parte não chega a um BFF. |
| Copilot drawer executa ações dinâmicas | **Parcial** | `waesy-copilot-drawer.tsx:126-277` trata apenas `open_place`, `call_ride`, `open_checkout`, `request_travel_quote`, `submit_legal_demand`, `publish_ad` e `add_to_cart`; o `default` só navega se existir `payload.url`. Ficam sem tratamento `navigate`, `book_date`, `confirm_proposal`, `execute_vertical_ai`, `submit_form`, `cast_vote`, `rsvp_event`, `apply_job` e `reconcile_entry`. |
| Navegação dos cards da busca interna | **Ausente no caminho do drawer** | `copilot-internal-search.ts:99-104, 122-127, 145-150, 169-174` emite `action_type: "navigate"` e `payload.href`. O drawer não possui `case "navigate"` e procura `payload.url` em `waesy-copilot-drawer.tsx:272-276`. O clique é aceito pela UI, mas termina sem navegação. |
| Ações funcionam em todos os consumidores de StructuredMessageView | **Ausente** | `ai-chat-shell.tsx:499-505`, `workspace.atendimento.index.tsx:823-827` e `_store.conta.conversas.$id.tsx:361-364` passam apenas `payload`/`isStaff`; não passam `onActionSelect` nem `onActionClick`. Nessas superfícies, os botões chamam `onAction?.` com `undefined`. |
| Add to cart efetivo | **Parcial** | O drawer chama `addToCart` (`waesy-copilot-drawer.tsx:247-269`) e o BFF persiste via RPC/fallback (`cart.functions.ts:511-705`) com validação de variante/estoque. Mas o bloco de modificadores envia `selectedModifiers`/`totalPriceCents` (`structured-message-view.tsx:1395-1405`), enquanto o drawer descarta tudo e envia somente `productId` e `quantity` (`waesy-copilot-drawer.tsx:248-259`). O BFF escolhe a primeira variante (`cart.functions.ts:521-533`), portanto não preserva a seleção feita pelo usuário. |
| Solicitar orçamento de viagem | **Parcial** | O clique chama `requestTravelQuote` e navega para turismo (`waesy-copilot-drawer.tsx:140-177`). O contrato usa destino do payload, porém fixa origem `Chapecó`, `rooms_count`, datas flexíveis e telefone fallback `49999999999` (`waesy-copilot-drawer.tsx:147-160`). O serviço de turismo possui inserts reais, mas esse dispatcher não coleta data/nome/telefone de forma confiável nem prova cotação final. |
| Encaminhar demanda jurídica | **Parcial/real no efeito BFF** | `waesy-copilot-drawer.tsx:179-216` chama `createJusDemand`; `jus.functions.ts` exige identidade e insere em `jus_demands`. A ação persiste uma demanda, mas usa cidade/estado fixos (`Chapecó`, `SC`) e `documents: []` (`waesy-copilot-drawer.tsx:190-200`), mesmo quando o card deveria refletir contexto do usuário. |
| Publicar anúncio | **Parcial** | O drawer chama `upsertClassified` e só informa título, categoria `sale`, conteúdo e preço zero (`waesy-copilot-drawer.tsx:218-245`). O serviço de classificados exige identidade e tem persistência, mas o botão da UI diz “publicar” enquanto o fluxo pode ser apenas upsert/rascunho e não há confirmação de status de publicação. Não há idempotency key. |
| Chamar corrida | **Ausente como chamada de corrida** | `structured-message-view.tsx:1067-1084` emite origem, destino, modal e preço estimado; `waesy-copilot-drawer.tsx:132-135` apenas fecha e navega para `/mobilidade`. Não cria quote, reserva ou ride. |
| Confirmar proposta/pagamento/agendamento | **Ausente** | `commerce_appointment` e `commerce_quote` mapeiam seus botões para `confirm_proposal` (`structured-message-view.tsx:1641-1648, 1663-1669`), mas não há case no drawer nem callback nas outras telas. Não existe BFF ligado a esse action type neste caminho. |
| Formulário/enquete/RSVP/candidatura/conciliacão/IA vertical | **Ausente** | A UI gera `submit_form`, `cast_vote`, `rsvp_event`, `apply_job`, `reconcile_entry`, `execute_vertical_ai` (`structured-message-view.tsx:606-664, 700-801`); não há handler correspondente no drawer nem nos demais consumidores. |
| Busca interna em dados persistidos | **Parcial** | `copilot-internal-search.ts:178-206` consulta tabelas reais e filtra status; `ai-conversations.functions.ts:612-674` retorna `card_carousel` com provenance. Porém usa `select("*").limit(24)` e filtra em memória, sem filtro textual no banco, podendo perder resultados após os 24 primeiros e sobrecarregar/expor colunas desnecessárias. |
| Provenance e dados não inventados na busca interna | **Parcial** | O resultado marca `source: "platform"` e inclui `source_table/source_id` (`copilot-internal-search.ts:25-32, 226-233`). O caminho é verificável quando há card. Já os branches seguintes do pipeline geram defaults sintéticos mesmo após ausência de dados; a promessa global de não inventar não é mantida. |
| Tool calling real no Copilot | **Parcial** | O pipeline chama `executeAiCoreGateway` com `responseFormat: json_object` e depois lê `intent/tool_args` (`ai-conversations.functions.ts:688-759`), mas `AIGatewayRequest` e as requisições HTTP do gateway não têm `tools`/function declarations (`ai-core-gateway.functions.ts:30-55, 257-423`). O despacho MCP (`ai-conversations.functions.ts:858-961`) é real apenas quando `tool_name`/intent coincide com `MCP_TOOL_REGISTRY`; os intents principais (`search_places`, `estimate_mobility`, `search_catalog`, `travel_itinerary`, etc.) não são nomes canônicos do registry, que usa, por exemplo, `search_catalog_products` (`mcp-tool-registry.ts:68-129`). |
| Segurança de prompt | **Real/Parcial** | `ai-conversations.functions.ts:535-560` e `ai-core-gateway.functions.ts:440-470` fazem Prompt Shield/sandboxing. Isso protege contra algumas injeções, mas não substitui autorização de thread nem validação de payload de ação. |
| Autenticação de leitura/envio de chat tradicional | **Real com escopos diferentes** | `chat.functions.ts:217-250, 255-327` exige identidade e filtra thread por `store_id`; o customer flow verifica `thread.customer_id === user.id` (`chat.functions.ts:403-428, 468-515`). |
| Autorização do Copilot autenticado | **Ausente/crítica no envio** | `getServerClient()` é `service_role` e bypassa RLS (`src/lib/supabase.ts:125-160`). `sendAiConversationMessage` valida identidade (`ai-conversations.functions.ts:1695-1700`), mas após carregar a thread (`1702-1711`) não compara `customer_id`, `recipient_profile_id`, membership ou acesso à loja antes de inserir mensagem/rodar IA (`1713-1830`). A leitura (`1617-1683`) tem check de acesso, mas o POST não. |
| RLS de chat | **Real no banco, insuficiente como compensação** | `0016_chat_team.sql:23-37, 52-69` habilita RLS e cria policies para customer/staff; `20261215000000_ai_chat_shell_artifacts_and_projects.sql:46-95` protege artifacts; `20270101010000_copilot_react_execution_persistence.sql:52-67` protege execuções/steps. Como os BFFs usam `service_role`, os checks de aplicação continuam obrigatórios e estão ausentes no envio Copilot. |
| Persistência da conversa Copilot | **Real/Parcial** | O POST grava mensagem do usuário, resposta AI, payload estruturado, toolCalls, FSM e atualiza working memory (`ai-conversations.functions.ts:1713-1848`). Artefato é inserido em `chat_artifacts` (`1768-1793`). Porém o drawer flutuante mantém mensagens apenas em `useState` (`waesy-copilot-drawer.tsx:67-123`) e o guest endpoint não grava thread/mensagem (`ai-conversations.functions.ts:1969-1989`). |
| Persistência de execução ReAct/realtime | **Parcial/ausente no caminho principal** | Existem tabelas e helper (`20270101010000_copilot_react_execution_persistence.sql:4-79`, `copilot-execution-persistence.ts:33-72`) e `AIActivityTrail` assina realtime. Contudo `executeAiCopilotPipeline` não chama `startCopilotExecution`, `persistCopilotExecutionStep` ou `completeCopilotExecution`; apenas a tarefa autônoma usa `taskId`/steps em alguns ramos. `executionId` pode ficar indefinido, logo o trail não tem canal persistido para a maioria das respostas. |
| Idempotência de mensagem/ação/tool | **Ausente** | `sendAiMessageSchema` não possui request/action idempotency key (`ai-conversations.functions.ts:53-61`). Cada POST insere nova mensagem de usuário e nova resposta (`1713-1821`); `startTime` é usado na chave do tollbooth (`731-741`), portanto uma nova tentativa gera outra chave. O registry apenas declara `idempotent` (`mcp-tool-registry.ts:43-58`); `McpToolCallRequestSchema` não recebe idempotency key (`mcp-server.functions.ts:520-531`) e o dispatcher não deduplica mutações. |
| Erros e retry | **Parcial** | Há timeout de 45s e wrapper defensivo (`ai-conversations.functions.ts:512-520, 1732-1765`), FSM `FAILED_RETRYABLE` e botão visual no componente (`structured-message-view.tsx:1507-1528`). O retry é delegado ao consumidor, não há retry automático com backoff por provider/tool, e uma repetição de POST pode duplicar efeitos. Erros de `searchPlatformForCopilot` são convertidos em tabela indisponível e o pipeline pode seguir com fallback (`copilot-internal-search.ts:187-191`, `ai-conversations.functions.ts:754-759`), sem distinguir claramente “sem dado” de “falha de autorização/banco”. |
| Streaming de resposta | **Parcial, não E2E** | O gateway possui SSE (`ai-core-gateway.functions.ts:926-986`), mas o Copilot chama o modo síncrono sem `mode: "stream"` (`ai-conversations.functions.ts:714-743`), grava a resposta somente no final e as telas só exibem cursor se `isStreaming` (`structured-message-view.tsx:1551-1559`). Não há server function de conversa que entregue deltas, nem persistência atômica de stream. |
| Custo/FinOps da IA | **Parcial** | Gateway calcula custo por provider/model e grava `ai_telemetry_logs` (`ai-core-gateway.functions.ts:652-729`), e há cobrança estimada via tollbooth no store flow (`ai-conversations.functions.ts:731-741`). Porém o resultado do gateway/metadata não é propagado ao `AIActivityStep.costUsd` nem ao `AiExecutionResult`; steps usam números hardcoded (`ai-conversations.functions.ts:597-607, 976, 1043, 1107, 1167, 1211, 1250, 1334, 1398, 1474`). O guest flow não passa pelo tollbooth e não possui rate limit visível neste caminho. |
| Dados sintéticos identificáveis como sintéticos | **Ausente** | O pipeline retorna UUID aleatório e pedido/rastreamento fixos (`ai-conversations.functions.ts:353-380`), rota default fixa para mobilidade (`1046-1084`), itinerário e orçamento default (`1110-1147`), fatos/documentos jurídicos genéricos (`1170-1188`), anúncio genérico (`1214-1230`), proposta/planilha default (`1337-1361, 1424-1468`). Essas respostas são exibidas como “consultei”, “calculei” ou “criei”, sem flag `synthetic`/`confidence`/`source` que impeça confusão com dado real. |

## Rastreio E2E por caminho

### A. Busca interna → card → clique

1. `executeAiCopilotPipeline` chama `shouldSearchPlatform` e `searchPlatformForCopilot` (`ai-conversations.functions.ts:612-633`).
2. `searchPlatformForCopilot` lê `products`, `directory_listings/stores`, `events`, `classifieds` via `searchTable` (`copilot-internal-search.ts:178-206, 216-224`). O mapper cria cards com `source_table/source_id` e ação `navigate`/`add_to_cart`/`rsvp_event` (`86-176`).
3. O pipeline devolve `structuredPayload.blocks[0] = card_carousel` (`ai-conversations.functions.ts:636-674`).
4. A UI renderiza `CardCarouselBlock` e chama `onAction(item.action)` (`structured-message-view.tsx:453-521`).
5. No drawer, `handleDrawerAction` recebe a ação, mas não trata `navigate` e só tenta `payload.url` (`waesy-copilot-drawer.tsx:126-140, 272-276`). Como o mapper usa `href`, o fluxo termina sem resposta/navegação. Em atendimento, shell e conversa de loja nem existe callback. **Contrato quebrado confirmado.**

### B. Produto/card de modificadores → carrinho

1. Produto pode vir da busca interna ou do branch `search_catalog`. O branch consulta produtos ativos no banco (`ai-conversations.functions.ts:1239-1267`) e monta modificadores hardcoded (`1271-1305`).
2. `FoodModifierSelectorBlock` mantém seleção apenas em estado React (`structured-message-view.tsx:1306-1335`) e emite `selectedModifiers`, `totalPriceCents` (`1390-1406`).
3. Drawer reduz isso a `{productId, quantity}` e chama `addToCart` (`waesy-copilot-drawer.tsx:247-269`).
4. O BFF resolve primeira variante e valida estoque via RPC/fallback (`cart.functions.ts:521-629`), recalcula preço de options somente se `options` chegar (`631-689`). Como o drawer não envia `options`, seleção e preço apresentados não são os persistidos. **Contrato parcialmente quebrado.**

### C. Tool/intent IA → BFF → estado/resposta

1. A pipeline faz Prompt Shield, busca interna, depois envia um prompt JSON ao gateway (`ai-conversations.functions.ts:678-743`).
2. O gateway faz cache SHA-256, deduplicação de requests idênticos em memória, cascata de providers, circuit breaker, sanitização e telemetria (`ai-core-gateway.functions.ts:472-530, 597-799`). Isso é infraestrutura real.
3. O pipeline interpreta `gatewayResponse.intent/tool_args` e executa branches locais. Muitos branches não consultam a fonte correspondente: mobilidade calcula preço; turismo monta roteiro; jurídico inventa fatos; anúncio cria copy; proposta/planilha criam artefatos locais. **Não são tool calls reais apesar do texto de atividade.**
4. Se `intent` coincidir com chave do registry, `executeMcpToolCall` valida rate limit, tenant (para staff/admin), Zod e chama handler real (`ai-conversations.functions.ts:858-961`; `mcp-server.functions.ts:306-517`). Esse ramo é a parte real do tool calling, mas não cobre os intents documentados no system prompt.
5. A resposta é persistida somente no fluxo autenticado de `sendAiConversationMessage`; o endpoint guest retorna em memória (`ai-conversations.functions.ts:1692-1848, 1976-1989`).

### D. UI de mensagens estruturadas de atendimento/cliente

`workspace.atendimento.index.tsx:806-833` e `_store.conta.conversas.$id.tsx:348-375` detectam `structured_blocks`, renderizam o componente e mostram a mensagem, mas não conectam o dispatcher. `ai-chat-shell.tsx:498-505` tem o mesmo problema. Portanto esses caminhos têm **apresentação real e mutação ausente**.

## Autenticação, tenant e RLS

- **Ponto positivo:** funções tradicionais de staff/customer verificam identidade e tenant (`chat.functions.ts:217-250, 255-327, 403-428, 468-515`). MCP exige `storeId` para tiers restritos, chama `getServerIdentity` e `assertStoreAccess` (`mcp-server.functions.ts:354-430`).
- **Gap crítico:** todos os handlers relevantes usam `getServerClient` com `SUPABASE_SERVICE_ROLE_KEY` (`src/lib/supabase.ts:140-160`). Em `sendAiConversationMessage`, a thread é buscada apenas por UUID (`ai-conversations.functions.ts:1702-1711`); não há `customer_id`, `recipient_profile_id`, membership ou `assertStoreAccess`. Um usuário autenticado que conheça outro UUID pode escrever e disparar processamento nessa thread. O mesmo padrão aparece em `createAiConversationThread`, que aceita `data.storeId` sem validar acesso ao store (`1580-1604`), e em `saveAiChatArtifact`, que não verifica que `threadId` pertence ao caller (`1855-1885`).
- **RLS existente não corrige o BFF service-role:** as migrations habilitam policies para chat e artifacts (`0016_chat_team.sql:23-69`, `20261215000000...sql:46-95`), mas elas são bypassadas pelo cliente server-role. É necessário manter checks explícitos no BFF ou propagar sessão para um client que respeite RLS.
- **Busca interna:** executa com service-role e faz `select("*")` nas tabelas públicas. Há filtro de status, mas não há projeção mínima nem limite textual no banco (`copilot-internal-search.ts:178-206`).
- **MCP público:** rate limit usa `arguments.clientIp` ou `authToken` fornecidos pela requisição (`mcp-server.functions.ts:324-332`); ambos são valores controláveis pelo chamador neste contrato, portanto não são uma identidade forte. Não foi encontrado mecanismo de autenticação obrigatório para tiers públicos, o que pode ser intencional, mas deve ser acompanhado de IP real no edge.

## Persistência, estado e idempotência

- Mensagens autenticadas do Copilot, payload de ações/steps, memória e artefatos são persistidos em `chat_messages`, `chat_threads` e `chat_artifacts` (`ai-conversations.functions.ts:1713-1848`).
- Mensagens no drawer global são somente `useState` e desaparecem ao desmontar/fechar/recarregar (`waesy-copilot-drawer.tsx:67-123`).
- Seleções de modal de mobilidade e modificadores são estado local, sem confirmação persistida (`structured-message-view.tsx:989-1046, 1306-1335`).
- O registry marca ferramentas como `idempotent`, mas não transforma isso em enforcement. Não existe `action_id`, `idempotency_key`, unique constraint ou tabela de receipts no contrato de `McpToolCallRequest` (`mcp-server.functions.ts:47-52, 520-531`).
- `sendAiConversationMessage` insere a mensagem do usuário antes da execução e, em seguida, insere a resposta. Uma falha entre esses pontos deixa estado parcial. Não há transação/RPC envolvendo user message, AI message, artifact e working memory (`ai-conversations.functions.ts:1713-1830`).
- A persistência de execution/steps existe no schema e helper, mas não é conectada ao pipeline síncrono normal; `executionId` é opcional e frequentemente indefinido (`ai-conversations.functions.ts:783-786, 1497`; `copilot-execution-persistence.ts:33-72`).

## Erros, retries e streaming

- **Erros reais:** gateway possui timeout por provider, fallback em cascata, circuit breaker e telemetria; pipeline possui timeout externo de 45s e FSM de falha (`ai-core-gateway.functions.ts:238-252, 606-740`; `ai-conversations.functions.ts:512-520, 1732-1765`).
- **Retry insuficiente:** o botão de retry (`structured-message-view.tsx:1507-1528`) só chama callback fornecido; nos três consumidores principais não há callback de ação e não há contrato de retry para mensagens Copilot no componente. Reenvio manual repete inserts e efeitos sem idempotência.
- **Streaming incompleto:** `executeAiCoreGatewayStream` faz leitura SSE e chama `onDelta`, mas não é usado por `executeAiCopilotPipeline` e não grava `ai_telemetry_logs`/resposta final com usage/cost. No componente, `isStreaming` apenas desenha um cursor (`structured-message-view.tsx:1551-1559`).
- **Erro mascarado:** `searchTable` marca qualquer erro como `unavailable` e o pipeline pode continuar para IA/fallback; UI não diferencia zero resultado, tabela ausente e falha de autorização (`copilot-internal-search.ts:187-191, 226-232`).

## Custo de IA e observabilidade

- O gateway calcula preço por provider/model (`ai-core-gateway.functions.ts:93-114`) e grava tokens/custo/latência/fallback em `ai_telemetry_logs` (`652-729`); há cache de resposta e deduplicação in-flight (`472-530`).
- O Copilot estima tokens pelo comprimento do prompt e debita tollbooth somente quando `context.storeId` existe (`ai-conversations.functions.ts:731-743`). Essa estimativa não é reconciliada com usage real do provider; retries/fallbacks podem ter custos múltiplos, enquanto a resposta final não expõe o custo real.
- `AIActivityStep` suporta `tokensUsed`/`costUsd` (`src/types/chat.ts:24-36`), mas os steps do pipeline têm números fixos e não recebem `gatewayResponse.metadata.usage/costUsd`. Isso torna a Activity Trail e o FinOps divergentes.
- O guest endpoint não passa pelo tollbooth (`ai-conversations.functions.ts:1976-1989`) e não há rate limit específico no caminho auditado; custo/abuso ficam sem guarda equivalente.

## Dados sintéticos e contratos de verdade

Os seguintes trechos devem ser considerados **dados demo/sintéticos ou defaults não comprovados**, não resultados reais:

- pedido/rastreio: `crypto.randomUUID()`, número `WSY-BR-9842`, endereço e courier fixos (`ai-conversations.functions.ts:353-374`);
- agendamento/proposta no motor legado: IDs aleatórios e valores/nomes fixos (`ai-conversations.functions.ts:190-224, 400-420`);
- mobilidade: origem/destino default, distância `4.2` e tarifas calculadas sem serviço de mobilidade (`1046-1084`);
- turismo: destino Serra Gaúcha, roteiro de três dias e orçamento `289000` quando o modelo não fornece argumentos (`1110-1147`);
- jurídico: fatos/documentos genéricos e cidade fixa no handler (`1170-1195`; `waesy-copilot-drawer.tsx:190-200`);
- anúncio: copy genérica e preço zero (`1214-1234`; `218-245`);
- comida: modificadores “Padrão/Especial/Adicional Especial/Embalagem” inventados em vez de consultados (`1271-1305`);
- planilha/proposta: valores e linhas predefinidos (`1337-1361, 1424-1468`).

A recomendação é sinalizar `source: "synthetic"`/`is_estimate: true`, impedir CTA mutável para dados não confirmados e exigir fonte/ID persistido antes de frases como “consultei”, “estoque confirmado”, “pedido em rota” ou “publicar”.

## Testes e lacunas de cobertura

O teste indicado (`src/components/chat/structured-chat.test.ts`) cobre shape/enum, não o comportamento:

- Asserções de ação apenas verificam que o objeto aceita `action_type` (`35-65, 67-95, 205-233, 268-300, 302-330, 333-346`); não renderizam o componente, não clicam em botão e não verificam que um BFF foi chamado.
- O teste de cinco estados apenas verifica props em objetos locais (`362-386`); não verifica loading/stream/error/empty em DOM.
- Não há teste para `handleDrawerAction`, `href` versus `url`, nem para consumidores sem callback.
- Não há teste E2E UI → BFF → banco para produto/modificador, viagem, JUS, anúncio, proposta, RSVP, candidatura, conciliação ou corrida.
- Não há teste de autorização negativa de `sendAiConversationMessage` com UUID de thread de outro usuário; nem de `createAiConversationThread(storeId alheio)`/`saveAiChatArtifact(thread alheia)`.
- Não há teste de idempotência/replay, partial failure, retry/backoff, timeout, stream abort/reconnect, provider fallback com custo, ou guest abuse/rate limit.
- Os testes MCP (`src/services/mcp-server.test.ts:63-167`) cobrem registry, schema, missing storeId e alguns handlers, mas não cobrem replay de mutações, caller identity real, RLS com service-role, nem a ponte intent → MCP.
- A tentativa de executar `pnpm vitest run src/components/chat/structured-chat.test.ts --reporter=dot` foi bloqueada pelo ambiente antes da execução: o `pnpm` tentou instalar/aprovar builds ignorados (`ERR_PNPM_IGNORED_BUILDS` para `@parcel/watcher`, `esbuild` etc.). Portanto não há verificação de pass/fail runtime deste teste nesta auditoria.

## Gaps críticos priorizados

1. **P0 — Corrigir autorização de `sendAiConversationMessage`:** carregar `customer_id`, `recipient_profile_id`, `store_id`/membership e negar antes de qualquer insert/pipeline; aplicar o mesmo vínculo a create-thread e save-artifact. Como `getServerClient` é service-role, não confiar em RLS.
2. **P0 — Fechar o contrato de ações:** centralizar um dispatcher server-side/client-side tipado; tratar explicitamente todos os 16 action types ou remover da união tudo que não tem implementação. Nunca renderizar CTA mutável com callback opcional silenciosamente nulo.
3. **P0 — Corrigir `href`/`url` e navegação:** escolher um único campo, validar rotas permitidas e testar `card_carousel` real com produto/loja/evento/classificado.
4. **P0 — Remover ou marcar dados sintéticos:** rastreio/corrida/viagem/proposta/anúncio/modificadores só devem usar fonte persistida; defaults devem ser explicitamente estimativas/demonstração e não gerar mutação.
5. **P1 — Implementar idempotência:** `idempotency_key` obrigatório para mensagens e ações mutáveis; unique por `(actor, action, key)`, receipts/status e replay seguro; envolver persistência de user message/AI response/artifact/memory em RPC/transação ou saga compensável.
6. **P1 — Alinhar tool calling:** usar native function/tool schemas no gateway ou renomear honestamente para “intent dispatch”; mapear intents do prompt para nomes do `MCP_TOOL_REGISTRY` e validar output com Zod antes de executar.
7. **P1 — Integrar streaming de verdade:** server function SSE/WebSocket com abort/reconnect, deltas, estado final e custo/usage persistidos; conectar `startCopilotExecution`/`persistCopilotExecutionStep`/`completeCopilotExecution` ao caminho normal.
8. **P1 — Reconciliar custo:** propagar usage/cost real para steps/result, cobrar por uso real ou reconciliar estimate, registrar guest calls/rate limits e evitar duplicação de custo em retry.
9. **P2 — Corrigir busca:** projetar colunas explicitamente, aplicar filtro textual/FTS no banco, sanitizar todos os filtros PostgREST (inclusive `ai-conversations.functions.ts:1260-1264`) e separar `unavailable` de `empty`/`forbidden`.
10. **P2 — Testar E2E/segurança:** cobertura de DOM click, dispatcher, BFF mockado, Supabase policy/ownership, replay, failure injection, stream e dados sintéticos.

## Recomendações de código concretas

```ts
// Contrato único de ação (exemplo mínimo)
export const ChatActionSchema = z.object({
  id: z.string().min(1),
  action_type: z.enum([...]),
  payload: z.record(z.unknown()),
  idempotency_key: z.string().uuid(),
  source: z.enum(["model", "platform_search", "user"]),
});
```

- Tornar `onActionSelect` obrigatório nas superfícies que renderizam CTAs, ou renderizar botão desabilitado com motivo explícito quando não houver executor.
- Criar `executeChatAction(action, context)` em server function, com autorização por ação, schema específico por `action_type`, `idempotency_key`, auditoria e resposta `{ok, status, entityId, message}`. O drawer e atendimento devem apenas chamar esse executor e atualizar a UI pelo resultado.
- Tratar `navigate` como rota allowlisted (`href` canonical) e nunca aceitar URL externa arbitrária no fallback.
- Para produto/comida, transportar `variantId`, `options` e `storeId`; revalidar preço/estoque no BFF e devolver o snapshot efetivamente persistido.
- Para corrida, proposta, RSVP, job e reconciliação, ligar cada action type ao serviço existente (ou retirar CTA); não usar `confirm_proposal` como substituto genérico de pagamento/agendamento.
- No pipeline, separar `platformSearch`, `mcpTool`, `deterministic_estimate` e `synthetic_demo` em tipos de resposta distintos; bloquear ações mutáveis quando a origem for estimate/synthetic.
- Alterar o gateway para aceitar schemas native `tools` e retornar tool call estruturada; validar `intent/tool_args` com Zod antes do branch.
- Criar uma execução persistida no início do Copilot, gravar cada step real com tokens/custo e concluir em sucesso/falha; a UI deve assinar apenas `executionId` existente.

## Fixes implementados nesta auditoria

**Nenhum.** Auditoria somente leitura; nenhum arquivo de produto foi alterado. O único artefato produzido é este relatório.

## Conclusão

A base tem bons componentes de infraestrutura — tipos de activity trail, RLS declarativo, service functions, registry MCP com Zod/rate limit/auditoria, gateway com cache/fallback/circuit breaker e persistência parcial de chat. Contudo, a camada de ação dinâmica está desacoplada do BFF: a UI promete mais action types do que os consumidores executam, a busca retorna um campo de navegação incompatível, o caminho Copilot usa service-role sem ownership check e vários resultados “reais” são defaults sintéticos. O domínio deve ser classificado como **parcial** até que os gaps P0 sejam resolvidos e comprovados por testes E2E com banco/tenant isolado.
