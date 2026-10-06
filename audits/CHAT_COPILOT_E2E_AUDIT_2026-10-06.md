# Auditoria E2E consolidada — Chat/Copilot

**Data:** 2026-10-06  
**Escopo:** consolidação dos seis relatórios de auditoria fornecidos.  
**Método:** somente consolidação dos achados, evidências, correções e lacunas de teste registradas pelos auditores; **não houve nova auditoria nem inferência de implementação não evidenciada**.

## 1. Resumo executivo

O produto tem um **caminho funcional parcial** para chat autenticado, histórico, execução síncrona de IA, artefatos e algumas experiências de mapa/Builder. Entretanto, o estado E2E não é liberável para produção: a fronteira de autorização é insuficiente quando o BFF usa `service_role`, a persistência de mensagens/execução/artefatos/memória não é atômica nem idempotente, várias promessas da UI não têm handler efetivo, e dados sintéticos/defaults aparecem como se fossem dados reais.

Os riscos mais graves são:

1. **Cross-tenant / IDOR:** `sendAiConversationMessage`, criação de thread e salvamento de artefato não comprovam ownership/membership antes de operar com service role; há também mutações de thread, RMA, execução e artefatos sem escopo uniforme.
2. **Integridade e cobrança:** retries podem duplicar mensagens, efeitos e cobrança; a chave baseada em `startTime` muda a cada retry; fluxo AI não é transacional; falhas podem ser persistidas como `delivered` ou deixar passos `running`.
3. **Ações falsas ou sem efeito:** action types e CTAs são declarados/renderizados, mas o caminho fullscreen não conecta callbacks; o drawer cobre apenas parte deles; `href` e `url` divergem; retry/cancel/pin/archive aparecem sem handler efetivo.
4. **Dados não verificáveis:** coordenadas, preços, duração, catálogo, Places, turismo, jurídico, financeiro, anúncios, propostas, contatos e portal do viajante têm defaults/fórmulas/presets sintéticos sem marcação consistente.
5. **Streaming/FSM/retomada incompletos:** há SSE isolado e scaffolding de FSM/ReAct, mas o caminho principal é síncrono; não há cancelamento propagado ao provider, loop ReAct completo, aprovação humana, resume E2E ou persistência confiável de todos os steps.
6. **Builder/exportação incompletos:** o caminho principal abre inspetor local em vez da rota Builder; o gerador grava `omni_page` em `settings`, enquanto o leitor espera `experience_versions/experience_nodes`; exportações são HTML/print/JSON, não PDF/PNG/PPTX reais.

**Conclusão:** estado global **reprovado parcial, com falhas críticas (P0)**. O produto não deve apresentar os resultados sintéticos como reais nem permitir operações/mutações antes de fechar autorização, proveniência e integridade.

---

## 2. Mapa UI → BFF → banco/estado → resposta

### 2.1 Fluxo principal do chat autenticado

```text
AIChatShell / ChatComposer
  └─ onSendMessage(text, [], replyId)  [anexo não é passado; replyId é descartado no handler]
      └─ rota _store.copilot / sendAiConversationMessage
          ├─ autentica identidade, mas não comprova acesso à thread/tenant
          ├─ lê thread por UUID e usa service_role/bypass RLS
          ├─ tollbooth somente quando context.storeId existe
          ├─ executa pipeline AI síncrono; aguarda resposta final
          └─ grava, em operações independentes:
              user message → AI response → chat artifact → working_memory
                  └─ resposta para a UI; falhas parciais podem ser ignoradas
```

**Componentes/evidências:** `ai-chat-shell.tsx`, `chat-composer.tsx`, `_store.copilot.tsx`, `ai-conversations.functions.ts`, `supabase.ts`.

### 2.2 Histórico, threads e Projetos

```text
_store.copilot
  ├─ lista/cria/deleta threads
  ├─ recarrega mensagens/artefatos
  └─ envia mensagem
      └─ BFF get/create/send conversation
          └─ chat_threads + chat_messages + chat_artifacts + working_memory
```

O histórico autenticado é persistido e recuperável, mas não há autorização de ownership/membership uniforme, paginação/cursor nem DTO completo (`last_message_snippet`, `last_message_at` etc.). O guest usa `DEFAULT_GUEST_THREAD_ID` e estado local, sem histórico persistente. O modelo UI mistura `project` e `ai_assistant`; a memória soberana/curada existe em funções isoladas, mas não está integrada ao pipeline de Projeto.

### 2.3 Copilot, ações e ferramentas

```text
StructuredMessageView / Drawer / ChatShell
  └─ payload action_type + payload genérico
      ├─ drawer: somente parte dos action_types
      ├─ fullscreen: callbacks de ação não conectados
      ├─ busca interna: produz payload.href
      └─ drawer: procura payload.url  → contrato quebrado
          └─ BFF / dispatcher inexistente como contrato único
              └─ ramo MCP real apenas em parte do pipeline
```

O gateway recebe JSON de intent/tool args; não há declarações de native tools/function calling no caminho principal. O ReAct genérico só é usado pelo adaptador de scraping, não pelo pipeline Copilot completo.

### 2.4 SSE e execução

```text
/api/ai/stream
  └─ autentica/rate-limits e pode criar stream isolado
      ├─ não é consumido pela UI principal
      ├─ não persiste nem cobra de forma integrada
      ├─ cancel() não aborta provider
      └─ gateway não propaga timeout/signal e reporta usage/costUsd zero

Pipeline normal
  └─ executeAiCopilotPipeline / sendAiConversationMessage
      └─ modo síncrono, sem deltas persistidos, sem cancelamento E2E
```

### 2.5 Mapas, locais, mobilidade e turismo

```text
_store.mapa → getMomentsMap → MapLibreCanvas → markers
                                      ├─ moments/places; events retornados não são renderizados
                                      ├─ coordenadas fixas por índice/KNOWN_COORDINATES
                                      └─ callback objeto vs UI espera ID string

_store.mobilidade → BFF mobility
  └─ orders; distance/price aceitos do caller; sem rota/geometry real/idempotência

_store.turismo / booking → BFF tourism
  └─ lista pública e booking parcial; assentos, espelho, voucher e inquiry não são atômicos
```

### 2.6 Artefatos, Builder e exportações

```text
ChatArtifactCard
  ├─ onOpenBuilder → AIChatShell seleciona artifact e abre painel/Sheet
  ├─ sem callback → /workspace/builder (caminho que não é o principal)
  └─ onExport/onViewVersions não conectados

AI composition BFF
  └─ document.settings.omni_page
      ≠ Builder reader: experience_versions + experience_nodes
          └─ draft pode ficar vazio; save/publish são sequências sem transação/lock

Export
  ├─ CSV local/data URI
  ├─ window.print / HTML PDF-ready
  └─ HTML/JSON; não há PDF/PNG/PPTX binários reais
```

### 2.7 Camadas de persistência e controle transversal

| Camada | Estado observado | Risco principal |
|---|---|---|
| UI | Muitas affordances existem visualmente; callbacks ausentes ou parciais | Ação silenciosa, contrato enganoso |
| BFF | Funções de chat, threads, artefatos, mobilidade, turismo, Builder e SSE existem | Service role sem autorização de objeto; inputs/defaults não confiáveis |
| IA/gateway | Cache, dedupe in-flight, fallback, circuit breaker e telemetry existem no gateway | Cache sem tenant; custo/usage estimados ou zero; fallback após deltas |
| Banco/RLS | Tabelas e policies existem em migrations | RLS não foi certificado em runtime; `store_id IS NULL` permissivo; policies não substituem checks BFF |
| Outbox/transaction | Não comprovados no fluxo de chat/booking/Builder | Órfãos, duplicidade, oversell, cobrança repetida |
| Proveniência | `synthetic/source_ids/estimated` não são obrigatórios | Dados demo apresentados como reais |

---

## 3. Estado real por capacidade

| Capacidade | Estado real consolidado | Classificação |
|---|---|---|
| Chat autenticado síncrono | Existe UI, BFF, execução e persistência básica; thread é lida por UUID sem ownership/membership comprovados; pipeline aguarda resposta final | **Parcial / bloqueado para produção** |
| Chat guest | Endpoint local/guest existe; não exige identidade, não passa tollbooth e não tem rate-limit/quota observável; histórico é local | **Parcial crítico** |
| Histórico e threads | List/get/create/delete e recuperação de mensagens/artefatos existem; guest não persiste; DTO e paginação são incompletos; ações de pin/archive não estão conectadas | **Parcial** |
| Autorização de thread/tenant | Autenticação existe, mas checks de objeto/tenant/papel não são uniformes; `getServerClient` usa service role/bypass RLS | **Não comprovada / P0** |
| Persistência AI | Mensagem, resposta, artefato e memória são gravados em operações separadas; erros de artefato/memória podem ser ignorados; falha pode aparecer como `delivered` | **Insegura / P0-P1** |
| Idempotência e cobrança | Tollbooth ACID e idempotency existem em função isolada, mas envio usa chave `copilot_${threadId}_${startTime}`; guest/SSE não têm cobrança consistente; retries podem duplicar | **Incompleta / P0-P1** |
| Streaming SSE | Rota/gateway isolados existem; UI principal não consome; não persiste/cobra integrado; abort não chega ao provider | **Não entregue E2E** |
| Cancelamento | Prop/UI existe em `AIChatShell`, mas rota não passa handler e timeout não aborta provider | **Não implementado E2E** |
| Retry | Estado/visual de retry existe em partes; handler não é conectado e não há retry durável sem duplicação | **Não funcional E2E** |
| FSM | Tipos, fases e testes unitários existem; runtime persiste `PLANNING` fora do enum, não percorre `PLANNED/WAITING_APPROVAL`, e steps podem ficar `running` | **Scaffolding / parcial** |
| ReAct/tool loop | ReAct genérico existe somente no adaptador de scraping; Copilot faz decisão JSON e no máximo uma MCP tool | **Não implementado como loop Copilot** |
| Ações estruturadas | 16 `action_type` declarados; drawer trata uma parte; fullscreen não conecta callbacks; `href/url` divergente; `action_button` não é renderizado | **Parcial crítico / P0** |
| Anexos | `ChatComposer` limpa attachments e o Shell não passa `onAttachFile`; upload/scan ausentes no recorte | **Ausente** |
| Reply | `replyToId` chega ao composer, mas é descartado pelo handler e não é persistido | **Ausente no caminho E2E** |
| Áudio | Botão/affordance existe, mas áudio real não está implementado | **Ausente** |
| Dados de domínio no Copilot | Mobilidade, turismo, jurídico, anúncios, proposta, financeiro, food, Places e legado têm defaults/fórmulas/payloads fixos; não há marcação obrigatória de sintético | **Não confiável como dado real** |
| Mapa base | MapLibre e tiles/canvas existem | **Parcialmente real** |
| Markers/eventos | Moments/places têm coordenadas sintéticas; events retornam no BFF mas não aparecem; callback é incompatível | **Quebrado/parcial** |
| Rotas/mobilidade | Orders são inseridos, mas distância/preço aceitos do caller; fórmula de linha reta; sem geometry/routing real | **Parcial inseguro** |
| Turismo/booking | Lista pública parcial; detalhe não filtra `active`; booking permite identidade nula e não é transacional/idempotente | **Parcial crítico** |
| Portal do viajante | Tela exibe PNR, hotel, clima, financeiro e contatos hardcoded; sem loader/BFF autorizado | **Demo estática** |
| Artefatos de chat | Geração e histórico existem; save pode bypassar tenant via autoria; erro de insert pode ser ignorado | **Parcial crítico** |
| Builder | Leitura/escrita/publicação existem; abertura principal vai ao inspetor; modelo de persistência do gerador não coincide com o leitor; roles/transação/lock ausentes | **Parcial crítico** |
| Exportações | CSV/print/HTML/JSON existem; PDF/PNG/PPTX reais não; callbacks do cartão não conectados | **Não entregue conforme promessa** |
| Memória | Funções de consentimento/curadoria/dono/voz e working memory existem; Projeto usa apenas JSON livre e não chama memória soberana | **Parcial / não integrado** |
| Retomada | Helper lê execução/steps e incrementa `resume_count`; não existe endpoint, botão, checkpoint ou reexecução real | **Ausente E2E** |
| RLS | Migrations/policies existem, mas não foram certificadas em runtime; há policy permissiva para `store_id IS NULL` e policies não protegem BFF service role sem autorização explícita | **Não certificado / P0** |

---

## 4. Priorização consolidada

### P0 — corrigir imediatamente antes de ampliar uso ou liberar produção

1. **Fechar autorização de objeto e tenant no BFF.** Criar um `assertThreadAccess`/`assertStoreAccess` único e aplicá-lo antes de listar/ler/enviar/atualizar/deletar threads, salvar/ler artefatos, atualizar memória, executar RMA, retomar execuções e executar ações. Validar `customer_id`, `recipient_profile_id`, `store_id`, membership e papel conforme a operação. Não considerar `auth.uid()`/creator isolado suficiente quando há service role.
2. **Corrigir RLS e impedir escopo global acidental.** Revisar policies de chat, artifacts e copilot executions, especialmente `store_id IS NULL`, e testar com sessão de usuário e service role. Nenhum BFF deve depender apenas de RLS enquanto usa `service_role`.
3. **Bloquear efeitos sem executor/autorização.** Implementar dispatcher server-side tipado para actions, com autorização por ação, payload específico, auditoria e resposta canônica; conectar Shell, drawer, atendimento e conversa. Enquanto não houver executor, remover/desabilitar CTAs. Corrigir imediatamente `payload.href` versus `payload.url` com `href` allowlisted.
4. **Parar de apresentar sintético como real.** Remover ou marcar explicitamente `synthetic/estimated/demo`, `source_ids` e proveniência; falhar com “fonte indisponível” em vez de afirmar posição, abertura, estoque, preço, voo, hotel, clima, financeiro, pedido, proposta ou rastreio não consultado. Bloquear mutações baseadas em estimates/demos.
5. **Proteger operações de negócio com efeito externo.** Não permitir booking/reserva, corrida, RMA ou outras mutações quando identidade/tenant não estiverem validados. O booking não pode aceitar identidade nula sem fluxo guest explicitamente protegido.
6. **Corrigir o caminho de abertura do Builder e o contrato de artefato.** Separar “Visualizar/Inspetor” de “Abrir no Builder”, passar `experience_document_id` e alinhar o formato gerado (`settings.omni_page`) ao formato lido (`experience_versions/experience_nodes`) ou migrar para o formato canônico.

### P1 — fechar integridade e capacidades prometidas após o bloqueio P0

1. **Idempotência de ponta a ponta.** Adicionar `clientMessageId/request_id/idempotency_key` estável ao envio, ações, booking, mobilidade, geração, exportação e publish; criar constraints/unique/upsert e receipts. Nunca derivar a chave de `startTime`.
2. **Transação/saga/outbox.** Tornar consistente a gravação de mensagem, execução, resposta, artefato e memória; persistir `failed` durável, ligar artifact a `message_id`, verificar cada erro e usar outbox/retry para canais WhatsApp/Mercado Livre e exportações.
3. **Persistência de execução e steps.** Gravar explicitamente o estado final de cada passo; impedir `PLANNING`/`null` fora das fases canônicas e evitar passos eternamente `running`. Implementar lock/CAS e reconciliação.
4. **Streaming/cancelamento/retry reais ou remoção da promessa.** Escolher SSE como caminho oficial (ou removê-lo), integrar UI, parser, `AbortController`, timeout/signal ao provider, reconnect/replay, finalização FSM, telemetry, tollbooth e custo. Ligar retry e cancelamento com execução idempotente.
5. **FSM/ReAct/resume reais.** Integrar `runReactLoop` ao Copilot, persistir plan/observation/tool_call/iteration, implementar `WAITING_APPROVAL`, aprovação humana, endpoint/botão de resume e continuação do primeiro passo não concluído.
6. **Custo e quota coerentes.** Aplicar quota/rate-limit a guest e SSE; propagar tokens input/output, modelo, provider, `usage`, `costUsd`, retries e receipt reais; tornar cobrança/estorno idempotentes e observáveis.
7. **Contratos de UI e DTO.** Criar adapter canônico camelCase com `senderName`, `replyTo`, `preview`, `replyToId`, `structuredPayload`, artifact e estados; implementar `reply_to_id`, anexos com upload/scan, áudio real, ou remover as affordances.
8. **Dados e reservas reais.** Remover `KNOWN_COORDINATES` de produção; usar coordenadas reais ou omitir marker. Implementar routing server-side, recomputar distância/preço, transação/RPC com lock/versionamento para assentos, inquiry e orders, e unique constraint de idempotência.
9. **Builder e exportação.** Tornar save/publish atômicos com lock/optimistic concurrency, validar draft e ciclos de `parent_id`, exigir papel administrativo/gerencial e corrigir RLS. Criar BFF de exportação autorizado para MIME/arquivos PDF/PNG/PPTX reais com retry controlado.
10. **Memória e Projeto.** Integrar record/query/curation/consentimento/expiração/remoção LGPD no pipeline do Projeto; separar filtros/lifecycle de `project` e `ai_assistant` se a promessa de Projeto continuar.

### P2 — melhorias de completude e manutenção, sem substituir P0/P1

1. Paginação/cursor de threads e histórico, `last_message_snippet`/`last_message_at` e DTOs completos.
2. Corrigir renderização de `action_button`, todos os `action_type` ou remover tipos não suportados; melhorar estados `empty/unavailable/forbidden`.
3. Fazer eventos aparecerem no mapa ou removê-los da resposta; alinhar contrato `MapMarkerItem`/`onMarkerClick`.
4. CSV RFC 4180 com escaping, prevenção de formula injection e uma única fonte para tabela/download.
5. Diferenciar `not_found`, `unconfigured` e erro transitório; adicionar provenance obrigatório a blocos/artefatos/roteiros.
6. Remover affordances sem backend (microfone, exportações não reais, ações silenciosas, streaming visual sem streaming).
7. Documentar e alinhar `ChatArtifactType` com checks/migrations e revisar filtros de notícias/jobs/events e sanitização PostgREST.

---

## 5. Correções que devem entrar imediatamente no código

Esta é a sequência operacional mínima, derivada dos P0:

1. **Criar o guard de autorização central** e usá-lo em todos os handlers de chat/Copilot/artefato/RMA/Builder/memória/execução. O guard deve validar combinação de usuário, thread, loja, destinatário e papel; não aceitar UUID como autorização.
2. **Remover o bypass implícito do service role**: manter service role somente atrás do guard explícito, ou trocar para client/JWT do usuário onde possível.
3. **Corrigir policies** para não tratar `store_id IS NULL` como acesso amplo; ajustar policy de `chat_artifacts` para exigir membership e papel apropriados, não apenas `created_by`.
4. **Adicionar schema discriminado de ação** (`action_type`, payload específico, `source`, `idempotency_key`) e uma única função `executeChatAction`; negar por default tipos sem executor.
5. **Unificar `href`** com allowlist e transportar payload completo (`variantId`, `options`, `storeId`, parâmetros de viagem/corrida). Não usar telefone, cidade ou parâmetros hardcoded como fallback operacional.
6. **Propagação de proveniência:** cada bloco/artefato de dados deve carregar `source_ids`, `synthetic`, `estimated`, timestamp e custo/telemetria quando aplicável; sem fonte, renderizar indisponível/estimado.
7. **Corrigir Builder:** callback “Abrir no Builder” deve navegar pelo `experience_document_id`; o gerador deve persistir documento/versão/nós compatíveis ou o leitor deve consumir `omni_page` explicitamente.
8. **Desabilitar efeitos não seguros** até haver transação/lock/idempotência: booking, assentos, orders, RMA e CTAs externos não devem confirmar sucesso em caso de falha parcial.
9. **Corrigir estados de erro:** falha AI deve persistir como `failed`/`FAILED_RETRYABLE` ou `FAILED_FINAL`, nunca `delivered`; cada insert/update deve ter erro tratado e ser reconciliável.
10. **Adicionar chave estável já no contrato de envio:** `clientMessageId/request_id`, constraint/upsert e ligação `artifact.message_id`; depois encapsular o fluxo em transaction/RPC ou saga/outbox.
11. **Retirar promessas não suportadas da UI:** `isStreaming` apenas se houver stream real; retry/cancel/pin/archive apenas com handlers; áudio/anexo/reply/export somente quando o caminho E2E existir.

---

## 6. Testes necessários

### 6.1 Segurança, RLS e isolamento

- Dois usuários e duas lojas: list/get/send/update/delete de thread; recipient P2P; artifacts; working memory; pin/archive; RMA; create/resume execution.
- Tentativas com UUID válido de outro tenant, `storeId` arbitrário, `customer_id`/`recipient_profile_id` incompatível e usuário com papel customer/staff inadequado.
- Execução com sessão/JWT e com service role para confirmar que o BFF mantém a barreira de autorização.
- RLS real por tabela (`chat_threads`, `chat_messages`, `chat_artifacts`, `copilot_executions`, `copilot_execution_steps`, orders, tourism, inquiry), incluindo `store_id IS NULL`.
- Policy de `chat_artifacts` com `created_by` forjado, membership sem papel e links polimórficos fora da loja.

### 6.2 Idempotência, concorrência e consistência

- Duplo POST/replay com a mesma `clientMessageId/request_id`: exatamente uma mensagem, uma resposta, um artefato e uma cobrança.
- Dois retries com chaves diferentes e timeout no provider: comportamento explícito, sem cobrança/efeito duplicado.
- Concorrência em criação de thread, `working_memory`, mesma poltrona/assento, order e publish.
- Falha injetada em cada etapa (AI, insert de mensagem, artifact, memory, outbox, mirror, voucher, export): rollback/saga/reconciliação e estado final correto.
- Verificação de que nenhum passo permanece `running` após erro, timeout, cancelamento ou reinício.

### 6.3 Streaming, FSM, retry, cancelamento e resume

- HTTP SSE: auth, erro antes do stream, `done/error`, timeout, abort, fallback depois de deltas, reconnect/replay, provider/model/usage/cost reais.
- UI E2E para `/copilot` e drawer: início, delta, final, retry, cancelamento, reconexão e ausência de duplicação.
- FSM rejeitando `PLANNING`/`null`; transições `PLANNED`, `WAITING_APPROVAL`, `RUNNING`, `FAILED_*`, `COMPLETED`.
- ReAct com várias iterações, tool call, observação, replanejamento, aprovação e resume do primeiro passo incompleto.
- Duas retomadas concorrentes do mesmo `executionId` usando lock/CAS.

### 6.4 Ações e UI

- Clique real em cada `action_type` suportado; dispatcher, autorização, payload, loading, sucesso e erro.
- Contrato `href`/allowlist da busca interna; teste de navegação e de bloqueio de URL não permitida.
- `open_place`, `call_ride`, `request_travel_quote`, `add_to_cart` com variantes/modificadores e loja corretos.
- Fullscreen Copilot com callbacks; retry/cancel/pin/archive/delete/clear/archive efetivamente alterando estado.
- Round-trip de `replyToId`, attachments, `structuredPayload`, artifact, FSM e DTO snake_case → camelCase.
- Paperclip, microfone, export, impressão, CSV, Builder, View Versions e ações sem handler.

### 6.5 Dados, mapas, turismo e negócio

- Nenhuma coordenada sintética quando fonte real não existe; filtro cidade/category/bounding box e ausência de coordenada.
- Markers `moment/place/event`, callback com `MapMarkerItem` e abertura correta; eventos retornados devem aparecer ou ser removidos.
- Adulteração de `distance_km`/`estimated_price_cents` e recomputação server-side.
- Routing/geometry real, preço/duração coerentes e cancelamento/idempotência de order.
- Turismo: RLS anon/auth/tenant, detalhe somente `active`, concorrência de assentos, retry da mesma chave e consistência voucher/inquiry/mirror.
- Portal viajante com dois IDs: conteúdo sempre carregado pelo BFF autorizado, nunca por constantes hardcoded.
- Proveniência: dados sem fonte devem aparecer como unavailable/estimated/synthetic, não como confirmados.

### 6.6 Builder, artefatos, memória e exportação

- E2E real com Supabase/Storage: geração → documento → versão → nós → artifact → abertura no Builder → save → publish.
- Rollback em cada falha intermediária, concorrência de publish, ciclo de `parent_id`, role customer versus admin/manager.
- PDF/PNG/PPTX binários, MIME, download, retry e autorização por artifact/document ID.
- CSV com aspas, separador, newline e fórmula; mesma fonte da tabela e do download.
- Integração `recordMemory/queryMemory`, consentimento, expiração/remoção LGPD e uso dentro do Projeto.

### 6.7 Bloqueio de execução já registrado

A execução Vitest do relatório de ações foi bloqueada antes dos testes por `ERR_PNPM_IGNORED_BUILDS` durante `pnpm install`. Os 25 testes que passaram nos relatórios de memória/Shell e os 3 arquivos/25 testes do Copilot validam apenas shapes, encoder, FSM e limites determinísticos; **não comprovam** E2E, RLS real, browser UI, idempotência, custo, retry, streaming, cancelamento ou resume.

---

## 7. O que continua bloqueado por credencial, migration ou dependência de ambiente

### 7.1 Credenciais/configuração externa

Os seis resultados **não registram uma falha específica de credencial**. Portanto, não se deve declarar que um provider está sem credencial. O que permanece bloqueado até configuração/credencial válida é:

- routing/geometry e dados de localização que dependam de provider real;
- Places, horários, rating e estado de abertura reais;
- dispatch WhatsApp/Mercado Livre e outros canais externos;
- export/deploy hook e qualquer provider externo de artefato;
- dados reais de turismo, mobilidade, catálogo, eventos e outras fontes não presentes no recorte.

Enquanto a fonte/provider não estiver configurado e consultável, o código deve retornar `unavailable/unconfigured` ou `estimated/synthetic`, nunca confirmação de dado real. Isso é uma dependência operacional identificada pelos auditores, não uma alegação de que a credencial esteja ausente.

### 7.2 Migrations/schema/RLS

Continuam exigindo migration/revisão de schema e posterior execução dos testes reais:

- Corrigir policy de `copilot_executions` que permite leitura ampla quando `store_id IS NULL`.
- Corrigir policy de `chat_artifacts` que permite modificação por `auth.uid() = created_by` ou membership sem exigir papel/escopo de entidade.
- Confirmar que as policies de `0016_chat_team.sql`, `20261215000000_ai_chat_shell_artifacts_and_projects.sql` e `20270101010000_copilot_react_execution_persistence.sql` correspondem ao modelo de tenant e ao uso efetivo do BFF.
- Criar colunas/constraints/índices para `clientMessageId/request_id/idempotency_key`, recibos, ligação artifact→message, versionamento/CAS e unique de booking/orders/export/publish.
- Criar/ajustar tabelas de outbox, status de execução e checkpoints se a saga/retomada for adotada.
- Alinhar `ChatArtifactType`/checks SQL e resolver a incompatibilidade `settings.omni_page` versus `experience_versions/experience_nodes`.
- Ajustar schema para `reply_to_id`, proveniência (`source_ids`, `synthetic`, `estimated`), usage/cost/provider/model e estados de erro duráveis.

### 7.3 Dependências de execução/teste

- O teste automatizado de ações ficou bloqueado por `ERR_PNPM_IGNORED_BUILDS` no `pnpm install`; precisa de ambiente de dependências corrigido antes de validar o código.
- A auditoria não certificou RLS, Storage, provider externo, SSE HTTP ou browser E2E em ambiente real; esses itens seguem bloqueados para aceite até haver ambiente/configuração e os testes descritos acima.
- Não há evidência de que as migrations tenham sido aplicadas no ambiente auditado; o relatório somente registra o conteúdo/risco das migrations citadas.

---

## 8. Critério de aceite recomendado

Considerar o fluxo pronto somente quando, no mínimo:

- todo acesso a thread, loja, artefato, memória, execução e ação passa por autorização de objeto/tenant;
- RLS real e service-role path passam testes negativos cross-tenant;
- envio e efeitos são idempotentes, transacionais ou reconciliáveis via saga/outbox;
- falhas são duráveis (`failed`/`FAILED_*`) e não `delivered` enganoso;
- a UI não oferece ações, streaming, áudio, anexo, reply, export ou Builder que não tenham caminho E2E;
- dados sintéticos/defaults são removidos ou claramente marcados, com proveniência e fonte;
- guest, SSE e retries têm quota/cobrança/telemetry coerentes;
- resume, cancel, retry e FSM são exercitáveis de ponta a ponta;
- Builder, reservas, mapas e portal usam dados/estado autorizados e persistência compatível;
- a bateria de testes de segurança, concorrência, falha parcial e browser E2E passa em ambiente com migrations e dependências aplicadas.

**Fontes consolidadas:** `chat-e2e-domain-01-chat-runtime.md`, `chat-e2e-domain-02-copilot-fsm.md`, `chat-e2e-domain-03-dynamic-actions.md`, `chat-e2e-domain-04-maps-routing.md`, `chat-e2e-domain-05-artifacts-builders.md` e `chat-e2e-domain-06-automation-memory.md`.
