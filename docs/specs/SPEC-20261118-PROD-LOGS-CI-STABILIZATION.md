# SPEC-20261118 — Estabilização Forense de Produção (Supabase Logs, CI Quality Gates e Cloudflare Pages)

- **Data:** 2026-11-18
- **Escopo:** Correção na raiz dos erros reais observados nos logs de produção do Supabase (`jfuebqmltksyznovhlwa`), destravamento dos 5 Quality Gates de CI (`typecheck`, `vitest`, `design-lint`, `build`, `dead-code`) e preparação determinística para merge em `origin/main` e deploy Cloudflare Pages (`usewaesy`).

## Requisitos EARS

1. **Invariante de Integridade Referencial (FK 409):**
   - **WHEN** `convertChatThreadToCrmLead` sincronizar um contato em `customers_crm`, **THE SYSTEM SHALL** persistir o identificador CRM exclusivamente em `chat_threads.metadata.crm_customer_id`, **NEVER** gravando um UUID de `customers_crm` em `chat_threads.customer_id` (`REFERENCES public.profiles(id)`).
   - **WHEN** `createTravelProposal` registrar espelho de compatibilidade em `public.quotes`, **THE SYSTEM SHALL** validar a existência de `resolvedCustomerId` em `public.profiles` antes de preencher `quotes.customer_id`, evitando violação `quotes_customer_id_fkey`.
2. **Erradicação de Colunas Fantasmas PostgREST (HTTP 400):**
   - **THE SYSTEM SHALL NOT** selecionar, filtrar ou inserir a coluna inexistente `profiles.email` em `b2b-partners`, `corporate-travel`, `courier-verification`, `events`, `hr`, `kyc`, `mcp-tool-registry`, `whatsapp-leads`, `jobs` e `lead-forms`.
   - **WHEN** `whatsapp-channel-instances` registrar jobs em `whatsapp_history_sync_jobs`, **THE SYSTEM SHALL** normalizar `sync_mode` para `new_only | manual_full | recent_window` antes da inserção.
3. **Resiliência de Domínio Preview e Cache Hot-Path:**
   - **WHEN** o host da requisição pertencer a `*.pages.dev`, `*.workers.dev`, `localhost`, IP literal ou subdomínio reservado (`www`, `waesy`, `usewaesy`, `api`, `app`, `admin`), **THE SYSTEM SHALL** retornar `null` em `resolveTenantStoreId` sem consultar `public.stores`.
   - **WHEN** múltiplos loaders SSR invocarem `resolvePlatformRootStore`, **THE SYSTEM SHALL** deduplicar via `getOrSetMicroCache("platform_root_store", ..., 60_000)` com invalidação explícita em mutações da loja raiz.
4. **Performance PostgreSQL & Proteção Contra Saturação de Pool (`20270523000000`):**
   - **THE SYSTEM SHALL** prover índices compostos em `chat_messages (thread_id, created_at DESC)` (completo e parcial público), `classified_analytics_events (classified_id, event_type, session_hash, created_at DESC)`, `whatsapp_channel_instances` e `stores (is_platform_root = true)`.
   - **THE SYSTEM SHALL** fixar `search_path = public, extensions, pg_temp` nas funções que invocam `digest()`, adicionar coluna aditiva `whatsapp_groups_directory.last_message_at` e reduzir `dispatch_whatsapp_sync_cron` de 1 minuto para `*/5 * * * *`.
5. **Conformidade CI "5 Quality Gates":**
   - **THE SYSTEM SHALL** passar `check:schema`, `check:migration-inventory`, `check:bff`, `typecheck` (0 erros), `lint:design --ratchet` (0 P0/P1), `vitest run` (100% suítes), `build` (`_worker.js <= 25 MiB`), e `dead-code-detector.mjs --ci`.

## Evidências Esperadas
- `src/services/prod-logs-remediation.test.ts` (provas positivas e negativas).
- Saída integral de Vitest, TypeScript, Design Lint, Build e Route Budget Guard.
- Registro em `docs/design/DECISIONS.md` (`DEC-509`).
