# SPEC-20261116-OMNICHANNEL-CRM-MULTIPIXEL-SDR-SLA

**Status:** Concluida em Codigo e Testes Unitarios/Regressao (typecheck/build/deploy aguardando autorizacao do usuario)  
**Data (ISO):** 2026-11-16  
**Branch / Baseline:** `release/prod-20261113-fullpage-chat-copilot` @ `c0e1d351e1ac5feaeb77d0f88cc19df83f14267c`  
**Pre-requisitos Normativos:** `AGENTS.md`, `docs/design/DESIGN.md`, `docs/design/DESIGN-LINT.md`, `skills/waesy-integrity-auditor/SKILL.md`

---

## 1. Requisitos Normativos (EARS)

- **EARS-01 (Exibicao Limpa no CRM):** `LEAD_SOURCES` em `src/types/travel-dossier.ts` deve incluir `"meta_ads"` e `"lead_form"`; `TourismPipeCardDossier.tsx` deve sincronizar `formData.source` e `formData.lead_source_detail` ao trocar `lead.id`, renderizar `Campanha · Conjunto · Anuncio` legivel e respostas estruturadas de formulario; `INTERNAL_CUSTOM_FIELD_KEYS` em `unified-field-bridge.ts` deve excluir todas as chaves tecnicas/tracking/CLIDs para jamais poluir `leads_crm.notes`.
- **EARS-02 (Deduplicacao Blindada de Leads):** `leads_crm` deve manter `phone_normalized_digits` indexado por `(store_id, phone_normalized_digits)`. `ingestOmnichannelLead` deve cruzar variantes BR (`+55` / 9o digito) via `buildBrazilPhoneVariants` e e-mail real em quaisquer estagios nao-terminais (incluindo slugs customizados por nicho), mesclando novos anuncios/listagens no array `custom_fields.interests` em vez de clonar cards.
- **EARS-03 (Contatos Internos & Silenciamento):** `whatsapp_contact_identities` deve suportar `contact_scope` (`'lead' | 'internal_team' | 'stakeholder' | 'supplier' | 'ignored'`) e `suppress_lead_capture`. Contatos classificados como nao-lead ou pertencentes a equipe interna/silenciados continuam no inbox interno sem criar/atualizar `leads_crm`, `whatsapp_lead_conversions` ou disparar Meta CAPI, com acao retroativa para desvincular/arquivar leads criados por engano.
- **EARS-04 (Fontes & Multi-Pixel + Roteamento CAPI):** Tabelas `marketing_sources` e `marketing_source_pixels` com `ENABLE` + `FORCE ROW LEVEL SECURITY` e segredos AES no servidor; CRUD BFF em `pixels.functions.ts` e UI em `workspace.marketing.pixels.tsx`; roteamento CAPI (`dispatchServerSidePixelConversion`, `dispatchClosedLoopLeadQualification`) e scripts de vitrine (`StoreAnalyticsInjector`) suportando multiplos pixels com telemetria `source_pixel_id` e `external_pixel_id`.
- **EARS-05 (Meta Ads CTWA Enrichment & Meta MCP):** Correlacao de `ad_id` / `campaign_id` em `store_ad_campaigns` e `ad_campaigns` com fallback Graph API (`/{ad_id}?fields=id,name,status,adset{id,name},campaign{id,name,status},creative{id,title,body,thumbnail_url}`) e descoberta multi-conta em `executeDiscoverAccessibleAdAccounts` removendo o limite `accounts[0]`, refletido no MCP registry e rotas `/workspace/marketing/anuncios` e `/workspace/marketing/telemetria`.
- **EARS-06 / EARS-07 (Midia em Storage Privado, Whisper & Visao/OCR):** Persistencia de midias WhatsApp (`whatsapp-media.server.ts`) em Storage privado com URLs assinadas e sem descarte rigido por limite base64; transcricao automatica real via Groq/OpenAI Whisper em audios inbound com estado honesto quando sem chave; extracao multimodal de prints/PDFs para contexto de lead/conhecimento.
- **EARS-08 (Copiloto IA SDR Multi-Nicho & Auto-Fill):** Painel Copiloto ao vivo em `AtendimentoChatWorkspace.tsx` alimentado por motor SDR multi-nicho (`ai-sdr.functions.ts` / `whatsapp-automation-runtime.server.ts`) com acao 1-clique "Auto-preencher Ficha do Lead via IA" consolidando mensagens, audios transcritos e prints para `leads_crm` / `custom_fields`.
- **EARS-09 (Alertas de SLA & Esquecidos no Dia):** Filtro `"waiting"` em `chat.functions.ts` estritamente baseado em `last_customer_message_at > last_staff_reply_at` (ou primeira resposta pendente) contra `chat_departments.sla_minutes`, com alertas de SLA e lista de contatos esquecidos no dia em `AtendimentoChatWorkspace.tsx`.

---

## 2. Fases de Execucao

- **Fase 1:** Migration `20270601000000_omnichannel_crm_sources_multipixel_sla.sql`, `travel-dossier.ts`, `unified-field-bridge.ts`, `omnichannel-lead-ingestion.ts`, `omnichannel-attribution.server.ts`, `whatsapp-contact-identity.functions.ts`, `whatsapp-provider-webhook.server.ts`, `api.webhooks.whatsapp.ts`, `TourismPipeCardDossier.tsx`, `AtendimentoChatWorkspace.tsx`, `customer-360-sidebar.tsx` + testes Fase 1.
- **Fase 2:** `pixels.functions.ts`, `omnichannel-attribution.server.ts`, `ads.functions.ts`, `mcp-tool-registry.ts`, `StoreAnalyticsInjector.tsx`, `workspace.marketing.pixels.tsx`, `workspace.marketing.anuncios.tsx`, `workspace.marketing.telemetria.tsx` + testes Fase 2.
- **Fase 3:** `whatsapp-media.server.ts`, `whatsapp-voice-ai.functions.ts`, `whatsapp-provider-webhook.server.ts`, `whatsapp-evolution-sync.server.ts`, `central-knowledge.functions.ts`, `travel-intent-ai.functions.ts` + testes Fase 3.
- **Fase 4:** `whatsapp-automation-runtime.server.ts`, `ai-sdr.functions.ts`, `travel-intent-ai.functions.ts`, `chat.functions.ts`, `whatsapp-operations-metrics.functions.ts`, `AtendimentoChatWorkspace.tsx`, `TourismPipeCardDossier.tsx`, `travel-intent-ai-importer.tsx` + testes Fase 4.
