# SPEC-20261116-MASTER-WAESY-E2E-STABILIZATION-MULTITOUCH-REFACTOR

## Status
Aprovada para execução autônoma end-to-end (Sessão `4b7b151a-8893-43e2-8a26-871db7fd9b8a`).

## Escopo Autorizado
- `supabase/migrations/20270603000000_whatsapp_dm_group_isolation_and_healing.sql`
- `src/lib/contact-sanitize.ts` (novo utilitário puro de sanitização de e-mails/identidades sintéticas)
- `src/lib/attribution-journey.ts` (novo motor puro multi-touch `1º Toque`, `Último Toque`, contagem de toques/campanhas/anúncios e timeline)
- `src/lib/chat-thread-realtime.ts` (novo módulo puro para coalescing de reload Realtime + patching incremental de threads)
- `src/components/atendimento/WhatsAppMarkdownText.tsx` (novo renderizador seguro `*negrito*`, `_itálico_`, `~tachado~`, código e links sem `dangerouslySetInnerHTML`)
- `src/components/chat/c360/C360AttributionJourneyCard.tsx` (novo subcomponente C360 multi-touch extraído do monólito)
- `src/services/whatsapp-provider-webhook.server.ts`
- `src/services/whatsapp-evolution-sync.server.ts`
- `src/services/omnichannel-attribution.server.ts`
- `src/services/omnichannel-lead-ingestion.ts`
- `src/services/chat.functions.ts`
- `src/services/crm.functions.ts`
- `src/services/ads.functions.ts`
- `src/services/pixels.functions.ts`
- `src/components/atendimento/AtendimentoChatWorkspace.tsx`
- `src/components/chat/customer-360-sidebar.tsx`
- `src/components/tourism/crm/TourismPipeCardDossier.tsx`
- `src/components/marketing/MarketingSourcesMultiPixelPanel.tsx`
- `src/routes/workspace.marketing.anuncios.tsx`
- `src/routes/workspace.marketing.telemetria.tsx`
- `docs/design/DECISIONS.md`
- Testes Vitest em `src/services/__tests__/` e `src/lib/__tests__/`

---

## Requisitos Normativos (EARS)

### BLOCO 1 — Blindagem Estrutural WhatsApp (DM ⇄ Grupo & Zero Loop)
- **[EARS-01] Isolamento Absoluto entre 1:1 (`DM`), Grupos (`@g.us`) e Canais (`@newsletter`):**
  - When `persistInboundMessage` (`whatsapp-provider-webhook.server.ts`) or `runEvolutionDeltaSyncForInstance` (`whatsapp-evolution-sync.server.ts`) processes a group message (`isGroupJid` or `@g.us` or `^120363\d{10,}$`), the system shall resolve `whatsapp_contact_identities` and `chat_threads` strictly by `groupJid` / `channel_identity_id` restricted to `thread_type = 'group'`, never placing sender personal phone (`groupCtx.senderPhone`) into group `cleanDigits`, group `entity_id`, or `threadLookupFilters`, and never letting non-group lookups match `thread_type IN ('group','channel')`.
  - When `isGroup` is true and `chat.subject` / `chat.name` is absent or matches sender `pushName`, the system shall resolve the canonical group subject via Evolution `/group/findGroupInfos` / `/group/fetchAllGroups` cached in `whatsapp_groups_directory` and preserve participant names strictly inside `payload.sender_name` / `metadata.participants`.
  - Provide idempotent migration `20270603000000_whatsapp_dm_group_isolation_and_healing.sql` separating any existing group messages (`payload->>'is_group' = 'true'` or `whatsapp_jid/group_jid LIKE '%@g.us'`) erroneously persisted on non-group threads onto canonical group threads.

- **[EARS-02] Integridade de Prévia de Conversas (`listChatThreads`):**
  - While formatting threads in `listChatThreads` (`chat.functions.ts`), the system shall honor `rpcSummary` even when `rpcSummary.total_messages > 0` with empty text (resolving media type labels `[Imagem]`, `[Vídeo]`, `[Áudio]`, `[Documento]`, `[Figurinha]`), falling back deterministically to `thread.last_message_text` so hydrated threads never show `"Sem mensagens"`.

- **[EARS-03] Guardas No-Op de Sync & Realtime Coalescido:**
  - While executing Evolution delta sync, the system shall avoid redundant `chat_threads` UPDATE writes when neither newer messages, material metadata changes, nor preview repairs occurred (`last_history_synced_at` not written on pure no-ops).
  - While handling Realtime `postgres_changes` bursts in `AtendimentoChatWorkspace.tsx`, the system shall coalesce `reloadThreads()` calls (`>= 1500ms` debounce) using incremental state helpers and maintain gentle fallback polling (`>= 45s` only when `realtimeStatus !== 'live'`).

### BLOCO 2 — Deduplicação, Supressão Interna & Higiene de E-mails Sintéticos
- **[EARS-04–06] Higiene Completa de E-mails Sintéticos & Deduplicação Multi-Touch Preserving Frequency:**
  - The system shall centralize `isSyntheticPlaceholderEmail` / `sanitizeCustomerEmail` (`@sem-email.waesy.local`, `@whatsapp.waesy`, `@grupo.whatsapp.waesy`, `@waesy.local`) in `src/lib/contact-sanitize.ts` and strip placeholder emails in BFF (`listChatThreads`, `getCustomer360Context`) and UI (`Customer360Sidebar`, `TourismPipeCardDossier`).

### BLOCO 3 — Jornada Multi-Touch, LTV/CAC Closed-Loop & Fontes -> Multi-Pixel
- **[EARS-07] Multi-Touch & Frequência Real sem Supressão por Dia:**
  - When a lead or visitor clicks multiple ads or repeats engagement across sessions, `omnichannel-lead-ingestion.ts` and `omnichannel-attribution.server.ts` shall preserve chronological touchpoints with click frequency (`click_count`) and expose `computeCustomerTouchpointJourney` (`totalTouchpointsCount`, `uniqueCampaignsCount`, `uniqueAdsCount`, `uniqueSourcesCount`, `firstTouch`, `lastTouch`, `timeline`) in CRM Dossier, Customer360, and Marketing Telemetria (`limit(200)`).

- **[EARS-08] Closed-Loop LTV, Recompra, CAC Atribuído & ROAS por Campanha/Fonte/Pixel:**
  - When `calculateStoreLtvAndAdSpend` (`crm.functions.ts`) executes, the system shall aggregate real closed revenue from `orders`, confirmed/completed `tourism_trips` (without double-counting linked orders), accepted/converted `travel_proposals`, and paid `commercial_invoices`, crossed against `ad_campaigns` + `store_ad_campaigns` spend, touchpoints, and `marketing_sources` / `marketing_source_pixels` breakdowns (`breakdownByCampaign`, `breakdownBySource`, `breakdownByPixel`, `repeatCustomersCount`, `repeatPurchaseRate`, `attributedCacCents`, `costPerClickCents`, `costPerLeadCents`).
  - Surface these closed-loop metrics in `getCustomer360Context`, `/workspace/marketing/anuncios`, `/workspace/marketing/telemetria`, and verify `MarketingSourcesMultiPixelPanel` prop synchronization (`useEffect([initialSources])`).

### BLOCO 4 & 5 — Mídia/Whisper/SDR/SLA Check + Refatoração Enxuta, Markdown WhatsApp Seguro & Design Lint
- Verify `whatsapp-media.server.ts` (>5.5MB Storage), `transcribeAudioMediaServer`, Vision OCR + Continuous KB, multi-niche SDR Copilot & SLA filters (`waiting`/`forgotten`).
- Extract `WhatsAppMarkdownText` (`*negrito*`, `_itálico_`, `~tachado~`, código + `SmartPhoneText`), `C360AttributionJourneyCard`, and `chat-thread-realtime.ts` cleanly.
- Ensure Design Lint P0/P1 = 0 (`min-h-11` mobile targets on chips/buttons, zero `dangerouslySetInnerHTML`, zero `DL-31` containeritis, zero hardcoded colors/brackets).

## Evidências Planejadas
- Migration SQL idempotente verificada estruturalmente.
- Suites Vitest cobrindo DM vs Grupo isolation, Evolution group subject resolution, no-op update guard, Realtime coalescing, synthetic email sanitization, multi-touch repeat clicks & journey calculation, closed-loop LTV/CAC/ROAS across all revenue tables, e `WhatsAppMarkdownText`.
- Verificação estática de Design Lint e zero vazamento de e-mails sintéticos (`typecheck` e `build` explicitamente suspensos por diretriz do usuário).
