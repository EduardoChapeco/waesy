# EVENT_CONTRACT_ALIGNMENT_MATRIX — Matriz de Alinhamento de Contratos (Frontend ↔ BFF ↔ DB)

| Domínio / Sub-objeto | Contrato Frontend (Editor) | Contrato BFF (`classifieds.functions.ts` & `events.functions.ts`) | Contrato Canônico (`EventDomainViewModel`) | Status de Alinhamento |
| :--- | :--- | :--- | :--- | :--- |
| **Ticket Tier Price** | `price: number` + `price_cents: number` | `attributes.ticket_tiers[].price_cents` | `resolveTierPriceCents(t)` -> `price_cents` e `price` | **100% Alinhado** |
| **Ticket External URL** | `purchase_url` + `external_url` | `attributes.ticket_tiers[].external_url` | `t.external_url \|\| t.purchase_url` | **100% Alinhado** |
| **Schedule Stage & Description** | `stage` + `stage_or_room`, `speaker_name` separado de `description` | `attributes.schedule[]` | `item.stage_or_room`, `item.speaker_name`, `item.description`, `item.linked_speaker` | **100% Alinhado** |
| **Speaker Photo & Social** | `avatar_url` + `photo_url`, `social_url` + `social_link` | `attributes.speakers[]` | `sp.photo_url`, `sp.social_url` | **100% Alinhado** |
| **Sponsor Tier & Logo** | `tier: "master" \| "ouro" \| "prata" \| "apoio"`, `logo_url` | `attributes.sponsors[]` | `sp.tier` (`master` -> `ouro`), `sp.logo_url` | **100% Alinhado** |
| **Survey Options** | `options: string[]` ou `Array<{ id, text, votes }>` | `attributes.surveys[]` | `EventPollOptionNormalized[]` | **100% Alinhado** |
| **Organizers & Entity Type** | `host_entity_type: "ORGANIZATION" \| "PERSON"`, `organizers[]` | `CLASSIFIED_PUBLIC_ALLOWLIST_EXTRA` | `event.primary_organizer`, `event.organizers` | **100% Alinhado** |
| **Gallery & Story Media** | `images`, `gallery_images`, `story_url`, `banner_image_url` | `classifieds.images`, `attributes.*` | `hero_image_url`, `gallery_images`, `story_url` | **100% Alinhado** |
