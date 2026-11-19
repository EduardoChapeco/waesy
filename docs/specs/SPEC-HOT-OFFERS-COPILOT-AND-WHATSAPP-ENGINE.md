# SPEC-HOT-OFFERS-COPILOT-AND-WHATSAPP-ENGINE — Ecossistema Integrado Hot Ofertas Black, Copilot `@oferta`, Radar IA de Match, Disparo em Grupos WhatsApp e Herança Oferta-Mestre <-> Proposta Editável por Cliente

- **Data:** 2026-11-17
- **Status:** Aprovado para Execução E2E (Fases 0–7)
- **Escopo:** `public.hot_offers`, `public.stories`, `public.whatsapp_groups_directory`, `public.offer_campaign_dispatches`, `public.travel_proposals`, `src/lib/tourism/hot-offer-sanitizer.ts`, `src/services/hot-offers.functions.ts`, `src/components/tourism/studio/hot-offer-publisher-dialog.tsx`, `src/components/branded-app/hot-flame-avatar.tsx`, `src/components/branded-app/app-hot-offer-detail-sheet.tsx`, `src/components/stories/advanced-story-viewer.tsx`, `src/components/branded-app/branded-app-shell.tsx`, `src/services/whatsapp-groups.functions.ts`, `src/routes/workspace.atendimento.grupos.tsx`, `src/types/chat.ts`, `src/components/chat/chat-composer.tsx`, `src/components/chat/copilot-hot-offer-workflow-card.tsx`, `src/components/chat/structured-message-view.tsx`, `src/routes/workspace.turismo.propostas.$id.tsx`.

---

## 1. Requisitos Estruturados em Sintaxe EARS

### R1 — Higienização Zero-PII e Herança Oferta-Mestre <-> Proposta por Cliente
- **WHEN** um operador promove uma proposta (`travel_proposals`), cotação ou pacote para Oferta Pública (`public.hot_offers`), **THE SYSTEM SHALL** remover 100% dos dados pessoais do lead original (`lead_id`, `customer_id`, `client_name`, `customer_name`, `client_whatsapp`, `client_email`, `client_document`, `special_notes` privados e `access_pin`) antes de persistir em `public.hot_offers`.
- **WHEN** `N` leads compatíveis são selecionados para envio ou personalização a partir de uma Oferta-Mestre (`hot_offers.id`), **THE SYSTEM SHALL** criar ou vincular registros individuais em `public.travel_proposals` com `source_offer_id = hot_offers.id`.
- **WHILE** uma proposta individual possuir `source_offer_id` apontando para uma Oferta-Mestre, **WHEN** o operador editar parâmetros específicos de um cliente (ex.: adicionar 1 criança de 4 anos, alterar ocupação de quarto, trocar hotel ou condição de parcelamento), **THE SYSTEM SHALL** mutar exclusivamente a linha `public.travel_proposals` daquele cliente (`override_notes`, `adults_count`, `children_count`, `rooms`, `pricing`, `hotels`), mantendo `public.hot_offers` e as propostas dos demais clientes 100% inalteradas.

### R2 — Gatilho Automático de Vantagem Histórica no Studio de Propostas
- **WHEN** uma proposta é carregada ou precificada no Studio (`/workspace/turismo/propostas/$id`), **THE SYSTEM SHALL** avaliar o preço por adulto contra a série histórica da loja (`evaluateHistoricalAdvantage`).
- **IF** o veredito histórico for vantajoso (`verdict === 'great_deal'` ou economia `>= 8%` abaixo da mediana histórica), **THE SYSTEM SHALL** exibir um banner não-intrusivo sugerindo **"Transformar em Oferta Pública / Story Hot"** e habilitar o modal `<HotOfferPublisherDialog />` em 1 clique.

### R3 — Enquadramento Visual Obrigatório (`ImageCropperDialog` 9:16 e 1:1 / 4:5)
- **WHEN** o operador prepara uma Oferta Quente pelo Studio ou pelo Copilot (`@oferta`), **THE SYSTEM SHALL** permitir o recorte interativo via `<ImageCropperDialog />` nas proporções `9:16` (Story vertical) e `1:1` ou `4:5` (Card de Grupo WhatsApp) antes da publicação.

### R4 — Avatar `<HotFlameAvatar />` (Aceso em Chamas) + Hot Stories + Detalhe In-App (`/app/:slug`)
- **WHILE** a loja possuir ao menos 1 story ativo (`expires_at > now()`) ou `hot_offer` ativa publicada nos stories, **THE SYSTEM SHALL** envolver o logotipo `squareLogo` no header do `BrandedAppShell` com o componente `<HotFlameAvatar />` (anel padrão Instagram ou efeito de fogo pixelado em camadas com tokens CSS e micro-badge `"HOT"` / `"BLACK"`), respeitando `prefers-reduced-motion: reduce` (`motion-reduce:animate-none`).
- **IF** a loja não possuir stories ativos ou todos estiverem expirados (`expires_at <= now()`), **THE SYSTEM SHALL** renderizar o avatar limpo sem anel de chamas.
- **WHEN** o usuário clicar no `<HotFlameAvatar />` ou na pílula `"Ofertas Quentes (N)"` (`h-11 min-h-11`), **THE SYSTEM SHALL** abrir o `<AdvancedStoryViewer />` (`z-50`).
- **WHEN** o usuário clicar no CTA **"Ver Descrição da Oferta"** (`h-11 min-h-11`) dentro do Story no App Próprio, **THE SYSTEM SHALL** fechar o Story Viewer, registrar telemetria (`recordStoryTelemetry` + Meta Pixel `ViewContent`) e abrir a visualização completa da oferta (`<AppHotOfferDetailSheet />` / `?offer=:offerId`) **internamente no próprio App (`/app/:slug`)**, sem redirecionar para o marketplace Waesy externo.

### R5 — Governança de Papéis de Grupos WhatsApp e Disparo Seguro
- **WHEN** um grupo em `public.whatsapp_groups_directory` é classificado com `group_role = 'internal_team'`, **THE SYSTEM SHALL** forçar `silence_lead_capture = true` e `auto_publish_eligible = false`, bloqueando qualquer captura automática de leads/conversões de números daquele grupo e bloqueando qualquer disparo promocional em `dispatchHotOfferToWhatsAppGroupsFn`.
- **WHEN** `dispatchHotOfferToWhatsAppGroupsFn` é invocada com `storeId`, `offerId` e `groupIds`, **THE SYSTEM SHALL** validar `assertStoreAccess(storeId)`, verificar que todos os `groupIds` pertencem a `storeId` e possuem `group_role !== 'internal_team'`, disparar a imagem recortada (`1:1`/`4:5`) + copy resumida + link rastreado `/app/:slug?offer=:offerId&utm_source=whatsapp_group` via adaptador WhatsApp da loja e gravar o resultado real em `public.offer_campaign_dispatches`.

### R6 — Plugin Interativo `@oferta` no Copilot & Carrossel Real do Radar IA
- **WHEN** o operador digitar `@` no `ChatComposer` ou clicar no botão `+`, **THE SYSTEM SHALL** exibir um popover acessível (`ArrowUp`/`ArrowDown`/`Enter`/`Escape`) destacando **`@oferta` — Criar & Disparar Oferta Hot, Stories, Grupo & Radar IA**.
- **WHEN** o modo `@oferta` é acionado com mídia/texto de cotação ou pacote, **THE SYSTEM SHALL** extrair os dados estruturados, executar `analyzeIncomingOfferAgainstPipelineFn` cruzando leads do CRM (`leads_crm`), interesses (`travel_interests`), demandas (`travel_client_demands`) e intenções de conversa/transcrição, e renderizar o card interativo `<CopilotHotOfferWorkflowCard />` com os Blocos A (Página de Oferta), B (Hot Story 9:16), C (Grupos WhatsApp 1:1/4:5 + copy) e D (Carrossel Horizontal de Leads Compatíveis com score `%`, motivos reais, alertas e botão de personalização individual).

---

## 2. Matriz de Entidades e Contratos (Fase 0)

| Camada | Arquivo / Tabela | Papel |
|---|---|---|
| Banco (SQL + RLS) | `supabase/migrations/20270608000000_hot_offers_black_stories_whatsapp_groups_and_inheritance.sql` | Criação de `public.hot_offers` e `public.offer_campaign_dispatches`; evolução de `public.travel_proposals`, `public.stories` e `public.whatsapp_groups_directory` com `ENABLE` + `FORCE ROW LEVEL SECURITY`. |
| Domínio Puro | `src/lib/tourism/hot-offer-sanitizer.ts` | Sanitização Zero-PII (`sanitizeProposalToHotOfferPayload`), gerador de copy persuasiva com UTM e clonagem/override de propostas filhas por cliente. |
| BFF Server Functions | `src/services/hot-offers.functions.ts` | CRUD de `hot_offers`, promoção Studio -> Oferta/Story, herança Oferta-Mestre -> Proposta de Cliente, match IA + disparo em grupos WhatsApp (`executeHotOfferOmnichannelActionFn`). |
| Studio de Propostas | `src/components/tourism/studio/hot-offer-publisher-dialog.tsx` & `src/routes/workspace.turismo.propostas.$id.tsx` | Banner de vantagem histórica + modal unificado de publicação Hot Offer / Story 9:16 / Grupos 1:1 / Radar IA. |
| App Próprio (`/app/:slug`) | `src/components/branded-app/hot-flame-avatar.tsx`, `src/components/branded-app/app-hot-offer-detail-sheet.tsx`, `src/components/stories/advanced-story-viewer.tsx`, `src/components/branded-app/branded-app-shell.tsx` | Avatar aceso em chamas pixeladas, viewer de stories com CTA interno e folha/página completa da oferta sem PII e sem fuga do tenant. |
| Grupos WhatsApp | `src/services/whatsapp-groups.functions.ts`, `src/routes/workspace.atendimento.grupos.tsx`, `src/lib/whatsapp-contact-suppression.server.ts` | Classificação `promo_offers` vs `internal_team`, silenciamento de captura de leads em grupos internos e disparo de ofertas. |
| Copilot `@oferta` | `src/types/chat.ts`, `src/components/chat/chat-composer.tsx`, `src/components/chat/copilot-hot-offer-workflow-card.tsx`, `src/components/chat/structured-message-view.tsx` | Menu inline `@oferta`, card interativo de 4 blocos no chat e carrossel horizontal de leads reais do Radar IA. |
