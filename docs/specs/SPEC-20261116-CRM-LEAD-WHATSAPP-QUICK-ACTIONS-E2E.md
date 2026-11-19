# SPEC-20261116-CRM-LEAD-WHATSAPP-QUICK-ACTIONS-E2E

**Status:** Aprovada para Execucao (Onda End-to-End CRM Lead <-> WhatsApp & Painel de Acoes Rapidas 2.0)  
**Data (ISO):** 2026-11-16  
**Modulo:** CRM (`leads_crm`, `workspace.crm`, `workspace.comercial`) <-> Central WhatsApp (`chat_threads`, `Customer360Sidebar`, `ChatQuickComposerModals`, `AtendimentoChatWorkspace`)  
**Pre-requisitos Normativos:** `AGENTS.md` (B.1-B.51), `docs/design/DESIGN.md`, `docs/design/DESIGN-LINT.md`, `SPEC-20261116-WHATSAPP-REALTIME-SYNC-E2E`

---

## 1. Auditoria Forense & Gaps Reais Identificados

Inspecao direta do codebase em 2026-11-16 revelou os seguintes gaps criticos:

1. **Coluna Soberana `chat_threads.lead_id` Ignorada (`chat.functions.ts:2123`, `2480`):**
   - `linkThreadToCrmOpportunity` e `convertChatThreadToCrmLead` gravam apenas `metadata.active_lead_id`, mantendo `chat_threads.lead_id = NULL`. Queries relacionais, faturas (`chat.functions.ts:1670`) e selecao no CRM por `lead_id` ficam desconectadas.
2. **Cadastro de Lead Nao Auto-Vincula Conversas & CRM Aponta para `wa.me` Externo:**
   - `createLead` (`crm.functions.ts:1666-1880`) vincula `customers_crm`, mas nunca preenche `chat_threads.lead_id` em conversas WhatsApp existentes com o mesmo telefone (incluindo variacoes brasileiras do 9o digito).
   - `workspace.crm.tsx` e `workspace.comercial.tsx` abrem WhatsApp Web externo (`wa.me`) em vez de oferecer atendimento/vinculacao direta dentro do `/workspace/atendimento/chat?leadId=...` e selecao manual de conversas WhatsApp existentes (incluindo `@lid` sem telefone).
3. **Sem Busca Universal de Leads Cadastrados dentro da Conversa WhatsApp:**
   - `getCustomer360Context` (`chat.functions.ts:1504-1540`) e `Customer360Sidebar.tsx:2372` listam apenas oportunidades com match previo de telefone/customer; um contato `@lid` ou cadastrado com variacao de telefone mostra 0 leads e impede vincular um Lead ja cadastrado na loja.
4. **Painel de Acoes Rapidas Fragmentado & Com Gaps de Persistencia / Dados Sinteticos:**
   - Modais fragmentados entre barra do composer, bandeja `+ Anexos` e sidebar 360.
   - `DEFAULT_SPREADSHEET_PRESETS` em `ChatQuickComposerModals.tsx:93-119` contem linhas e receitas sinteticas hardcoded (`"Kit Executivo Premium"`, `R$ 7190`), violando `AGENTS.md` B.8.
   - `createCommercialInvoice` em `ChatQuickComposerModals.tsx` (`handleDispatchTransactional` e `InChatStoreCartBanner`) omite `leadId`; `contract` e `boleto` exigem colagem manual sem listar contratos (`contracts`/`travel_contracts`), propostas (`/proposta/$token`), formularios publicos (`/f/$slug`), produtos (`/produto/$slug`) ou tarefas CRM reais; envio de localizacao depende apenas de GPS via `order_tracker` sintetico sem opcao do endereco oficial da loja.

---

## 2. Requisitos Normativos em Sintaxe EARS

1. **EARS-LW-01 (Sincronizacao Relacional `chat_threads.lead_id`):** WHEN an agent links an existing lead (`linkThreadToCrmOpportunity`) or converts a thread into a lead (`convertChatThreadToCrmLead`), THE SYSTEM SHALL persist both `chat_threads.lead_id` and `metadata.active_lead_id` atomically, backfill `customer_id` when available, and log an internal system event.
2. **EARS-LW-02 (Auto-Vinculo no Cadastro de Lead e Inbound WhatsApp):** WHEN `createLead` creates a CRM lead with a valid phone number OR when `handleUnofficialWhatsAppWebhook` / delta sync creates a `chat_threads` row with a resolvable phone, THE SYSTEM SHALL match normalized Brazilian phone variants (`55+DDD+number`, with/without 9th digit) within the same `store_id` and automatically bind `chat_threads.lead_id` and `customer_id`.
3. **EARS-LW-03 (Vinculacao Bidirecional Manual Mesmo Sem Telefone / `@lid`):** WHILE viewing a WhatsApp conversation (`Customer360Sidebar` / `C360LeadAndCommerceView`) OR viewing a Lead in CRM (`/workspace/crm`, `/workspace/comercial`), THE SYSTEM SHALL allow searching all store leads (`searchStoreCrmLeads`) and all store WhatsApp threads (`listWhatsAppThreadsForLeadPicker`), binding or unbinding them in 1 click, and launching live internal chat via `/workspace/atendimento/chat?leadId=...` (`openOrCreateWhatsAppThreadForLead`).
4. **EARS-QA-01 (Hub Avancado de Acoes Rapidas 100% Real — Zero Mocks):** WHILE using the Quick Actions panel (`ChatQuickComposerModals`, `Customer360Sidebar`, `AtendimentoChatWorkspace`), THE SYSTEM SHALL replace synthetic spreadsheet/mock presets with real editable tables/store catalog/invoices/proposals/contracts/forms from Postgres (`getChatQuickActionsCatalog`), propagate `leadId` on every generated `commercial_invoices`, record non-blocking CRM follow-up activity on dispatch, offer real store address vs GPS location, and provide 1-click access to Schedule WhatsApp, CRM Tasks, Audio IA, Visual Cards, PIX BrCode, Quotes, Contracts, Catalog Products, and Public Forms (`/f/$slug`, `/proposta/$token`, `/fatura/$token`, `/contrato/$token`, `/produto/$slug`).
5. **EARS-QA-02 (Design Ops & Conformidade WCAG 2.2 AA):** THE SYSTEM SHALL enforce >=44px mobile touch targets (`h-11 min-h-11`), `:focus-visible` rings, `4px` spacing grid, zero hardcoded hex colors, zero `!important`, and `motion-reduce` safeguards on all modified UI components while keeping `dist/_worker.js < 25 MiB`.

---

## 3. Escopo de Arquivos Autorizado

- `supabase/migrations/20270527000000_lead_whatsapp_bidirectional_sync_and_rls.sql` (novo)
- `src/lib/phone-match.ts` (novo)
- `src/services/chat.functions.ts`
- `src/services/chat-quick-actions.functions.ts` (novo)
- `src/services/crm.functions.ts`
- `src/services/whatsapp-provider-webhook.server.ts`
- `src/services/whatsapp-evolution-sync.server.ts`
- `src/components/chat/ChatQuickComposerModals.tsx`
- `src/components/chat/customer-360-sidebar.tsx`
- `src/components/chat/c360/C360LeadAndCommerceView.tsx`
- `src/components/atendimento/AtendimentoChatWorkspace.tsx`
- `src/components/tourism/crm/TourismPipeCardDossier.tsx`
- `src/routes/workspace.atendimento.chat.tsx`
- `src/routes/workspace.crm.tsx`
- `src/routes/workspace.comercial.tsx`
- `src/services/__tests__/crm-lead-whatsapp-quick-actions-e2e.test.ts` (novo)
- `docs/design/DECISIONS.md`
