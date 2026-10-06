# Auditoria E2E — Artefatos, Builders e Exportações

**Domínio:** Artefatos gerados no Chat, Builders de experiências e exportações
**Escopo primário solicitado:**

- `src/components/chat/chat-artifact-card.tsx`
- `src/components/chat/ai-chat-shell.tsx`
- `src/services/builder.functions.ts`
- `src/services/document-artifacts.functions.ts`

**Arquivos correlatos consultados apenas para fechar o rastreio:** `src/types/chat.ts`, `src/services/ai-conversations.functions.ts`, `src/services/ai-builder-composition.functions.ts`, `src/services/builder-exporter.ts`, testes correlatos e migrações Supabase de builder/chat/document-artifacts.

## 1. Veredito executivo

**Status do domínio: PARCIAL, com gaps críticos de contrato entre UI, persistência e exportação.** Há peças reais de persistência e isolamento de loja, mas a promessa visível no cartão (“Abrir no Builder”, “Exportar”, artefato versionado) não é cumprida de ponta a ponta pelo caminho usado no Chat Shell.

Os maiores riscos são:

1. **“Abrir no Builder” não abre o Builder no caminho principal do `AIChatShell`:** o callback passado ao cartão apenas seleciona o artefato e abre o painel/Sheet de inspeção (`ai-chat-shell.tsx:485-495`); o redirect para `/workspace/builder` existe somente no fallback do cartão quando nenhum callback é fornecido (`chat-artifact-card.tsx:206-216`).
2. **O cartão não recebe `onExport` nem `onViewVersions` no `AIChatShell`:** portanto as ações opcionais não aparecem. O exportador do painel é local e parcial (`window.print`, CSV no navegador e clipboard), não uma exportação persistida/servidor.
3. **O BFF `generateAiBuilderArtifact` grava `experience_documents.settings.omni_page`, mas não cria `experience_versions` nem `experience_nodes` (`ai-builder-composition.functions.ts:865-883`).** Já `getExperienceDocument` carrega a versão mais recente e os nós, criando uma versão vazia quando não há versão (`builder.functions.ts:582-625`). O `previewUrl` retornado (`...:936-945`) pode, portanto, abrir um documento sem nós no Builder.
4. **A geração que alimenta o Chat possui dois caminhos:** o caminho ReAct pode usar ferramentas reais, mas `resolveAiPipelineSteps` é explicitamente legado/determinístico e hardcoded (`ai-conversations.functions.ts:127-135`). Os testes do Shell exercitam justamente esse resolver (`ai-chat-shell.test.ts:6-63`), que produz valores sintéticos (R$ 8.500,00, linhas financeiras fixas, IDs aleatórios), sem prova de consulta à loja.
5. **Persistência de Chat não é transacional nem idempotente:** `sendAiConversationMessage` insere mensagem do usuário, artefato, resposta e memória em operações separadas (`ai-conversations.functions.ts:1713-1848`). Falhas intermediárias deixam estado parcial; falha ao inserir `chat_artifacts` é ignorada e a resposta ainda retorna o artefato em payload.
6. **Publicação do Builder não é atômica:** arquiva a versão publicada, apaga nós, reinsere nós e só depois marca a versão como publicada (`builder.functions.ts:2654-2715`), sem transação, sem lock/versão esperada e sem tratar erros de várias etapas.

## 2. Rastreio E2E por fluxo

### 2.1 Artefato no Chat: UI → estado → banco → resposta

**UI real:** `AIChatShell` recebe `messages` como propriedade e renderiza `msg.artifact` dentro de `ChatArtifactCard` (`ai-chat-shell.tsx:485-495`). O componente é visual/controlado por callbacks; não busca o banco por conta própria. O contrato de dados é aberto (`ChatArtifactData.data?: Record<string, any>`) em `src/types/chat.ts:48-60`.

**Leitura do banco correlata:** `getAiConversationThread` verifica autenticação, carrega thread, mensagens e artefatos (`ai-conversations.functions.ts:1617-1685`). A mensagem projetada para a UI usa `m.payload?.artifact`, enquanto a lista separada usa `chat_artifacts` (`...:1667-1685`). Isso permite divergência entre o artefato embutido no payload da mensagem e o registro em `chat_artifacts`.

**Escrita do banco correlata:** `sendAiConversationMessage` grava mensagem do usuário (`...:1713-1729`), executa o pipeline com timeout (`...:1732-1746`), tenta inserir `chat_artifacts` (`...:1768-1792`), grava a resposta com `payload.artifact` (`...:1795-1817`), atualiza working memory (`...:1823-1830`) e devolve o mesmo artefato na resposta (`...:1832-1848`).

**Classificação:** **PARCIAL**. A renderização e a persistência nominal existem, mas não há unidade transacional, não há garantia de que o artefato retornado existe no banco e há duas fontes de verdade (payload da mensagem e tabela `chat_artifacts`).

### 2.2 “Abrir no Builder”

- No cartão, sem callback, há redirect para `/workspace/builder?doc=<id>` ou `/workspace/builder?artifactId=<id>` (`chat-artifact-card.tsx:206-216`).
- No `AIChatShell`, porém, o cartão recebe `onOpenBuilder` que executa `setActiveArtifact` e `setShowContextPanel(true)` (`ai-chat-shell.tsx:485-495`). Isso mostra o inspetor, não navega ao Builder.
- No `waesy-copilot-drawer`, o mesmo callback fecha o drawer e navega para `/copilot`, não para o Builder (`waesy-copilot-drawer.tsx:385-394`).
- O `ArtifactViewerContent` apenas renderiza uma visão derivada dos dados do artefato (`ai-chat-shell.tsx:727-943`). Não há chamada para `getExperienceDocument`, `getOrCreate...` ou uma rota Builder a partir do inspetor.

**Classificação:** **PARCIAL / contrato quebrado**. O texto do botão promete Builder; o caminho principal abre um preview local e o drawer alternativo vai para `/copilot`.

### 2.3 Exportação a partir do cartão e do inspetor

#### PDF / impressão

- A API do cartão só expõe `onExport?: (...)` (`chat-artifact-card.tsx:24-29`). `handleExport` não tem fallback: só chama o callback se ele existir (`...:219-223`), e o botão inteiro só é renderizado quando `onExport` existe (`...:305-317`).
- O `AIChatShell` não passa `onExport` nem `onViewVersions` ao `ChatArtifactCard` (`ai-chat-shell.tsx:487-495`).
- O inspetor mostra “Exportar PDF / Imprimir”, mas o handler é apenas `window.print()` (`ai-chat-shell.tsx:754-755`, botão `...:836-846`). Isso não cria PDF, não chama BFF e imprime a página/viewport do navegador.
- Existe um serviço BFF separado (`exportArtifactService`) que aceita `html`, `pdf_ready_html`, `presentation_slides`, `social_card` e `json` (`ai-builder-composition.functions.ts:956-974`), mas o retorno é conteúdo textual; o formato PDF é HTML com CSS de impressão (`exportBuilderArtifact`, `...:758-826`), não `application/pdf` nem arquivo binário. Não foi encontrada chamada UI desse BFF.

**Classificação:** **PARCIAL**. Há impressão e HTML “PDF-ready”; não há exportação PDF real ligada ao cartão.

#### CSV

- O CSV do inspetor é montado no cliente (`ai-chat-shell.tsx:734-752`). É um `data:text/csv` com `encodeURI`, sem escaping/quoting de células, sem tratamento de `;`, aspas, quebras de linha ou fórmulas.
- A tabela usa fallback sintético `[["1", "Item", "Ok"]]` quando `dataRows` não existe (`...:873-885`), mas o download usa `dataRows || rows || []` e, nessa situação, baixa cabeçalho sem a linha exibida (`...:735-744`). Isso é uma quebra direta UI → exportação.
- O badge de registros usa `artifact.data?.rows` antes de `dataRows?.length` (`...:854-858`), podendo exibir um array/valor inadequado em vez de contagem.

**Classificação:** **PARCIAL**. Funciona para uma matriz simples, somente no navegador, com contrato inconsistente e sem robustez de CSV.

#### JSON, PNG e apresentação

- `ARTIFACT_TYPE_CONFIG` declara defaults `pdf`, `csv`, `json` e `png` (`chat-artifact-card.tsx:32-76`), mas o UI principal não fornece `onExport`; portanto o botão nem aparece.
- O BFF de composição suporta JSON e “slides”, mas slides são `application/json` e `social_card` é HTML (`ai-builder-composition.functions.ts:644-755`), não PPTX/PNG.
- `builder-exporter.ts` produz uma página HTML estática, serializa nós em `window.__WAESY_EXPERIENCE_NODES__`, mas o corpo renderizado é uma página genérica (`builder-exporter.ts:10-85`); não há conversão dos nós para HTML visual final. `triggerDeployHook` faz um único `fetch` POST, sem timeout, retry ou idempotency key (`...:94-124`), e não tem consumidor encontrado na UI auditada.

**Classificação:** **AUSENTE no caminho do cartão** para JSON/PNG/apresentação; **PARCIAL** no BFF textual de composição.

### 2.4 Histórico e versionamento

- `ChatArtifactCard` só exibe versões se `artifact.totalVersions > 1` e só mostra botão “Versões” se `onViewVersions` existir (`chat-artifact-card.tsx:246-253`, `...:291-303`).
- `AIChatShell` não fornece `onViewVersions` (`ai-chat-shell.tsx:487-495`). O painel lista artefatos, mas não lista versões (`...:666-701`).
- A tabela `chat_artifacts` possui apenas `version INT` e timestamps (`20261215000000_ai_chat_shell_artifacts_and_projects.sql:27-40`), sem constraint única por entidade/versão, sem função de listar versões e sem FK que represente uma cadeia de versões.
- `saveAiChatArtifact` simplesmente faz `insert` com a versão informada (`ai-conversations.functions.ts:1855-1885`), sem incremento/controle de concorrência.
- O Builder possui versionamento real em `experience_versions`; `saveBuilderNodes` faz fork quando recebe versão publicada (`builder.functions.ts:2523-2539`), mas a UI do cartão não encaminha o usuário para esse fluxo.

**Classificação:** **PARCIAL**. Versionamento de Builder existe; histórico de artefato no Chat não está conectado a uma ação de UI nem protegido por idempotência/ordenação.

## 3. Builders: persistência, publicação e retorno

### 3.1 CRUD e contexto de loja

- `listExperienceDocuments` exige identidade e filtra por `store_id` resolvido (`builder.functions.ts:526-556`).
- `getExperienceDocument` exige identidade, verifica o documento e resolve loja por documento/membership (`...:558-580`), carrega a versão mais recente e cria uma versão draft se nenhuma existir (`...:582-609`), depois carrega e hidrata nós (`...:611-630`).
- `createExperienceDocument`, `updateExperienceDocument`, `listMediaAssets` e funções de criação de vitrines exigem `requireAdmin` (`...:638-658`, `...:999-1007`, `...:1034-1040`, `...:1349-1357`, `...:2099-2113`).
- `saveBuilderNodes` e `publishBuilderVersion` exigem somente `identity.id` e `resolveStoreContext`, não `requireAdmin` (`...:2499-2517`, `...:2632-2653`). `resolveStoreContext` valida loja/membership, mas não aplica o mesmo conjunto de papéis administrativos (`...:479-522`). A política RLS de nodes restringe gravação a owner/admin/manager/content (`0083_builder_rls_hardening.sql:49-69`), mas a garantia efetiva depende de qual credencial `getServerClient()` usa; o código BFF não deixa a regra de papel explícita.

**Classificação de autenticação/autorização:** **PARCIAL**. Autenticação e escopo de loja aparecem em muitos caminhos; há inconsistência de papel entre CRUD/criação e save/publicação.

### 3.2 Persistência de nós

- `saveBuilderNodes` valida a versão e a loja, cria fork para versão publicada ou apaga nós de draft, mapeia IDs, sanitiza pais órfãos, ordena topologicamente e insere (`builder.functions.ts:2507-2614`). Isso é evidência de persistência real.
- A substituição é feita em múltiplas operações (`delete` + `insert`), sem transação. Um erro após delete pode deixar draft vazio. O algoritmo recursivo `visitNode` marca o nó como visitado somente após visitar o pai (`...:2592-2601`); um ciclo de `parent_id` pode recursar indefinidamente antes da inserção.
- `publishBuilderVersion` repete a substituição e arquiva versões publicadas antes de inserir e marcar a nova como publicada (`...:2654-2715`). Não exige que a entrada seja draft, não usa lock/optimistic concurrency e não trata erros do `update` de arquivamento ou do `delete` de nós. Em uma falha posterior, a versão antiga já foi arquivada e a nova pode não estar publicada.

**Classificação:** **PARCIAL**. O caminho feliz persiste, mas não há atomicidade, rollback, idempotência ou controle de concorrência.

### 3.3 Geração de artefato de Builder por IA

- `generateAiBuilderArtifact` exige `requireAdmin`, valida niche/archetype e gera documento/rubrica (`ai-builder-composition.functions.ts:831-861`).
- `composeAiArtifactDocument` é composição determinística: recebe `briefing`, mas o conteúdo montado é majoritariamente preset/hardcoded; IDs usam `Date.now()`/`Math.random()` (`...:390-421`, `...:605-625`).
- Persiste somente `experience_documents` com o documento em `settings.omni_page` (`...:865-883`). Não há insert correspondente em `experience_versions`/`experience_nodes` nesse handler.
- Se houver thread, insere um espelho em `chat_artifacts`, com `version: 1`, vínculo ao documento e rubrica (`...:887-924`), mas se `artErr` ocorrer ele é ignorado; o handler continua e retorna `chatArtifactId: null` (`...:926-945`). Não há transação entre documento e espelho.
- O retorno chama `previewUrl: /builder?doc=<id>` (`...:936-945`), mas o leitor de documento do Builder busca versões/nós, não `settings.omni_page` (`builder.functions.ts:582-625`).

**Classificação:** **PARCIAL / crítico**. Persistência do JSON e espelhamento existem; o contrato de abertura no Builder não está fechado e a geração não é uma chamada de IA comprovada.

## 4. Artefatos documentais/OCR

### 4.1 Criação e idempotência

- `createDocumentArtifact` valida UUID, bucket, path, nome, MIME, hash e proveniência (`document-artifacts.functions.ts:28-39`).
- `resolveAuthorizedStore` exige identidade, loja e `assertStoreAccess` (`...:20-26`), e a tabela tem RLS para staff/global admin (`20270107000000_document_artifacts_ocr_provenance.sql:54-79`).
- O `upsert` usa conflito `(store_id,bucket_id,storage_path)` (`document-artifacts.functions.ts:43-59`), alinhado à constraint SQL (`20270107000000_document_artifacts_ocr_provenance.sql:5-32`). Isso é idempotência real para o registro do mesmo caminho.

**Classificação:** **REAL** para registro idempotente do arquivo lógico; não prova upload físico nem verificação de posse do objeto Storage.

### 4.2 Extração e erros

- `updateDocumentExtraction` lê o `store_id`, autoriza e sobrescreve status/engine/version/texto/dados/confiança/proveniência/erro (`document-artifacts.functions.ts:64-105`).
- Não há versão de extração, `updated_at` explícito (há trigger SQL), máquina de estados, compare-and-swap, retry/backoff ou proteção contra uma execução antiga sobrescrever uma nova. O campo `version` é apenas string fornecida pelo chamador, não um controle de concorrência.
- `errorCode`/`errorMessage` são persistidos; não há fila/worker/streaming nesse arquivo.

**Classificação:** **PARCIAL**. O estado e o erro são persistidos; processamento/retry/versionamento da extração não estão implementados aqui.

### 4.3 Vínculos

- `linkDocumentArtifact` verifica que o artefato existe, resolve a loja e exige que a loja coincida (`document-artifacts.functions.ts:108-127`). O `upsert` usa `(artifact_id,entity_type,entity_id,relation)` (`...:128-142`), alinhado à constraint SQL (`20270107000000_document_artifacts_ocr_provenance.sql:34-45`).
- Porém, o handler não valida se `entityId` existe, pertence à mesma loja ou é compatível com `entityType`; o banco também não impõe essa FK polimórfica. Um link pode apontar para UUID inexistente ou entidade de outro tenant, embora o próprio artefato esteja autorizado.

**Classificação:** **PARCIAL**; idempotência do link é real, integridade referencial do alvo está ausente.

## 5. Autenticação, RLS e isolamento

### Evidências positivas

- `requireAdmin` bloqueia usuário não autenticado, verifica papel e contexto de loja (`src/lib/auth-guards.server.ts:14-32`, `...:80-91`).
- `assertStoreAccess` bloqueia ausência de identidade, aceita global admin e verifica membership/loja para os papéis permitidos (`src/lib/identity-core.ts:79-126`).
- Builder documents/versions/nodes têm RLS habilitado (`supabase/migrations/0048_builder_platform_core.sql:73-101`) e hardening de gravação por `workspace_members` para owner/admin/manager/content (`0083_builder_rls_hardening.sql:11-69`).
- Document artifacts têm RLS e policies por `is_store_staff(store_id)` ou admin global (`20270107000000_document_artifacts_ocr_provenance.sql:54-79`).

### Gaps

1. A policy `chat_artifacts_modify` permite `auth.uid() = created_by` **ou** membership da loja, sem exigir papel staff nem validar que `created_by` pertence à mesma loja (`20261215000000_ai_chat_shell_artifacts_and_projects.sql:75-93`). Um usuário autenticado que insira a si próprio como `created_by` pode, pela policy, tentar modificar registro com `store_id` de outra loja. O BFF deveria sempre derivar store/thread/creator no servidor e a policy deveria usar uma função de papel/escopo, não somente autoria.
2. A policy `chat_artifacts_select` libera leitura para qualquer workspace member da loja, inclusive se o papel for `customer` conforme a tabela de memberships (`...:54-69`; role `customer` existe em `20260730234419_refactor_identity_and_tenancy.sql:8-16`). Isso pode ser intencional, mas não é equivalente ao `requireAdmin` usado na geração.
3. A leitura pública do Builder permite documento ativo, versão publicada e nós publicados (`0048_builder_platform_core.sql:81-97`), enquanto `getPublicExperienceDocumentBySlug` ainda possui fallback para qualquer `document_type` quando o tipo solicitado não encontra resultado (`builder.functions.ts:2238-2265`). Isso enfraquece o contrato de tipo da rota pública.
4. `getPublicExperienceDocumentBySlug` captura qualquer erro e retorna `not_found`, ocultando indisponibilidade real (`builder.functions.ts:2415-2421`). Consumidores não distinguem página inexistente, erro de banco e backend não configurado, salvo o caso especial `unconfigured`.

**Classificação de RLS/tenancy:** **PARCIAL**, não ausente. Existem policies substanciais, mas há assimetrias entre policy, BFF e papel, além de fallback público e links polimórficos sem integridade.

## 6. Streaming, erros, retries e custos de IA

### Streaming

`AIChatShell` recebe `isStreaming` e repassa o valor à trilha de atividade (`ai-chat-shell.tsx:93-94`, `...:473-481`), e usa o valor para scroll (`...:126-131`). Não há handler de chunks, conexão SSE/WebSocket, reconciliação de mensagem parcial ou persistência incremental nesse componente. `sendAiConversationMessage` aguarda a execução inteira e só então grava/devolve a resposta (`ai-conversations.functions.ts:1732-1848`).

**Classificação:** **AUSENTE no caminho auditado**, com indicador visual de streaming apenas.

### Erros e retries

- A UI só chama `onRetryMessage` se o pai fornecer callback (`ai-chat-shell.tsx:531-535`); não implementa retry, backoff, limite ou preservação de idempotency key.
- O BFF do chat usa timeout e Error Boundary, devolvendo `FAILED_RETRYABLE` e mensagem ao usuário (`ai-conversations.functions.ts:1732-1765`), mas não faz retry automático.
- CRUD Builder e exportações capturam/logam e relançam mensagens, sem retry/backoff/transação (`builder.functions.ts:631-636`, `...:993-997`, `...:2615-2618`, `...:2716-2719`; `ai-builder-composition.functions.ts:970-973`).
- `triggerDeployHook` tenta uma única vez (`builder-exporter.ts:94-124`).

**Classificação:** **PARCIAL**; há boundary/estado de falha, não uma política confiável de retry.

### Custo e telemetria de IA

- O tipo de atividade aceita `tokensUsed` e `costUsd` (`src/types/chat.ts:24-36`), mas `AIChatShell` apenas renderiza a trilha; não calcula nem persiste custo.
- O resolver legado injeta contagens fixas de tokens (`ai-conversations.functions.ts:145-187`, `...:262-294`) e não preenche `costUsd`. O próprio código o marca como legado/determinístico (`...:127-135`).
- `composeAiArtifactDocument` não chama modelo, gateway ou contador de tokens; monta blocos localmente e avalia uma rubrica determinística (`ai-builder-composition.functions.ts:268-360`, `...:390-625`).
- Não foi encontrado no caminho auditado um ledger de custo por execução, preço/modelo, teto de orçamento, retry contabilizado ou reconciliação de tokens do provedor.

**Classificação:** **AUSENTE** para custo de IA auditável; **sintético** para telemetria do resolver legado.

## 7. Dados sintéticos e promessas indevidas

Evidências concretas de dados não derivados do banco:

- Proposta fixa de `total_cents: 850000`, validade de 15 dias e marcos constantes (`ai-conversations.functions.ts:190-205`).
- Planilha com três meses e valores fixos (`...:274-290`).
- Carrinho com `prod-1`, preços e frete fixos (`...:310-330`).
- Rastreamento com pedido `WSY-BR-9842`, endereço, entregador e placa fixos (`...:353-373`).
- Agendamento com serviço/preço fixos (`...:397-409`).
- Composição de Builder com depoimentos nomeados, preços `49000`/`129000`, WhatsApp `5511999998888` e textos preset (`ai-builder-composition.functions.ts:499-579`).
- Exportador de Builder representa cada configuração por `JSON.stringify(...).slice(0, 300)`, não renderiza o bloco real (`ai-builder-composition.functions.ts:770-780`).
- Tabela do inspetor mostra linha artificial `["1", "Item", "Ok"]` se faltarem dados (`ai-chat-shell.tsx:873-885`).

**Classificação da promessa de “dados reais/tempo real”:** **AUSENTE no resolver legado e PARCIAL no ReAct**, que precisa ser validado separadamente por ferramenta/execução. Não se deve tratar os testes do resolver como prova de dados da loja.

## 8. Contratos quebrados e botões/ações sem handler

| Ação visível/prometida | Evidência | Classificação |
|---|---|---|
| Abrir no Builder | Callback do Shell abre inspetor; redirect só existe no fallback do cartão (`chat-artifact-card.tsx:206-216`, `ai-chat-shell.tsx:485-495`) | **Parcial/quebrado** |
| Exportar no cartão | Botão só existe com `onExport`; Shell não fornece callback | **Ausente no Shell** |
| Ver versões | Botão só existe com `onViewVersions`; Shell não fornece callback | **Ausente no Shell** |
| Exportar PDF | `window.print()` sem BFF/arquivo PDF (`ai-chat-shell.tsx:754-755`) | **Parcial** |
| Baixar CSV | Data URI local, sem escaping; fallback visual não coincide com arquivo | **Parcial/quebrado** |
| Exportar PNG | Default declarado, sem handler/conversor no caminho do cartão | **Ausente** |
| Exportar apresentação | BFF retorna JSON de slides, sem UI e sem PPTX | **Parcial no serviço / ausente na UI** |
| Copiar conteúdo | `navigator.clipboard.writeText` sem tratamento de rejeição (`ai-chat-shell.tsx:927-940`) | **Parcial** |
| Cancelar execução | Só repassa callback opcional para `AIActivityTrail` (`...:473-481`) | **Parcial; depende do pai** |
| Retry de mensagem | Só repassa `onRetryMessage` opcional (`...:531-535`) | **Parcial; sem retry implementado localmente** |

## 9. Recomendações de código priorizadas

### P0 — fechar o contrato do artefato/Builder

1. No `ChatArtifactCard`/`AIChatShell`, decidir explicitamente entre **inspector** e **Builder**. Para “Abrir no Builder”, usar `experience_document_id` e navegar para a rota real; manter o inspector em ação separada (“Visualizar”).
2. Em `generateAiBuilderArtifact`, persistir em uma operação transacional: `experience_documents` + `experience_versions` + `experience_nodes` e depois `chat_artifacts`, ou implementar uma função SQL/RPC transacional. O leitor `getExperienceDocument` precisa ler o mesmo formato que o gerador grava (`settings.omni_page` ou nós canônicos).
3. Quando a inserção do espelho `chat_artifacts` falhar, retornar erro e/ou marcar a execução como parcial de forma explícita; não devolver `chatArtifactId: null` com payload afirmando artefato persistido.

### P0 — segurança e tenancy

4. Corrigir `chat_artifacts_modify`: derivar `created_by`, `thread_id` e `store_id` no servidor; remover o bypass por autoria isolada e exigir membership/role compatível. Validar que thread e store pertencem à mesma loja.
5. Exigir `requireAdmin`/`requireManager` (regra escolhida pelo produto) em `saveBuilderNodes` e `publishBuilderVersion`, além de `resolveStoreContext`.
6. Validar `entityId`/`entityType` no link documental, incluindo existência e mesma loja, ou substituir link polimórfico por FKs/tabelas específicas.

### P0 — atomicidade/publicação

7. Implementar RPC/transação para salvar nós e publicar: validar versão draft, aplicar optimistic lock, inserir nova versão/nós, trocar publicação somente no commit. Nunca arquivar a publicação anterior antes de garantir que a nova está íntegra.
8. Rejeitar ciclos de `parent_id` antes da recursão e limitar profundidade/tamanho do payload.
9. Adicionar chaves/constraints de unicidade para documento canônico por loja/slug/tipo e controle de versão, evitando corridas em `getOrCreateHomeDocument`, institucional e wrappers.

### P1 — exportação real

10. Criar um contrato único de exportação por `artifactId`/`experienceDocumentId`, com autorização no servidor, formato, estado `queued/processing/completed/failed`, URL/Blob e metadados. Ligar `onExport` do cartão ao serviço.
11. Para PDF, gerar PDF real (ou declarar explicitamente “imprimir”) e retornar `application/pdf`; para PNG, converter o HTML/canvas em PNG; para apresentação, definir PPTX ou declarar JSON de slides.
12. Implementar CSV RFC 4180/escaping, BOM opcional para Excel, prevenção de formula injection e uma única fonte de linhas usada tanto pela tabela quanto pelo download.
13. Sanitizar HTML/atributos no exportador e escapar `title`, `description`, nomes e configurações antes de interpolar no HTML. O `exportStaticHtml` atual concatena valores sem escape (`builder-exporter.ts:20-27`, `...:50-81`).

### P1 — operação e observabilidade

14. Adicionar idempotency key por envio/generation/export/publish e constraint de deduplicação. Encapsular mensagem + artefato + memória em transação ou outbox.
15. Registrar execução, modelo, tokens de entrada/saída, custo calculado pelo preço vigente, retries e erro; não usar valores fixos do resolver legado como telemetria real.
16. Adicionar retry com backoff somente para erros transitórios, timeout por etapa e estado de exportação/extração observável; não repetir inserts sem chave idempotente.

## 10. Gaps de teste

Não foi executada uma suíte E2E com Supabase/Storage real neste trabalho; a revisão foi estática, com leitura de código, migrações e testes existentes. Os testes encontrados cobrem principalmente contratos em memória e presença textual:

- `ai-chat-shell.test.ts:6-84` testa `resolveAiPipelineSteps`, incluindo valores fixos e contagens de tokens; não monta o `AIChatShell`, não verifica ausência de `onExport`, redirect, Sheet, impressão, CSV ou RLS.
- `ai-builder-composition.test.ts:25-177` testa HTML/JSON e rubrica do compositor; não testa persistência de versões/nós, autorização, transação, falha de `chat_artifacts`, XSS/escaping, PDF binário, PNG ou chamadas ao BFF.
- `builder.functions.test.ts:71-96` verifica presença de exports e tipos por leitura de arquivo; não executa CRUD, RLS, concorrência ou publicação.

Testes necessários antes de declarar o domínio real:

1. Teste de componente para cada combinação de callbacks do `ChatArtifactCard` e para o caminho real do `AIChatShell`; afirmar que “Abrir no Builder” navega para a rota esperada e que exportações aparecem quando devem.
2. Teste de contrato que gera artefato, lê com `getExperienceDocument` e confirma que os mesmos blocos aparecem no Builder.
3. Teste de integração em banco para RLS cross-tenant, papel `customer`, membership de loja, `created_by` forjado e links polimórficos.
4. Teste de falha em cada etapa de `sendAiConversationMessage`/publish e verificação de rollback/ausência de órfãos.
5. Teste de idempotência concorrente para create/get-or-create, save/publish, `chat_artifacts` e document-artifacts.
6. Teste de CSV com aspas, `;`, newline, Unicode, célula iniciada por `=`, ausência de rows e dados nulos.
7. Teste de exportação real verificando MIME, bytes, download e conteúdo, não apenas presença de `<!DOCTYPE html>`.
8. Teste de custo/telemetria comparando tokens e custo com resposta do provedor, incluindo retry e timeout.
9. Teste de ciclo/órfão de `parent_id` e payload máximo no save/publish.
10. Teste de indisponibilidade de banco distinguindo `not_found`, `unconfigured` e erro transitório.

## 11. Conclusão por promessa

- **Artefato renderizado no chat:** **REAL** no sentido de o Shell consumir e renderizar payload.
- **Artefato persistido em `chat_artifacts`:** **PARCIAL**; há inserts, mas sem transação e com falha ignorada.
- **Abrir no Builder:** **PARCIAL/quebrado** no caminho principal.
- **Versionamento/histórico no Chat:** **PARCIAL**; campo existe, fluxo de histórico não.
- **Builder CRUD/save:** **REAL no caminho feliz**, **PARCIAL operacionalmente** por autorização inconsistente, ausência de transação e ciclos.
- **Publicação:** **PARCIAL**; troca de estado não atômica e sem lock.
- **PDF:** **PARCIAL**; impressão/HTML PDF-ready, não PDF real ligado à UI.
- **CSV:** **PARCIAL/quebrado** por exportação local e divergência com fallback visual.
- **JSON/PNG/PPTX:** **AUSENTE no cartão**; apenas saídas textuais parciais no serviço de composição.
- **Artefatos documentais:** **REAL para upsert/link idempotente**, **PARCIAL para extração e integridade de entidade**.
- **RLS/tenancy:** **PARCIAL**; há policies, mas o Chat artifact bypass por autor, o papel não é consistente e links não validam alvo.
- **Streaming:** **AUSENTE no caminho auditado**; somente estado visual/propriedade.
- **Retries:** **PARCIAL**; timeout/error boundary, sem retry confiável.
- **Custo de IA:** **AUSENTE como auditoria financeira**; telemetria do resolver legado é fixa/sintética.
- **Dados reais:** **PARCIAL/AUSENTE** conforme o caminho; o resolver legado e o compositor de Builder usam dados sintéticos/presets demonstráveis.
