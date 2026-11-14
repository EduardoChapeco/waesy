# SPEC-20261114-KANBAN-MULTI-NICHE-SYNONYMS-AND-PIXEL-E2E

## Metadata
- Data: 2026-11-14
- Status: Aprovada para Execucao
- Modulos Autorizados:
  - `supabase/migrations/20270417000000_kanban_multiniche_stages_and_pixel_tags.sql`
  - `src/integrations/supabase/types.ts`
  - `src/lib/niches/kanban-niche-taxonomy.ts`
  - `src/lib/niches/niche-manifest.ts`
  - `src/lib/niches/index.ts`
  - `src/lib/attribution-collector.ts`
  - `src/services/kanban-config.functions.ts`
  - `src/services/crm.functions.ts`
  - `src/services/pixels.functions.ts`
  - `src/services/integrations.functions.ts`
  - `src/services/omnichannel-lead-ingestion.ts`
  - `src/services/chat.functions.ts`
  - `src/services/omnichannel-attribution.server.ts`
  - `src/components/workspace/workspace-canonical-toolbar.tsx`
  - `src/components/workspace/kanban/full-viewport-kanban.tsx`
  - `src/components/workspace/kanban/niche-kanban-board.tsx`
  - `src/components/workspace/kanban/kanban-column-customizer-modal.tsx`
  - `src/components/tourism/crm/LeadCard.tsx`
  - `src/components/analytics/StoreAnalyticsInjector.tsx`
  - `src/components/commerce/product-telemetry.tsx`
  - `src/routes/__root.tsx`
  - `src/routes/_store.tsx`
  - `src/routes/workspace.turismo.index.tsx`
  - `src/routes/workspace.comercial.tsx`
  - `src/routes/workspace.crm.tsx`
  - `src/routes/workspace.orcamentos.index.tsx`
  - `src/routes/workspace.marketing.pixels.tsx`
  - `src/services/__tests__/kanban-multiniche-and-pixel-e2e.test.ts`

## Requisitos EARS

### R1 — Polimento Minimalista do Menu/Toolbar do Kanban & Eliminacao de Card Branco em Coluna Vazia
- **R1.1 (Quando/Enquanto):** Enquanto qualquer quadro Kanban (`/workspace/turismo`, `/workspace/comercial`, `/workspace/crm`, `/workspace/orcamentos` ou `FullViewportKanban` / `NicheKanbanBoard`) exibir colunas sem cards, o sistema **DEVE** omitir qualquer caixa branca (`bg-card`) de placeholder em altura cheia e renderizar apenas texto discreto sem card e gatilho sutil `+ Adicionar` integrado ao fundo da coluna.
- **R1.2 (Quando):** Quando o `WorkspaceCanonicalToolbar` renderizar abas de navegacao (`Kanban`, `Painel & Alertas`, `Propostas`, `Viagens`) e controles operacionais (busca, filtros, `Colunas`, `Metricas`, acoes secundarias e acao primaria), o sistema **DEVE** apresentar faixa de abas limpa sem efeito visual de duplo card em camadas, manter filtros e busca sem truncamento prematuro em desktop (`min-w`) e agrupar acoes secundarias excedentes com hierarquia unica (`1` acao primaria `variant="default"`).

### R2 — Correcao Definitiva de Movimentacao de Cards ("Sondagem e Briefing" / Estagios de Nicho / Customizados)
- **R2.1 (Quando):** Quando o usuario mover um lead para `Sondagem e Briefing` (`contact` ou `briefing`), ou para qualquer estagio canônico/customizado/de nicho (ex.: `triagem`, `visit_scheduled`, `diagnostico`, `col_*`) via seta rapida, menu do card ou dossie, `updateLeadStatus` e `persistLeadMove` **DEVEM** aceitar e persistir o estagio com validacao segura em slug normalizado, mapeando sinonimos e gravando `custom_fields.kanban_stage_key` + `custom_fields.kanban_stage_purpose`, alem de sincronizar `leads_crm.status`.
- **R2.2 (Se/Entao):** Se um ambiente ainda possuir constraint SQL restrita (`23514`), a camada BFF **DEVE** realizar fallback transacional automatico mapeando `leads_crm.status` para o bucket canonico compativel (`new`, `contacted`, `qualified`, `proposal`, `negotiation`, `won`, `lost`, `converted`) preservando `custom_fields.kanban_stage_key` intacto para que o card apareca exatamente na coluna de destino sem erro.
- **R2.3 (Migracao SQL):** A migracao `20270417000000` **DEVE** atualizar `leads_crm_status_check` para aceitar slugs validos multi-nicho e customizados (`^[a-z0-9_-]{2,64}$`) e endurecer `persist_lead_move` com atualizacao atomica de `status` e `custom_fields`.
- **R2.4 (Se/Entao):** Se ocorrer erro real de rede, permissao ou estado invalido na API, a interface **DEVE** traduzir mensagens de validacao (ex.: Zod JSON bruto) em aviso humano curto e claro, nunca despejando array JSON técnico em toast.

### R3 — Taxonomia Multi-Nicho de Fluxos Kanban, Sinonimos e Terminologia E2E
- **R3.1 (Ubiquo):** O sistema **DEVE** prover registro canonico multi-nicho em `src/lib/niches/kanban-niche-taxonomy.ts` cobrindo todas as verticais e nichos ativos (`tourism`, `beauty_salon`, `barbershop`, `aesthetics_clinic`, `healthcare`, `dental`, `psychology`, `vet_petshop`, `gastronomy`, `market_perishables`, `pharmacy`, `automotive`, `retail`, `real_estate`, `services`, `law_firm`, `accounting`, `education`, `events`, `organizations`, `creator`, `generic`), incluindo:
  1. Estagios Kanban especificos do segmento com `stage_key`, `title`, `purpose`, `color`, `sla_minutes`, `description`;
  2. Lista completa de sinonimos por estagio (`synonyms`) e resolucao bidirecional entre status legados, webhooks (WhatsApp/Forms/Atendimento), manifestos de nicho e colunas personalizadas;
  3. Terminologia de dominio (singular/plural do item/lead, rotulos de origem, campo de contexto principal, placeholder de busca, checklist inicial, opcoes do funil) consumida no Kanban Comercial, CRM, Customizador de Colunas e Cards.

### R4 — Integridade Ponta a Ponta de Pixels, Google Ads, Meta Tags, Atendimento e Conversoes CRM
- **R4.1 (Persistencia & Schema):** Ao salvar configuracoes em `/workspace/marketing/pixels` (`saveStorePixelConfig`), o sistema **DEVE** persistir sem perda e sem sobrescrita silenciosa: `meta_pixel_id`, `meta_capi_token`, `meta_test_event_code`, `meta_domain_verification`, `google_ads_id` (`AW-...`), `google_ads_conversion_label`, `ga4_measurement_id` (`G-...`), `ga_api_secret` (criptografado no cofre + retrocompativel sem corromper `google_ads_id`), `google_site_verification`, `gtm_id` (`GTM-...`), `tiktok_pixel_id` e todas as flags de evento (`track_page_views`, `track_catalog_views`/`track_view_content`, `track_whatsapp_leads`, `track_quotes`, `track_concursos`, `track_purchases`), invalidando o cache publico imediatamente (`invalidateMicroCache`).
- **R4.2 (Vitrine & Head SSR / Cliente):** Tanto `getPublicPixels` quanto `getPublicStorePixels`, `__root.tsx`, `_store.tsx`, `StoreAnalyticsInjector.tsx` e `ProductTelemetry` **DEVEM** ler colunas reais do schema (`ga4_measurement_id` sem coluna fantasma, alem de `tiktok_pixel_id`, `gtm_id`, `google_ads_id`, `google_ads_conversion_label`, `google_site_verification`, `meta_domain_verification`), injetar scripts no navegador sem duplicacao, inserir `<meta name="google-site-verification">` e `<meta name="facebook-domain-verification">` quando configurados e capturar `gclid`, `gbraid`, `wbraid`, `fbclid`, `fbp`, `fbc`, `ttclid`, `ctwa_clid`, `_ga` e `utm_*`.
- **R4.3 (Atendimento <-> CRM <-> Closed-Loop CAPI & Google Ads):** Quando um lead chegar via vitrine/WhatsApp/formulario, for vinculado/convertido no Atendimento (`convertChatThreadToCrmLead` / `correlateAndPersistInboundWhatsAppAttribution`) ou avancar no Kanban (inclusive para estagios com `purpose` `in_progress`, `review`, `won`, `contact`, `briefing`, ou customizados), `dispatchClosedLoopLeadQualification` **DEVE** resolver o estagio semanticamente pela taxonomia de estagios/proposito, disparar Meta CAPI + GA4/Google Ads MP (respeitando labels/credenciais configurados), registrar telemetria real em `lead_conversion_telemetry` e nunca falhar silenciosamente ou abortar a transicao do card por falta de valor estimado em centavos.
- **R4.4 (Diagnostico em Pixels UI):** A tela `/workspace/marketing/pixels` **DEVE** exibir campos completos de Google Ads (ID + Conversion Label + tag de verificacao), GA4 (Measurement ID + API Secret), GTM, Meta Pixel + CAPI + Verification Meta Tag e TikTok Pixel, alem de botao real de verificacao/disparo de teste server-side que valida o recebimento na API e registra telemetria real.

## Invariantes & Gates de Qualidade
- Design: `AGENTS.md` B.4 / B.8 (sem `!important`, sem cores hex/rgb literais, sem classes com colchetes arbitrários, grid 4px, `h-11` / 44px em controles interativos no mobile, `focus-visible:ring-2`, zero Containeritis / card dentro de card, zero emojis).
- Gates de verificacao obrigatorios:
  - Vitest regressao + novos testes E2E (100% pass);
  - `npm run typecheck` (Exit Code 0);
  - `node scripts/design-lint.mjs --ratchet` (0 novas violacoes P0/P1);
  - `npm run check:bff`, `npm run check:schema`, `npm run check:cycles`, `npm run audit:secrets`;
  - `npm run build` (Exit Code 0).
