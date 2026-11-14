# SPEC-20261113-OMNICHANNEL-IDENTITY-PIXEL-AD-ATTRIBUTION

## 1. Resumo Executivo
Especificação ponta a ponta para unificar **Identidade de Contatos e Grupos no WhatsApp** (identificação de número E.164, nome, JID de grupo `@g.us`, participantes e edição sincronizada no Atendimento/CRM) e **Atribuição Conectada de Pixels ↔ Anúncios ↔ Formulários ↔ WhatsApp ↔ CRM** (Meta Pixel/CAPI, Google Ads/GA4, Click-to-WhatsApp `referral`/`externalAdReply`, UTMs, Click IDs e correlação reversa por telefone/código).

## 2. Requisitos EARS (Easy Approach to Requirements Syntax)

### EARS-01 — Identificação Determinística de Contatos Diretos e Grupos WhatsApp
- **WHEN** o webhook do WhatsApp (Evolution API / Baileys / Wasender ou Meta Cloud API) receber uma mensagem de conversa direta (`@s.whatsapp.net` ou `@lid` resolvido), **THE SYSTEM SHALL** extrair e normalizar o número em formato E.164 (`+55...`), preservar o nome real (`pushName`/`profile.name`), atualizar `whatsapp_contact_identities` e persistir `primary_phone_e164` em `chat_threads` sem sobrescrever nomes já editados manualmente por operadores.
- **WHEN** o webhook receber uma mensagem de grupo WhatsApp (`remoteJid` terminado em `@g.us`), **THE SYSTEM SHALL** manter `external_user_id` e `entity_id` vinculados ao JID do grupo (`thread_type = 'group'`), **NEVER** confundir o ID numérico do grupo com o telefone do remetente, extrair o nome real do grupo (`group_subject`), gravar `sender_phone`, `sender_name` e `sender_jid` no `payload` da mensagem e registrar o participante na lista de participantes ativos do grupo em `chat_threads.metadata.participants`.
- **WHEN** um operador acionar a sincronização manual de perfil em uma conversa de grupo `@g.us`, **THE SYSTEM SHALL** consultar metadados do grupo (`findGroupInfos`) e foto do grupo junto ao gateway WhatsApp configurado, atualizando `group_subject`, `guest_name`, foto e participantes.

### EARS-02 — Edição Sincronizada de Nome, Telefone e Nome do Grupo
- **WHEN** um operador autenticado da loja editar nome, telefone/WhatsApp, e-mail, CPF, cidade ou foto de um contato direto — ou editar o nome/assunto de um grupo WhatsApp — no Atendimento (`Customer360Sidebar` ou cabeçalho do chat), **THE SYSTEM SHALL** validar a entrada via Zod, verificar acesso multi-tenant (`assertStoreAccess`), e sincronizar atomicamente `chat_threads` (`guest_name`, `group_subject`, `subject`, `primary_phone_e164`, `metadata.customer_profile_override`), `whatsapp_contact_identities` (`display_name`, `phone_e164`, `phone_hash`), `customers_crm`, `profiles` (quando houver) e `leads_crm` ativos vinculados.
- **WHEN** a edição for salva com sucesso, **THE SYSTEM SHALL** atualizar imediatamente a lista de conversas e o cabeçalho ativo do Atendimento (`onProfileSynced`) sem exigir recarregamento manual da página.

### EARS-03 — Captura Contínua de Pixel, Anúncio e Click IDs na Vitrine e Formulários
- **WHEN** um visitante acessar qualquer página pública da vitrine (`_store.*`) com parâmetros de campanha (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `fbclid`, `gclid`, `ttclid`, `ctwa_clid`, `ad_id`, `adset_id`, `campaign_id`, `form_id`) ou cookies `_fbp`/`_fbc`, **THE SYSTEM SHALL** persistir esses marcadores em `sessionStorage`/`localStorage` através de `collectClientAttribution()` e registrar um ponto de contato em `ad_attribution_touchpoints`.
- **WHEN** o visitante submeter um formulário (`submitPublicLeadForm` ou `submitCivilInquiryLead`) ou clicar em CTA rastreável de WhatsApp (`getProtectedWhatsAppContact` / `recordWhatsAppLead`), **THE SYSTEM SHALL** anexar a atribuição completa da sessão (incluindo telefone normalizado, `lead_code`, UTMs, `_fbp`, `_fbc`, `fbclid`, `gclid`, `ad_id`, `campaign_id`) em `lead_form_submissions`, `whatsapp_lead_conversions`, `ad_attribution_touchpoints` e `leads_crm.custom_fields`, e disparar evento server-side CAPI `Lead`/`Contact` (+ GA4 `generate_lead`) quando configurado para a loja.

### EARS-04 — Atribuição Click-to-WhatsApp (CTWA) e Correlação Reversa por Telefone
- **WHEN** uma mensagem WhatsApp recebida (via webhook oficial Meta Cloud API ou não-oficial Evolution/Baileys) contiver payload `referral` / `externalAdReply` (Click-to-WhatsApp com `source_id`/`ad_id`, `ctwa_clid`, `headline`, `body`, `source_url`) ou token de referência `Ref: #WAE-...` no texto, **THE SYSTEM SHALL** extrair os metadados do anúncio e gravá-los na atribuição da conversa e do lead.
- **WHEN** uma mensagem WhatsApp recebida (não-grupo) vier de um telefone que corresponda (com tolerância de DDI 55 e 9o dígito móvel brasileiro) a uma submissão de formulário recente, clique de WhatsApp (`whatsapp_lead_conversions`) ou `ad_attribution_touchpoints` da mesma loja dentro de 30 dias, **THE SYSTEM SHALL** correlacionar automaticamente a origem do anúncio/campanha/formulário, criar ou enriquecer o card em `leads_crm` via `ingestOmnichannelLead`, vincular `chat_threads.lead_id` e `chat_threads.attribution`, e disparar evento CAPI `Lead` deduplicado se ainda não enviado para aquele par `(store_id, phone, origin)`.

### EARS-05 — Visibilidade e Edição Manual de Origem no Atendimento, CRM e Pixels
- **WHEN** um operador abrir uma conversa no Atendimento, **THE SYSTEM SHALL** exibir de forma clara o número/WhatsApp do cliente (ou assunto/participantes do grupo e autor de cada bolha em grupos), o card **Origem, Anúncio & Pixel** no Perfil 360º (plataforma, campanha, anúncio/criativo, formulário, UTMs, click IDs e status CAPI) e permitir editar/vincular manualmente campanha/origem do atendimento.
- **WHEN** um gestor acessar `/workspace/marketing/pixels`, **THE SYSTEM SHALL** exibir telemetria real de atribuição conectada (`ad_attribution_touchpoints`, leads com origem de anúncio/formulário/WhatsApp e histórico recente de disparos CAPI em `lead_conversion_telemetry`).

## 3. Escopo de Arquivos Autorizados
- `supabase/migrations/20270410000000_omnichannel_identity_attribution_and_pixels.sql` (novo)
- `src/lib/attribution-collector.ts`
- `src/lib/whatsapp.ts`
- `src/services/omnichannel-attribution.server.ts` (novo)
- `src/services/omnichannel-lead-ingestion.ts`
- `src/services/whatsapp-provider-webhook.server.ts`
- `src/routes/api.webhooks.whatsapp.ts`
- `src/services/whatsapp-channel-instances.functions.ts`
- `src/services/whatsapp-contact-identity.functions.ts`
- `src/services/whatsapp-leads.functions.ts`
- `src/services/lead-forms.functions.ts`
- `src/services/pixels.functions.ts`
- `src/services/chat.functions.ts`
- `src/components/analytics/StoreAnalyticsInjector.tsx`
- `src/components/leads/lead-form-renderer.tsx`
- `src/components/atendimento/AtendimentoChatWorkspace.tsx`
- `src/components/chat/customer-360-sidebar.tsx`
- `src/routes/workspace.comercial.tsx`
- `src/routes/workspace.marketing.pixels.tsx`
- `src/services/__tests__/omnichannel-identity-attribution.test.ts` (novo)

## 4. Critérios de Aceite & Restrições
- Isolamento multi-tenant estrito por `store_id` e RLS `public.is_store_staff(store_id)` / `is_platform_admin()`.
- Alvos de toque móveis `>= 44px` (`h-11 min-h-11`), `:focus-visible:ring-2`, tokens semânticos (`bg-card`, `text-foreground`, etc.), zero `h-[...]` / cores hex literais.
- Manter bundle `_worker.js/index.js` estritamente `< 25.00 MiB`.
- `npm run build` Exit 0, `node scripts/route-budget-guard.mjs` PASS, `node scripts/design-lint.mjs --ratchet` PASS, Vitest regressão PASS.
