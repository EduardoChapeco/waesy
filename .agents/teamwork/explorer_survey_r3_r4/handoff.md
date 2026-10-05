# Relatório de Auditoria e Handoff — R3 (Copilot Resilience & MCP) & R4 (Mining Engines)

**Data:** 2026-10-04  
**Agente:** Explorer Survey R3 & R4  
**Diretório de Trabalho:** `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\explorer_survey_r3_r4`  
**Escopo:** Requisitos R3 e R4 da ordem canônica (Prompt 2026-10-04T03:35:00Z)  

---

## 1. Observation (Observações Fatuais e Evidências Diretas)

### 1.1 R3: Copilot Chat, Máquina de Estados e Protocolo MCP

1. **Declaração Formal da Máquina de Estados de 13 Fases:**
   - No documento normativo de raiz `CHAT_CONTRACT.md` (linhas 10-12):
     ```markdown
     ## 2. Máquina de Estados (13 Estados Oficiais)
     `RECEIVED` -> `UNDERSTANDING` -> `NEEDS_CLARIFICATION` -> `PLANNED` -> `WAITING_APPROVAL` -> `RUNNING` -> `WAITING_TOOL` -> `PARTIAL_RESULT` -> `VALIDATING` -> `COMPLETED` | `FAILED_RETRYABLE` | `FAILED_FINAL` | `CANCELLED`.
     ```
   - No arquivo `AUDIT_STATUS.md` (linha 18):
     `| **07** | **Contrato de Conversação** | COMPLETED | CHAT_CONTRACT.md | Máquina de estados de 13 fases formalizada |`
   - No arquivo `DECISION_LOG.md` (linha 16):
     `- Decisão: Formalização da separação em 4 camadas (...), com contrato de 13 fases para o chat e catálogo completo de skills.`

2. **Ausência da FSM de 13 Fases no Código de Produção (`src/`):**
   - Em `src/types/chat.ts` (linhas 13-30), os status declarados são apenas 4 para passos e 5 para mensagens:
     ```typescript
     export type AIActivityStepStatus = "running" | "completed" | "failed" | "cancelled";
     ```
     E em `src/components/chat/ai-chat-shell.tsx` (linha 66):
     ```typescript
     status: "sending" | "sent" | "delivered" | "read" | "failed";
     ```
   - Busca global por termos da FSM (`RECEIVED`, `WAITING_TOOL`, `FAILED_RETRYABLE`, `NEEDS_CLARIFICATION`, `WAITING_APPROVAL`) em todo o diretório `src/` retornou **0 ocorrências**. Não existe transição nem tipagem dessa FSM no runtime.

3. **Resiliência a Falhas em Ferramentas Externas / Harvesters:**
   - Em `src/services/autonomous-copilot-orchestrator.ts` (linhas 444-454):
     ```typescript
     const placesResult = await withExponentialRetry(
       () =>
         harvestAndPersistPlaces({
           query: task.targetQuery,
           city: task.city || "Chapecó",
           state: task.state || "SC",
           storeId: context.storeId,
           authorProfileId: identity?.id,
         }),
       "lead_mining:harvestAndPersistPlaces"
     );
     ```
     O helper `withExponentialRetry` realiza 3 tentativas (linhas 305-320) e, caso todas falhem, executa `throw lastError;` (linha 319).
   - Não existe bloco `try/catch` envolvendo as chamadas em `executeAutonomousCopilotTask` (linhas 434-845).
   - Em `src/services/ai-conversations.functions.ts` (linhas 581-586), a invocação de `executeAutonomousCopilotTask` não possui `try/catch`.
   - Em `src/routes/_store.copilot.tsx` (linhas 202-206), a falha atinge diretamente o `catch` da rota que dispara apenas `toast.error(err?.message || "Erro ao processar mensagem do Copilot.")` e finaliza com `isSending: false`. A mensagem do usuário fica sem resposta, e o chat não emite mensagem explicativa, resultado parcial ou botão de retentativa.

4. **Desconexão entre o Chat Copilot e o Protocolo MCP Real:**
   - A plataforma possui um servidor WebMCP formal implementado com 26 ferramentas canônicas:
     - Registro SSOT: `src/registries/mcp-tool-registry.ts` (`MCP_TOOL_REGISTRY`, linha 68).
     - Despachante resiliente: `src/services/mcp-server.functions.ts` (`executeMcpToolCall`, linha 307), com validação Zod, isolamento multi-tenant e tratamento de erro estruturado.
   - Porém, em `src/services/ai-conversations.functions.ts`, o pipeline `executeAiCopilotPipeline` (linhas 442-950) **não importa e não utiliza** `executeMcpToolCall`. Ele implementa despachos condicionais manuais (`if/else` para `search_places`, `estimate_mobility`, `travel_itinerary`, `legal_triage`, `create_ad`), mantendo o chat Copilot isolado das 26 MCP tools registradas.

5. **Tratamento e Sanitização de Conteúdo Web Não-Confiável:**
   - A camada de segurança possui o módulo `src/lib/ai/prompt-shield.ts`, com:
     - `inspectPromptSecurity` (linha 108): bloqueia injeções conhecidas, personas DAN e delimitadores maliciosos.
     - `buildSandboxedPromptPayload` (linha 168): envelopa dados não-confiáveis na tag `<user_untrusted_data>` com mandato de prioridade 0.
     - `sanitizeAiOutput` (linha 211): redacta credenciais (chaves Google, OpenAI, Anthropic, Supabase, JWTs).
   - **Gaps identificados:**
     - Em `src/services/ai-conversations.functions.ts` (linhas 538-553), `executeAiCoreGateway` é chamado repassando `prompt: userPrompt` diretamente, sem aplicar `buildSandboxedPromptPayload`.
     - Textos minerados da web externa (nomes de estabelecimentos, dados de processos judiciais, conteúdo raspado de páginas) são inseridos em `artifact.data` e na resposta de chat sem escape defensivo adicional de injeção indireta de prompt.

6. **Emissão de Artefatos Vivos:**
   - Artefatos são tipados em `src/types/chat.ts` (`ChatArtifactData`, linha 42) e renderizados visualmente em `src/components/chat/chat-artifact-card.tsx`.
   - O orquestrador (`autonomous-copilot-orchestrator.ts`) emite artefatos de tipo `spreadsheet`, `document` e `landing_page` (linhas 470, 498, 537, 607, 655, 701, 734, 779, 826).
   - A emissão ocorre **exclusivamente em lote síncrono** ao término da requisição no servidor. Não há suporte a streaming de artefatos ou emissão incremental progressiva durante a execução de ferramentas.

---

### 1.2 R4: Motores de Mineração em `src/services/mining/`

1. **As 8 Verticais Industriais Mapeadas:**
   - Localizadas e verificadas em `src/services/mining/crawler-batch-engine.ts` (linhas 96-444):
     1. **Vagas & Empregos (`jobs`):** `extractAndPersistJobOpportunity` (linha 97).
     2. **Estabelecimentos & Diretório (`directory_listings`):** `harvestAndPersistPlaces` via Overpass/Nominatim (linha 127).
     3. **Licitações & Compras Públicas (`mined_tenders`):** `harvestAndPersistPncpTenders` via PNCP API oficial (linha 150).
     4. **Imóveis & Imobiliárias (`directory_listings`):** `harvestAndPersistRealEstate` (linha 176).
     5. **Leilões & Leiloeiros (`directory_listings`):** `harvestAndPersistAuctions` (linha 204).
     6. **RSS & Atom Feeds (Descoberta):** `parseFeed` com expansão de seeds (linha 233).
     7. **Eventos & Agenda Cultural (`events`):** `harvestAndPersistEvent` (linha 280).
     8. **Notícias & Jornalismo Regional (`news_articles`):** `extractContentMechanically`, `validateMechanicalCompleteness` e `curateWithEditorialSquad` (linha 314).
   - Motores especializados complementares em `src/services/mining/`:
     - `datajud-harvester.ts`: Processos Judiciais do CNJ DataJud.
     - `places-cnpj-cross-enricher.ts` / `src/lib/mining/cnpj-enrichment.engine.ts`: Dados cadastrais e QSA da Receita Federal / BrasilAPI.
     - `specialized-extractors.ts`: Extração de receitas Schema.org e vinculação de insumos ao estoque (BOM).

2. **Circuit Breakers por Domínio:**
   - Implementado em `src/lib/mining/crawler-circuit-breaker.ts` na classe `CrawlerCircuitBreaker`.
   - Possui 3 estados formais: `CLOSED`, `OPEN`, `HALF_OPEN` (linha 8).
   - Gerenciamento isolado por chave de domínio (`Map<string, DomainCircuitStatus>`, linha 30).
   - Cooldown configurável (padrão 30s) e limite de 3 falhas consecutivas antes da abertura (linhas 33-35).
   - Timeout rígido por chamada (8s).
   - Testes unitários dedicados em `src/lib/mining/circuit-breaker.test.ts` (8 testes passando).

3. **Deduplicação por Similaridade Jaccard:**
   - Implementado em `src/services/mining/semantic-deduplicator.ts`:
     - `normalizeAndTokenize` (linha 21): remoção de diacríticos, caracteres especiais e lista fechada de stopwords em português.
     - `computeJaccardSimilarity` (linha 31): cálculo de interseção sobre união de conjuntos de tokens.
     - `detectStoryCluster` (linha 55): consulta artigos das últimas 48 horas no banco `mined_articles`, aplicando limiar de 0.55 para agrupamento em cluster e 0.80 para marcação de duplicata estrita.
   - Testes unitários em `src/services/mining/industrial-crawlers.test.ts` (linhas 9-41) cobrem identidade (score = 1.0), variação de manchete (score >= 0.35) e temas não relacionados (score < 0.20).

4. **Inserção e Processamento na Fila Assíncrona (`crawl_queue`):**
   - A tabela `crawl_queue` é a espinha dorsal de desacoplamento do pipeline:
     - `crawler-batch-engine.ts` (linhas 58-64): busca itens `pending` ordenados por prioridade e idade, transitando para `processing` e posteriormente `completed` ou `failed`.
     - Inserção em lote / upsert por sitemaps em `src/lib/mining/sitemap-crawler.engine.ts` (linha 218).
     - Roteamento e enfileiramento periódico em `src/services/crawler-sources.functions.ts` e `src/services/mining.functions.ts`.
     - Acionamento desacoplado configurado para Cloudflare Workers / Cron Trigger em `/api/mining/worker` e `/api/cron/mining-worker`.

5. **Invariante M01 — Ausência de Mocks Sintéticos:**
   - Todo o código em `src/services/mining/` declara e cumpre `ZERO MOCKS`.
   - `src/services/mining/pncp-and-indicators.test.ts` (linhas 25-34) testa explicitamente a resiliência a falhas de rede: quando o fetch falha, a função devolve lista vazia honesta `[]`, sem fabricar dados fictícios.
   - `src/services/mining/integrity-gate.ts` (linhas 134-153): bloqueia URLs de teste, pixels, gravatar e `images.unsplash.com`. A função `getFallbackThematicImage` retorna explicitamente string vazia `""` (Regra V143 Truth Engine).

6. **Status da Suíte de Testes Vitest:**
   - Execução via comando:
     `node ./node_modules/vitest/vitest.mjs run src/services/mining/`
   - **Resultado:**
     - `src/services/mining/pncp-and-indicators.test.ts`: 3/3 aprovados.
     - `src/services/mining/industrial-crawlers.test.ts`: 9/9 aprovados.
     - **Total:** 12/12 testes passando (100% de taxa de aprovação, 1.21s).
   - Testes correlacionados:
     - `src/lib/mining/circuit-breaker.test.ts`: 8/8 aprovados.
     - `src/services/autonomous-copilot.test.ts`: 11/11 aprovados.
     - **Total Geral das Camadas R3/R4:** 31/31 testes passando (0 falhas).

---

## 2. Logic Chain (Cadeia de Raciocínio Lógico)

1. **Da discrepância entre contrato e runtime da FSM (R3):**
   - *Observação:* `CHAT_CONTRACT.md` define 13 estados (`RECEIVED` a `CANCELLED`), mas `src/types/chat.ts` e `src/components/chat/ai-chat-shell.tsx` utilizam apenas status básicos de transporte (`sending`, `delivered`, `failed`).
   - *Raciocínio:* O contrato documental foi formalizado na Fase 7 da auditoria histórica, porém a camada de tipos do TanStack Router/React e o BFF em `ai-conversations.functions.ts` não foram refatorados para modelar a FSM explicitamente.
   - *Conclusão:* A FSM de 13 fases é atualmente uma especificação sem implementação mecânica no runtime do Copilot.

2. **Da fragilidade do chat diante de falhas de rede em ferramentas (R3):**
   - *Observação:* `withExponentialRetry` re-lança erros após esgotar 3 tentativas em `lead_mining` e outros harvesters, e `executeAutonomousCopilotTask` não envolve essas chamadas em fallback seguro.
   - *Raciocínio:* Se o Overpass API, a BrasilAPI ou o DataJud estiverem indisponíveis ou responderem com timeout, a Promise é rejeitada. Como o BFF `executeAiCopilotPipeline` não captura essa rejeição, ela estoura no cliente como um erro genérico via toast.
   - *Conclusão:* Falta um isolamento defensivo de nível de ferramenta que capture o erro, registre a falha na trilha de atividades como `status: "failed"` e devolva uma resposta útil informando a indisponibilidade momentânea da ferramenta com opção de retentativa (`FAILED_RETRYABLE`), conforme preconiza a Seção 3.3 do `CHAT_CONTRACT.md`.

3. **Da desconexão com o protocolo MCP (R3):**
   - *Observação:* Existem 26 ferramentas no registro canônico MCP (`mcp-tool-registry.ts`), mas o Copilot executa apenas branches manuais em `ai-conversations.functions.ts`.
   - *Raciocínio:* O protocolo WebMCP foi estruturado para consumo externo (`/api/mcp/v1/tools/call` e `/api/webmcp.json`), mas não foi plugado como o despachante primário de ferramentas do chat interno.
   - *Conclusão:* O Copilot não se beneficia do ecossistema de 26 ferramentas MCP, redundando código de despacho e limitando suas capacidades.

4. **Da integridade e maturidade dos motores de mineração (R4):**
   - *Observação:* Todas as 8 verticais industriais estão implementadas e roteadas no `crawler-batch-engine.ts`, o `CrawlerCircuitBreaker` isola falhas por domínio com 3 estados, a similaridade Jaccard está coberta por testes, a fila `crawl_queue` opera de forma desacoplada sem dependência de contexto HTTP, e não há mocks sintéticos.
   - *Raciocínio:* Os motores em `src/services/mining/` e `src/lib/mining/` atendem rigorosamente aos mandatos de arquitetura desacoplada, Invariante M01 e governança de dados.
   - *Conclusão:* O subsistema R4 encontra-se funcionalmente sólido, com testes em 100% de aprovação e pronto para escala contínua.

---

## 3. Caveats (Ressalvas e Limitações)

1. **Contexto de Servidor em Produção vs Ambiente Local:**
   - Os testes com Vitest utilizam mocks transparentes de chamadas de rede externas (ex: `globalThis.fetch` simulando timeout no teste de PNCP) para garantir testes determinísticos e evitar rate limits contra APIs de órgãos públicos durante a esteira de desenvolvimento.
2. **Streaming e WebSockets no Cloudflare Pages:**
   - A emissão de artefatos ao vivo dependerá da arquitetura de streaming do TanStack Start e do suporte a Server-Sent Events (SSE) ou WebSockets no runtime Cloudflare Workers/Pages. Atualmente, todas as server functions operam via HTTP POST síncrono.
3. **Proibição Estrita de Build / Typecheck:**
   - Em conformidade com a Invariante R6 do projeto, não foram executados comandos como `npm run typecheck` ou `npm run build`. A verificação foi conduzida via Vitest nos arquivos de escopo e inspeção estática do código-fonte.

---

## 4. Conclusion (Diagnóstico e Recomendações Estruturadas)

### 4.1 Resumo do Diagnóstico

| Componente | Requisito | Status Atual | Ação Recomendada |
| :--- | :--- | :--- | :--- |
| **FSM do Copilot** | 13 fases determinísticas | **Gap (Apenas Especificação)** | Implementar enum `CopilotFsmPhase` e transições formais em `src/types/chat.ts` e `ai-conversations.functions.ts`. |
| **Resiliência a Ferramentas** | Não travar chat em falhas de API | **Parcialmente Vulnerável** | Envolver chamadas a harvesters em `try/catch` defensivo, gerando step `failed` e transição para `FAILED_RETRYABLE`. |
| **Integração MCP** | Consumo das 26 MCP Tools | **Desconectado** | Rotear chamadas de ferramentas do Copilot através de `executeMcpToolCall` de `mcp-server.functions.ts`. |
| **Sanitização Web** | Proteção contra injeção e dados não-confiáveis | **Parcial** | Aplicar `buildSandboxedPromptPayload` na chamada ao `executeAiCoreGateway` e escapar dados minerados. |
| **Emissão de Artefatos** | Artefatos vivos no chat | **Funcional (Síncrono)** | Manter suporte a `spreadsheet`/`document`/`landing_page`; planejar streaming SSE em fase posterior. |
| **8 Verticais Industriais** | Execução sem mocks | **100% Conforme** | Manter e consolidar roteamento no `crawler-batch-engine.ts`. |
| **Circuit Breakers** | Isolamento por domínio | **100% Conforme** | Circuit breaker operacional com 3 estados (`CrawlerCircuitBreaker`). |
| **Deduplicação Jaccard** | Clusterização semântica 48h | **100% Conforme** | Testes passando com 100% de conformidade em `semantic-deduplicator.ts`. |
| **Fila Assíncrona** | Desacoplamento via `crawl_queue` | **100% Conforme** | Operação desacoplada sem dependência de contexto de requisição HTTP. |
| **Suíte de Testes R4** | `vitest run src/services/mining/` | **100% Aprovado** | 12/12 testes passando. |

### 4.2 Tarefas Recomendadas de Implementação

1. **Tarefa T3.1 (FSM de 13 Fases no Runtime):**
   - Criar `src/types/copilot-fsm.ts` exportando o tipo unificado dos 13 estados:
     `"RECEIVED" | "UNDERSTANDING" | "NEEDS_CLARIFICATION" | "PLANNED" | "WAITING_APPROVAL" | "RUNNING" | "WAITING_TOOL" | "PARTIAL_RESULT" | "VALIDATING" | "COMPLETED" | "FAILED_RETRYABLE" | "FAILED_FINAL" | "CANCELLED"`.
   - Adicionar o campo `fsmPhase?: CopilotFsmPhase` ao payload de `ChatMessageItem` e no retorno de `executeAiCopilotPipeline`.

2. **Tarefa T3.2 (Blindagem Defensiva de Harvesters no Copilot):**
   - Em `src/services/autonomous-copilot-orchestrator.ts`, envolver as execuções de `harvestAndPersistPlaces`, `enrichCnpj`, `harvestAndPersistDataJudProcess` e consultas ao Supabase em bloco defensivo:
     - Em caso de falha da ferramenta externa, marcar o `AIActivityStep` como `failed`.
     - Emitir mensagem amigável no chat (ex: *"Não foi possível consultar os dados externos no momento devido à indisponibilidade do provedor."*) com botão ou sugestão de retentativa.
     - Nunca propagar exceção não tratada para a rota do TanStack Router.

3. **Tarefa T3.3 (Unificação do Copilot com o Protocolo WebMCP):**
   - Conectar o dispatcher de ferramentas do `executeAiCopilotPipeline` ao `executeMcpToolCall` (`src/services/mcp-server.functions.ts`).
   - Permitir que o modelo acione dinamicamente qualquer uma das 26 ferramentas do `MCP_TOOL_REGISTRY`.

4. **Tarefa T3.4 (Envelopamento com Prompt Shield Sandboxing):**
   - Em `src/services/ai-conversations.functions.ts` (linha 538), encapsular o `userPrompt` com `buildSandboxedPromptPayload(userPrompt, systemPrompt)`.

---

## 5. Verification Method (Método de Verificação Independente)

1. **Execução da Suíte de Testes de Mineração:**
   ```powershell
   node ./node_modules/vitest/vitest.mjs run src/services/mining/
   ```
   - **Condição de Validação:** 2 arquivos de teste (`pncp-and-indicators.test.ts` e `industrial-crawlers.test.ts`), 12 testes executados, 12 aprovados (0 falhas).

2. **Execução dos Testes Correlacionados de Circuit Breaker e Copilot:**
   ```powershell
   node ./node_modules/vitest/vitest.mjs run src/lib/mining/circuit-breaker.test.ts src/services/autonomous-copilot.test.ts
   ```
   - **Condição de Validação:** 2 arquivos de teste, 19 testes executados, 19 aprovados (0 falhas).

3. **Inspeção Estática dos Arquivos-Chave:**
   - Verificar contrato normativo: `CHAT_CONTRACT.md` (linhas 10-12).
   - Verificar ausência de estados FSM em runtime: buscar `FAILED_RETRYABLE` em `src/` (0 resultados).
   - Verificar 8 verticais: inspecionar `src/services/mining/crawler-batch-engine.ts` (linhas 96-370).
   - Verificar integridade de imagens e zero mocks: inspecionar `src/services/mining/integrity-gate.ts` (linhas 140-153).
   - Verificar circuit breaker: inspecionar `src/lib/mining/crawler-circuit-breaker.ts`.
