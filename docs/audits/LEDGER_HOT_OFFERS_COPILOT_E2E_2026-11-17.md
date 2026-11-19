# WAESY EVIDENCE LEDGER — Hot Ofertas Black + Copilot `@oferta` + Radar IA + Grupos WhatsApp + Herança Oferta-Mestre <-> Proposta Editável

- **Data:** 2026-11-17
- **Branch:** `release/prod-20261113-fullpage-chat-copilot`
- **Base Commit:** `c0e1d351`
- **Spec:** `docs/specs/SPEC-HOT-OFFERS-COPILOT-AND-WHATSAPP-ENGINE.md`

---

## 1. Preflight & Inventário (Fase 0)

| Domínio | Arquivos Inspecionados | Diagnóstico Baseline |
|---|---|---|
| Stories & Viewer | `src/services/stories.functions.ts`, `src/components/stories/advanced-story-viewer.tsx` | `stories` possui `media_url`, `caption`, `link_url`, `link_label`, `expires_at`. Falta suporte a `story_kind`, `hot_offer_id`, `flame_style` e callback interno no `AdvancedStoryViewer` para abrir a oferta dentro de `/app/:slug` sem sair do App. |
| Image Cropper | `src/components/ui/image-cropper-dialog.tsx` | Componente canônico já suporta presets `9:16`, `4:5`, `1:1`, `16:9` e retorna Base64/Blob. Será reutilizado 100% sem duplicação. |
| Grupos WhatsApp | `src/services/whatsapp-groups.functions.ts`, `src/routes/workspace.atendimento.grupos.tsx`, `src/services/whatsapp-outbound-adapters.server.ts`, `src/lib/whatsapp-contact-suppression.server.ts` | Tabela real é `public.whatsapp_groups_directory`. Falta `group_role` (`promo_offers`, `internal_team`, `client_vip`, `operational`), `auto_publish_eligible`, `silence_lead_capture` e bloqueio de grupos internos no disparo promocional. |
| Radar IA & Match | `src/services/opportunity-radar.functions.ts`, `src/lib/travel/opportunity-matching-engine.ts` | `evaluateHistoricalAdvantage` e `analyzeIncomingOfferAgainstPipelineFn` já operam sobre `leads_crm`, `travel_interests` e `travel_client_demands`. |
| Studio de Propostas | `src/routes/workspace.turismo.propostas.$id.tsx`, `src/services/travel-proposal.functions.ts` | Propostas não possuem vínculo bilateral `source_offer_id` / `promoted_to_offer_id` com `public.hot_offers` nem gatilho visual de vantagem histórica para publicação em 1 clique. |
| Copilot Chat (`@oferta`) | `src/types/chat.ts`, `src/components/chat/chat-composer.tsx`, `src/components/chat/structured-message-view.tsx` | `CopilotQuickToolMode` tem `website_builder`, `interactive_map`, `document`, `creative_post`. Falta `hot_offer` (`@oferta`), detecção inline de `@` no textarea e bloco estruturado `hot_offer_workflow`. |

---

## 2. Progresso por Fase

- [x] **Fase 0:** Inventário completo, matriz de entidades e spec EARS registrada.
- [ ] **Fase 1:** Migração SQL idempotente (`20270608000000_hot_offers_black_stories_whatsapp_groups_and_inheritance.sql`) + motor `hot-offer-sanitizer.ts` + BFF `hot-offers.functions.ts`.
- [ ] **Fase 2:** Gatilho de vantagem histórica no Studio + `<HotOfferPublisherDialog />` com `ImageCropperDialog` 9:16 e 1:1/4:5.
- [ ] **Fase 3:** `<HotFlameAvatar />` (fogo pixelado com `motion-reduce:animate-none`) + Hot Stories + `<AppHotOfferDetailSheet />` interno em `/app/:slug`.
- [ ] **Fase 4:** Gestão de papéis de grupos WhatsApp (`promo_offers` vs `internal_team`) + disparo seguro `dispatchHotOfferToWhatsAppGroupsFn`.
- [ ] **Fase 5:** Plugin interativo `@oferta` no `ChatComposer` + `<CopilotHotOfferWorkflowCard />` com carrossel horizontal de leads reais + herança `source_offer_id`.
- [ ] **Fase 6 & 7:** Consolidação, Design Lint (`DL-01..DL-32`), bateria final de 8 níveis e registro `DEC-513`.
