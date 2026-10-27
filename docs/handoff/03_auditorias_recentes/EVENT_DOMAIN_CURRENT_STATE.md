# EVENT_DOMAIN_CURRENT_STATE — Auditoria Forense do Domínio de Eventos

| Subsistema | Existe? | Onde | Tabela / Persistência | API / BFF | Frontend / Editor | Workspace | Página Pública |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Event Entity** | Sim | `src/lib/classifieds/event-domain.ts` | `classifieds` (`category='event'`) + `events` | `classifieds.functions.ts`, `events.functions.ts` | `_store.conta.classificados.novo.tsx` | `workspace.eventos.index.tsx` | `event-classified-showcase-view.tsx` |
| **Editor CMS** | Sim | `src/routes/_store.conta.classificados.novo.tsx` | `classifieds.attributes` | `upsertClassified` | Seções 1 a 6 + Campos de Evento | `upsertEvent` | Paridade 1:1 no Live Preview |
| **Public Page** | Sim | `src/routes/_store.evento.$id.tsx`, `_store.classificados.$id.tsx` | `classifieds` + `events` | `getEventWithLots`, `getPublicClassifiedById` | `UniversalClassifiedShowcase` | — | `EventClassifiedShowcaseView` |
| **Workspace** | Sim | `src/routes/workspace.eventos.*.tsx` | `events`, `classifieds`, `ticket_lots` | `listAdminEvents` (Unificado) | Painel do Produtor | `/workspace/eventos` | `/evento/$id` |
| **Tickets** | Sim | `src/lib/classifieds/event-domain.ts` | `ticket_lots`, `tickets`, `classified_applications` | `checkoutClassifiedEventTicket`, `issueComplimentaryTicket` | Editor de Ingressos e Lotes | Portaria WCTS-1 | Checkout Modal + Sidebar |
| **Ticket Lots** | Sim | `resolveEffectiveTicketLotState` | `attributes.ticket_tiers` + `ticket_lots` | `checkAndRolloverEventLots` | Status + Janela Temporal + Estoque | Gestão de Lotes | Virada Automática |
| **Program / Schedule** | Sim | `EventScheduleItemNormalized` | `attributes.schedule` | `upsertClassified` | Cronograma com Palco + Palestrante + Descrição | — | `#section-programacao` Multi-Dia |
| **People (Organizers & Speakers)** | Sim | `EventOrganizerEntity`, `EventSpeakerNormalized` | `attributes.organizers`, `attributes.speakers` | `upsertClassified` | `<MediaUploader>` Retangular/Circular | — | `#section-palestrantes` + Sidebar |
| **Sponsors** | Sim | `EventPartnerNormalized` | `attributes.sponsors`, `eventos_parceiros` | `upsertClassified` | `<MediaUploader cropShape="rect">` | — | `#section-parceiros` |
| **Polls / Surveys** | Sim | `EventPollNormalized` | `attributes.surveys`, `classified_applications` | `voteClassifiedEventSurvey` | Editor de Enquetes | Resultados | `#section-enquetes` |
| **Media (Hero / Gallery / Story)** | Sim | `hero_image_url`, `gallery_images`, `story_url` | `classifieds.images`, `attributes.banner_image_url` | `upload-classified-media.ts` | Capa + Galeria + Story 9:16 | — | Hero Limpo + `#section-midia` + Lightbox |
| **Location & Access Points** | Sim | `buildGoogleMapsUrl`, `access_points` | `location_lat`, `location_lng`, `attributes.access_points` | `upsertClassified` | Local Principal + Acessos | — | `#section-local` |
| **Calendar Export** | Sim | `buildEventCalendarLinks` | Derivado de `event_date`, `start_time`, `timezone` | — | — | — | Google Calendar, Outlook e `.ics` |
