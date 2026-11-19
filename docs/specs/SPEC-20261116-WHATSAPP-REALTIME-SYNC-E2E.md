# SPEC-20261116-WHATSAPP-REALTIME-SYNC-E2E

**Status:** Aprovada para Execucao (Onda Corretiva End-to-End)  
**Data (ISO):** 2026-11-16  
**Modulo:** WhatsApp Gateway (Evolution API), BFF/Webhooks/Workers, Postgres Realtime/RLS/Cron, Central de Atendimento Ao Vivo  
**Pre-requisitos Normativos:** `AGENTS.md` (B.1-B.51), `docs/design/DESIGN.md`, `docs/design/DESIGN-LINT.md`

---

## 1. Diagnostico Forense Empirico (Baseline 2026-11-16)

Evidencias coletadas em producao (`jfuebqmltksyznovhlwa`) e na Evolution API viva:

| Camada | Falha Comprovada | Evidencia Observada | Impacto no Produto |
|---|---|---|---|
| **Gateway & Registro Webhook** | Origem divergente em `DEFAULT_WEBHOOK_ORIGIN` (avaliacao em build-time com `process.env` e reescrita forcada `pages.dev` -> `waesy.com.br`), divergencia `externalName` vs `instance_key`, omissao de `ensureEvolutionWebhookRegistered` quando `connectionState === 'open'` ou QR retornado na criacao, `webhookBase64: true` derrubando midias grandes e payloads `/instance/create` sem `enabled: true` / `headers` / eventos completos. | `whatsapp_channel_instances.webhook_url` aponta `usewaesy.pages.dev`, Evolution `geral` aponta `waesy.com.br`; `setor_2` e `principal` possuem apenas 5 eventos sem `MESSAGES_SET`/`CHATS_*`/`CONTACTS_*`/`GROUPS_*`; dois `videoMessage` reais em `14:06:37Z` e `14:07:22Z` na Evolution nao chegaram a `whatsapp_provider_webhook_events`. | Perda silenciosa de webhooks de video/midia pesada, falha de entrega `fromMe` (ultimo `outbound_echo` processado em `2026-11-12T11:32Z`) e deriva entre banco e VPS. |
| **Motor de Sincronizacao & Webhooks** | `syncWhatsAppChatsFromEvolution` sobrescreve `storeId` via `(identity as any).store_id`, dispara loops N+1 sem limite para 475 conversas e 3.110 contatos dentro de request Cloudflare Worker (estourando subrequests/tempo) sem `try/catch/finally`; `messages.set`, `chats.*`, `contacts.*` e `groups.*` nao sao roteados no webhook; `last_webhook_at` nunca atualiza em mensagens recebidas; `sync_mode = 'new_only'` e nenhuma conexao/cron dispara delta sync automatico. | 2 jobs em `whatsapp_history_sync_jobs` (`13:59:27Z` e `14:03:21Z` de 2026-11-16) presos eternamente em `status = 'running'`, `imported_chats = 0`, `completed_at = null`; `158` eventos em `whatsapp_provider_webhook_events` presos em `processing_status = 'received'` desde `2026-11-12`; `setor_2` e `principal` exibidos como `disconnected` no Waesy enquanto `connectionStatus = 'open'` na Evolution. | Clicar em sincronizar falha silenciosamente; reconexao via QR nao sincroniza automaticamente; mensagens enviadas do celular (`fromMe`) ou recebidas durante quedas nao sao recuperadas automaticamente. |
| **Workers & Agendamento Cron** | Nenhum job WhatsApp existe em `cron.job`; `whatsapp_worker_heartbeats` inativo desde `2026-11-12T01:51Z`; `/api/internal/whatsapp-outbox-worker` le `process.env` puro em vez de `getEnvVar`. | `cron.job` possui 11 jobs (mining/faturas/boosts) e `0` jobs para outbox, agendamentos, replay de webhook ou health-check WhatsApp. | Mensagens agendadas (`whatsapp_scheduled_messages`), fluxos automaticos, retries da fila `whatsapp_outbox` e delta sync em background nao executam. |
| **Postgres RLS & Realtime** | `whatsapp_channel_instances` e `whatsapp_outbox` tem politicas `deny_client` (`USING (false)`), bloqueando 100% dos eventos Realtime; `whatsapp_history_sync_jobs`, `whatsapp_groups_directory` e `whatsapp_scheduled_messages` estao fora de `supabase_realtime` (`REPLICA IDENTITY` default); `20270330000000` tinha diff local removendo `stores.owner_id` inexistente sem fallback `context_profile_id`/`claimed_by` no `SELECT`. | Verificado em `pg_policies` e `pg_publication_tables`: `whatsapp_channel_instances_deny_client (false)` anula a assinatura Realtime de `AtendimentoChatWorkspace.tsx:1217`, e `whatsapp_outbox_deny_client (false)` anula `whatsapp-operations-metrics-panel.tsx:35`. | Tela de Chat, QR Code, Canais e Grupos nao reflete em tempo real mudancas de conexao, progresso de sync, edicoes/status de entrega nem novas conversas hidratadas. |
| **UI Ao Vivo (`Atendimento`)** | `AtendimentoChatWorkspace.tsx` assina `chat_messages` sem filtro ou enriquecimento para novas threads, ignora status do socket (`CHANNEL_ERROR` / reconexao), nao dispara catch-up ao reconectar/focar nem delta sync incremental; `workspace.atendimento.whatsapp.tsx` e `workspace.atendimento.grupos.tsx` nao possuem assinatura Realtime. | Assinaturas apenas estaticas em carga inicial; usuarios dependem de recarregar a pagina para ver novas conversas hidratadas, status real da instancia ou conclusao de importacao. | Sensacao de canal conectado mas travado/sem atualizacao ao vivo. |

---

## 2. Requisitos Normativos em Sintaxe EARS

### R1 — Gateway, URL Canonica e Registro Resiliente de Webhooks Evolution
1. **EARS-WRS-01 (Origem Runtime Canonica):** WHEN any BFF service constructs an Evolution webhook URL, THE SYSTEM SHALL resolve the origin dynamically at runtime via `getEnvVar("WHATSAPP_WEBHOOK_ORIGIN") || getEnvVar("VITE_SITE_URL") || getEnvVar("VITE_APP_URL")` and produce a single canonical URL per instance shared between database persistence and Evolution `/webhook/set`.
2. **EARS-WRS-02 (Payload Completo Sem Queda por Base64):** WHEN creating or synchronizing an Evolution instance (`_connectWhatsAppQrCodeInstance`, `_syncWhatsAppInstanceStatus`, `syncWhatsAppChatsFromEvolution`, or webhook health recovery), THE SYSTEM SHALL register `/webhook/set` with `enabled: true`, `webhookByEvents: false`, `base64: false` (preventing oversized media webhook drops), authentication headers (`apikey` and `x-api-key`), and full event coverage (`QRCODE_UPDATED`, `CONNECTION_UPDATE`, `MESSAGES_SET`, `MESSAGES_UPSERT`, `MESSAGES_UPDATE`, `MESSAGES_DELETE`, `SEND_MESSAGE`, `CHATS_UPSERT`, `CHATS_UPDATE`, `CONTACTS_UPSERT`, `CONTACTS_UPDATE`, `GROUPS_UPSERT`, `GROUP_UPDATE`, `GROUP_PARTICIPANTS_UPDATE`).
3. **EARS-WRS-03 (Self-Healing de Status e Telemetria):** WHEN an authentic Evolution webhook (`message`, `send.message`, `messages.set`, `messages.update`, `chats.*`, `contacts.*`, `groups.*`, or `connection.update`) is accepted, THE SYSTEM SHALL update `public_config.last_webhook_at`, `public_config.last_webhook_event`, and self-heal `status = 'connected'` when real traffic proves the session is active, while respecting throttling to avoid write amplification.

### R2 — Ingestao Universal de Eventos, Hidratacao `@lid` e Motor de Sync Incremental
4. **EARS-WRS-04 (Eventos Nativos Evolution):** WHEN `handleUnofficialWhatsAppWebhook` receives `messages.set`, `send.message` (`SEND_MESSAGE`), `messages.upsert` (including `fromMe: true` e `@lid` com `remoteJidAlt`/`senderPn`), `messages.update` (ACK/leitura), `messages.delete` (revoke), `chats.upsert`/`chats.update`, `contacts.upsert`/`contacts.update`, or `groups.*`, THE SYSTEM SHALL persist/update corresponding records idempotently in `chat_threads`, `chat_messages`, and `whatsapp_groups_directory` without turning synthetic `@lid` identifiers into fake `+` E.164 phone numbers.
5. **EARS-WRS-05 (Isolamento de `storeId` e Finalizacao Garantida de Sync Jobs):** WHEN `syncWhatsAppChatsFromEvolution` starts, THE SYSTEM SHALL prioritize explicit validated `targetStoreId` over session `identity.store_id`, reap any stale `running` jobs older than 3 minutes, and wrap execution in `try/catch/finally` so every `whatsapp_history_sync_jobs` row always transitions deterministically to `completed` or `failed` with accurate counts and diagnostic notes.
6. **EARS-WRS-06 (Delta Sync Limitado para Cloudflare Workers):** WHILE importing chats and messages from Evolution, THE SYSTEM SHALL index `findContacts` in memory (`Map`), sort `findChats` by `updatedAt DESC`, enforce strict configurable bounds (`maxChats`, default `35` manual / `15` background delta), pre-fetch existing thread/message identifiers in batch, and call `/chat/findMessages` only for threads with newer activity or empty local history so Worker CPU and subrequest limits are never exceeded.
7. **EARS-WRS-07 (Auto-Sync na Conexao e Recuperacao Background):** WHEN an Evolution instance transitions to `connected` (`open`) via webhook or status check OR when `/api/cron/whatsapp-sync` / `syncWhatsAppDeltaNow` detects stale synchronization past cooldown, THE SYSTEM SHALL automatically execute a bounded incremental delta sync (discovering recent 1:1 chats, groups, `fromMe` phone echoes, and missed media messages) without manual user clicks.

### R3 — Workers Internos, Cron Autonomo e Replay de Eventos Presos
8. **EARS-WRS-08 (Auth Runtime em Workers e Cron):** WHEN `/api/internal/whatsapp-outbox-worker` or `/api/cron/whatsapp-sync` receives an execution request, THE SYSTEM SHALL validate bearer/header secrets using `getEnvVar` and `timingSafeEqual` (Zero-Trust fail-closed).
9. **EARS-WRS-09 (Orquestracao Cron Unificada):** WHEN `/api/cron/whatsapp-sync` executes, THE SYSTEM SHALL sequentially: (a) enqueue due `whatsapp_scheduled_messages`, (b) run `runWhatsAppOutboxWorker` recording `whatsapp_worker_heartbeats`, (c) reap expired `running` sync jobs, (d) replay up to 15 stuck `whatsapp_provider_webhook_events` (`processing_status = 'received'` older than 15s), and (e) reconcile connection health, webhook registration, and bounded delta sync for active stores.

### R4 — Postgres Realtime, Isolamento Multi-Tenant e Projecao Segura
10. **EARS-WRS-10 (Projecao Ao Vivo Zero-Trust `whatsapp_channel_live_state`):** THE SYSTEM SHALL maintain a secret-free projection table `public.whatsapp_channel_live_state` synchronized via database trigger from `public.whatsapp_channel_instances`, exposed to authenticated store staff under strict tenant RLS (`is_platform_admin() OR is_store_staff(store_id)`), with `REPLICA IDENTITY FULL` and membership in `supabase_realtime`, ensuring `secret_payload_encrypted` never crosses client RLS or Realtime WebSockets.
11. **EARS-WRS-11 (Cobertura Completa de `supabase_realtime` e RLS de Chat):** THE SYSTEM SHALL ensure `chat_threads`, `chat_messages`, `whatsapp_channel_live_state`, `whatsapp_outbox`, `whatsapp_outbox_attempts`, `whatsapp_history_sync_jobs`, `whatsapp_groups_directory`, `whatsapp_scheduled_messages`, `chat_departments`, `workspace_members`, `store_quick_answers`, `store_workflows`, and `whatsapp_campaigns` have `REPLICA IDENTITY FULL`, membership in `supabase_realtime`, and deterministic tenant-isolated `SELECT` policies (`is_store_staff` / `stores` ownership / `customer_id`), plus `pg_cron` dispatch scheduling for `/api/cron/whatsapp-sync`.

### R5 — Interface 100% Ao Vivo (`Atendimento` & Master) com Reconexao e Auto Catch-Up
12. **EARS-WRS-12 (Assinatura Realtime Resiliente com Catch-Up e Paridade Multi-Tela):** WHILE `/workspace/atendimento/*`, `/workspace/whatsapp/automacoes`, or `/admin-master/integracoes` is open, THE SYSTEM SHALL maintain authenticated Supabase Realtime channels (`supabase.realtime.setAuth` via `subscribeToTableChanges` and `getRealtimeChannel`), handle `INSERT`/`UPDATE`/`DELETE` across threads, messages (proactively hydrating missing `audio`/`image`/`sticker` URIs safely without bloating Postgres on `>5.5MB` blobs), instance live states, sync jobs, groups, departments, agent presence, quick answers, workflows, and campaigns, preserve active `channel_instance_id` filters, avoid stale SSR overwrites in governance saves, and update `chat_threads` on outbox dispatch.

---

## 3. Escopo de Arquivos Autorizado

- **Specs & Decisoes:**
  - `docs/specs/SPEC-20261116-WHATSAPP-REALTIME-SYNC-E2E.md` (novo)
  - `docs/design/DECISIONS.md` (registro de fechamento)
- **Banco de Dados & Migrations:**
  - `supabase/migrations/20270524000000_whatsapp_realtime_sync_rls_and_crons.sql` (novo; preserva `20270330000000` sem `s.owner_id` inexistente e aplica o estado final consolidado)
- **BFF, Webhooks, Workers & Infraestrutura:**
  - `src/services/whatsapp-evolution-config.server.ts` (novo)
  - `src/services/whatsapp-evolution-sync.server.ts` (novo)
  - `src/services/whatsapp-channel-instances.functions.ts`
  - `src/services/whatsapp-provider-webhook.server.ts`
  - `src/services/whatsapp-media.server.ts`
  - `src/services/whatsapp-outbound-adapters.server.ts`
  - `src/services/whatsapp-outbox.worker.ts`
  - `src/services/chat.functions.ts`
  - `src/services/realtime-channel.ts`
  - `src/lib/ai/worker-auth.ts`
  - `src/lib/server-client-noop-shim.ts`
  - `vite.config.ts`
  - `src/routes/api.internal.whatsapp-outbox-worker.ts`
  - `src/routes/api.cron.whatsapp-sync.ts` (novo)
- **UI Ao Vivo (`Atendimento`, Canais, Automacoes & Admin Master):**
  - `src/components/atendimento/AtendimentoChatWorkspace.tsx`
  - `src/components/atendimento/AtendimentoOverviewView.tsx`
  - `src/components/chat/whatsapp-operations-metrics-panel.tsx`
  - `src/components/chat/whatsapp-qr-connect-modal.tsx`
  - `src/routes/workspace.atendimento.index.tsx`
  - `src/routes/workspace.atendimento.whatsapp.tsx`
  - `src/routes/workspace.atendimento.grupos.tsx`
  - `src/routes/workspace.atendimento.atendentes.tsx`
  - `src/routes/workspace.atendimento.filas.tsx`
  - `src/routes/workspace.atendimento.horarios.tsx`
  - `src/routes/workspace.whatsapp.automacoes.tsx`
  - `src/routes/admin-master.integracoes.tsx`
- **Testes de Regressao:**
  - `src/services/__tests__/whatsapp-realtime-sync-e2e.test.ts` (novo; casos positivos, negativos, isolamento multi-tenant, webhook `messages.set`/`send.message`/base64=false, sync job error finalization e delta sync)

---

## 4. Criterios de Aceite e Evidencias Obrigatorias

1. **Testes Unitarios/Regressao (Vitest):** Todos os testes existentes de WhatsApp/Atendimento + novos testes de regressao aprovados com 0 falhas (`npx.cmd vitest run`).
2. **Qualidade Estatica & Contratos:** `npm run typecheck`, `npm run lint:design`, `npm run check:bff`, `npm run check:schema`, `npm run check:cycles`, `npm run check:deadcode` e `npm run check:naming` com Exit Code `0`.
3. **Build de Producao & Orcamento Cloudflare:** `npm run build` com Exit Code `0` e `dist/_worker.js/index.js` abaixo de `25 MiB` (`check:route-budget` aprovado).
4. **Governanca Remota Explicita:** Migracao SQL e deploy Cloudflare nao aplicados automaticamente sem confirmacao explicita do usuario, com entrega clara do script/comando pronto ao final.
