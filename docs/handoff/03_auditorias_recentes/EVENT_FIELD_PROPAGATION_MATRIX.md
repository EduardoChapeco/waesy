# EVENT_FIELD_PROPAGATION_MATRIX — Matriz Ponta-a-Ponta de Propagação de Campos

| Campo no Editor | State no Form | Payload de Save (`attributes`) | Persistência DB | BFF Public Allowlist | Normalizador (`normalizeEventDomain`) | Renderização no Preview | Renderização Pública | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Título do Evento** | `title` | `data.title` | `classifieds.title` | Sim | `vm.title` | Header Full-Width (Zero Truncate) | Header Full-Width (Zero Truncate) | **OK** |
| **Capa Hero (16:9 / 21:9)** | `eventBannerUrl` | `banner_image_url` | `attributes.banner_image_url` | Sim | `vm.hero_image_url` | Hero sem sombra escura | Hero sem sombra escura | **OK** |
| **Galeria Exclusiva** | `images` | `data.images` + `gallery_images` | `classifieds.images` | Sim | `vm.gallery_images` | `#section-midia` + Lightbox | `#section-midia` + Lightbox | **CORRIGIDO** |
| **Story Vertical (9:16)** | `eventStoryUrl` | `story_url`, `story_auto_open` | `attributes.story_url` | Sim | `vm.story_url` | Botão Story + Modal 9:16 | Botão Story + Modal 9:16 | **OK** |
| **Datas e Horários** | `eventDate`, `eventEndDate`, `eventStartTime`, `eventEndTime`, `eventGatesOpenTime` | `event_date`, `end_date`, `start_time`, `end_time`, `gates_open_time`, `timezone` | `attributes.*` | Sim | `vm.date_tile`, `vm.formatted_date_range` | Resumo Estruturado + Agenda | Resumo Estruturado + Agenda | **OK** |
| **Preço do Ingresso/Lote** | `tier.price` | `price` + `price_cents` (`Math.round(price * 100)`) | `attributes.ticket_tiers` | Sim | `resolveTierPriceCents` (`GRÁTIS` ou BRL) | Card de Ingresso + Sidebar | Card de Ingresso + Sidebar | **CORRIGIDO** |
| **Link Externo do Lote** | `tier.purchase_url` | `purchase_url` + `external_url` | `attributes.ticket_tiers` | Sim | `tier.external_url` | CTA Compra Externa | CTA Compra Externa | **CORRIGIDO** |
| **Palco / Sala da Atividade** | `item.stage` | `stage` + `stage_or_room` | `attributes.schedule` | Sim | `item.stage_or_room` | Badge na Programação | Badge na Programação | **CORRIGIDO** |
| **Palestrante vs Descrição** | `item.speaker_name`, `item.description` | Campos independentes | `attributes.schedule` | Sim | `item.linked_speaker` + `item.description` | Card de Palestrante Vinculado | Card de Palestrante Vinculado | **CORRIGIDO** |
| **Foto e Rede Social do Palestrante** | `speaker.avatar_url`, `speaker.social_url` | `avatar_url`/`photo_url`, `social_url`/`social_link` | `attributes.speakers` | Sim | `speaker.photo_url`, `speaker.social_url` | `#section-palestrantes` | `#section-palestrantes` | **CORRIGIDO** |
| **Logo do Organizador / Patrocinador** | `eventHostAvatarUrl`, `sponsor.logo_url` | `host_avatar_url`, `host_entity_type`, `sponsors` | `attributes.*` | Sim | `org.entity_type`, `sp.logo_url` | Container Retangular `object-contain` | Container Retangular `object-contain` | **CORRIGIDO** |
| **Selo de Verificação** | Derivado da loja/perfil | `store.is_verified` / `profiles.is_verified` | `stores` / `profiles` | Sim | `org.is_verified` | Exibido apenas se verificado real | Exibido apenas se verificado real | **CORRIGIDO** |
