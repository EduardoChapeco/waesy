# SPEC-20261116-CHAT-PERSISTENCE-INCREMENTAL-SYNC

**Status:** Aprovada para Execucao (Onda Corretiva End-to-End)  
**Data (ISO):** 2026-11-16  
**Modulo:** Cloudflare Worker Request Isolation, Persistencia Idempotente WhatsApp, Sync Incremental & Cache de Atendimento Ao Vivo  
**Pre-requisitos Normativos:** `AGENTS.md` (B.1-B.51), `docs/design/DESIGN.md`, `docs/design/DESIGN-LINT.md`

---

## 1. Diagnostico Forense

1. **Erro Cross-Request no Cloudflare Workers (`handle_cross_request_promise_resolution`):** `IDENTITY_INFLIGHT_MAP` em `src/lib/identity.server.ts` (e mapas equivalentes em `micro-cache.ts`, `ai-core-gateway.functions.ts`, `infotravel.ts`, `copilot-execution-persistence.ts`, `serverEntryPromise` em `src/server.ts`) armazenam `Promise` ativa ligada ao `IoContext` da requisicao HTTP de origem. Quando a requisicao criadora e abortada ou finalizada antes da liquidacao, o runtime descarta o settle e trava o `Map` global do isolate, quebrando todas as chamadas subsequentes (`getStoreSettings`, `listWorkspaceWhatsAppInstances`, `listIntranetChannels`) no `loader` de `src/routes/workspace.atendimento.chat.tsx`.
2. **Perda Silenciosa em Lotes de `chat_messages`:** `runEvolutionDeltaSyncForInstance` (`whatsapp-evolution-sync.server.ts`) valida duplicatas apenas dentro de `touchedThreadIds`, enquanto o banco impoe indices unicos globais (`uq_chat_messages_external_message` e `chat_messages_provider_message_uq`). O `.insert(chunk)` de 100 linhas sem `ignoreDuplicates`/fallback faz com que qualquer 1 mensagem repetida derrube silenciosamente todas as 100 mensagens do lote, deixando conversas vazias e mantendo `rawMessages.length <= 1` indefinidamente.
3. **Falso `"Sem mensagens"` e Timestamps Ficticios (`há 18s`):** `listChatThreads` consulta `chat_messages` em lote unico com `.limit(400)` compartilhado entre ate 150 threads e nao faz fallback para `chat_threads.last_message_text`. Em paralelo, updates tecnicos de `metadata`/`last_history_synced_at` disparam `chat_threads_updated_at` (`set_updated_at()`), atualizando `updated_at` para `now()` e gerando eventos `UPDATE` no Realtime mesmo sem mensagem nova.
4. **Re-Sync Bloqueante e Sem Cursor:** `getChatMessages` bloqueia abertura e polling a cada `> 4s` (ou `rawMessages.length <= 1`) chamando `/chat/findMessages` sequencialmente (ate 12s), sem atualizar `last_evo_msg_sync_at` quando vazio. `runEvolutionDeltaSyncForInstance` re-busca `/chat/findChats` + `/chat/findContacts` completos e usa margem regressiva `- 60_000` ms sem cursor incremental real por thread.
5. **Zero Cache no Cliente & Loop Realtime/Customer360:** `AtendimentoChatWorkspace` descarta `messages` a cada troca de thread, dispara `listChatThreads` redundante no mount (`statusFilter`), faz polling de `reloadActiveMessages` a cada 5s com Realtime ativo, e reage a `UPDATE` tecnico de `chat_threads` recarregando threads e mensagens. `Customer360Sidebar` nao cacheia por `threadId` e `getCustomer360Context` executa `fetchProfilePictureUrl` + `.update()` em `chat_threads` durante `GET`, reiniciando `"Carregando Perfil do Cliente..."`.

---

## 2. Requisitos Normativos (EARS)

1. **EARS-CP-01 (Isolamento Estrito de Promises por Requisicao no Worker):** WHEN executing inside Cloudflare Workers (`compatibility_date >= 2024-10-14`), THE SYSTEM SHALL NEVER store or await a pending I/O `Promise` in module-global state across distinct HTTP requests; in-flight deduplication SHALL be scoped strictly to the current request context (`evt.context`) via a shared helper (`getRequestScopedInflightMap`), and `src/server.ts` SHALL cache only the resolved `ServerEntry` object.
2. **EARS-CP-02 (Persistencia Idempotente Global Sem Perda de Lote):** WHEN persisting WhatsApp messages from Evolution sync, webhook ingestion, or on-demand thread bootstrap, THE SYSTEM SHALL run global deduplication on `external_message_id` and `(provider_name, provider_message_id)`, execute conflict-safe batch insertion with automatic row-by-row fallback on constraint collision, and NEVER drop valid new messages because of an existing duplicate.
3. **EARS-CP-03 (Cursor Incremental Real e Trigger Nao-Invasivo em `chat_threads`):** THE SYSTEM SHALL persist per-thread sync cursor state (`history_bootstrap_done`, `sync_cursor_ms` / `sync_cursor_at`) and update `chat_threads.updated_at` ONLY when substantive thread fields (`status`, `last_message_at`, `last_message_text`, `assigned_to_profile_id`, `department`, `tags`, `priority`, `internal_notes`, `lead_id`, `customer_id`, `guest_name`) change, eliminating false `"há Xs"` bumps and redundant Realtime churn.
4. **EARS-CP-04 (Leitura DB-First e Preview Fiel em `listChatThreads` / `getChatMessages`):** WHEN loading threads or messages, `listChatThreads` SHALL resolve the latest public message per thread (via SQL `DISTINCT ON` RPC with batched fallback) and ALWAYS fall back to `chat_threads.last_message_text`; `getChatMessages` SHALL return persisted Postgres rows immediately, support incremental `afterCreatedAt` cursor fetches, and run at most one initial Evolution bootstrap per empty un-bootstrapped thread (unless explicit `forceSync: true`).
5. **EARS-CP-05 (Customer 360 Sem Side-Effects no GET):** WHEN `getCustomer360Context` runs, THE SYSTEM SHALL read exclusively from persisted tables without external Evolution network calls or `chat_threads` writes on `GET`, keeping profile photo resolution in the explicit `syncContactProfileFromWhatsApp` mutation and batch contact sync.
6. **EARS-CP-06 (Cache Persistente no Cliente e Eliminacao de Resets):** WHILE using `AtendimentoChatWorkspace` and `Customer360Sidebar`, THE SYSTEM SHALL cache messages, thread lists, and Customer 360 contexts per `(storeId, threadId)` via TanStack Query + safe `sessionStorage` snapshot hydration, merge incremental deltas/Realtime events in-place without clearing active messages or showing spinners on already-cached threads, eliminate duplicate mount/5s polling under live Realtime, and provide explicit empty/loading/error+retry states (DL-11/12/13).

---

## 3. Escopo de Arquivos Autorizado

- `docs/specs/SPEC-20261116-CHAT-PERSISTENCE-INCREMENTAL-SYNC.md` (novo)
- `docs/design/DECISIONS.md` (registro de decisao)
- `supabase/migrations/20270531000000_chat_incremental_persistence_and_cursors.sql` (novo)
- `src/lib/request-inflight.ts` (novo — helper compartilhado de deduplicacao intra-requisicao)
- `src/lib/identity.server.ts`
- `src/lib/cache/micro-cache.ts`
- `src/server.ts`
- `src/services/ai-core-gateway.functions.ts`
- `src/services/infotravel.ts`
- `src/services/copilot-execution-persistence.ts`
- `src/services/whatsapp-message-persistence.server.ts` (novo — persistencia idempotente compartilhada)
- `src/services/whatsapp-evolution-sync.server.ts`
- `src/services/whatsapp-provider-webhook.server.ts`
- `src/services/chat.functions.ts`
- `src/services/store.functions.ts`
- `src/services/whatsapp-channel-instances.functions.ts`
- `src/services/intranet.functions.ts`
- `src/lib/chat-client-cache.ts` (novo — cache incremental e merge seguro no cliente)
- `src/components/atendimento/AtendimentoChatWorkspace.tsx`
- `src/components/chat/customer-360-sidebar.tsx`
- `src/routes/workspace.atendimento.chat.tsx`
- `src/lib/__tests__/request-inflight-isolation.test.ts` (novo)
- `src/services/__tests__/chat-incremental-persistence-e2e.test.ts` (novo)

---

## 4. Criterios de Aceite

1. Zero uso de mapas globais de `Promise` compartilhados entre requisicoes no Worker (`identity.server.ts`, `micro-cache.ts`, `ai-core-gateway.functions.ts`, `infotravel.ts`, `copilot-execution-persistence.ts`, `server.ts`).
2. Lotes com mensagens duplicadas nao descartam mensagens novas; `listChatThreads` nunca retorna preview vazio quando ha mensagem ou `last_message_text`.
3. `getChatMessages` retorna imediatamente do banco sem re-sincronizar a cada 4s; suporte completo a `afterCreatedAt`.
4. Troca entre conversas com cache ja carregado renderiza instantaneamente sem spinner e preserva mensagens enviadas/recebidas; Customer 360 nao reinicia por updates tecnicos de thread.
5. `npm run typecheck`, `npx vitest run`, `npm run check:schema`, `npm run check:bff`, `npm run lint:design`, e `npm run build` com Exit Code `0`.
