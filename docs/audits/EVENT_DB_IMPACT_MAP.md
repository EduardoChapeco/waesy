# EVENT_DB_IMPACT_MAP — Mapa de Impacto em Banco de Dados e Persistência

## 1. Tabelas Utilizadas pelo Domínio de Eventos (Zero Duplicação de Tabelas)

| Tabela | Papel no Domínio de Eventos | Colunas / Estruturas Chave | Impacto da Refatoração |
| :--- | :--- | :--- | :--- |
| `classifieds` | Armazena eventos criados via Criador Universal (`category = 'event'`) | `id`, `store_id`, `author_profile_id`, `title`, `content`, `price_cents`, `images`, `location_name`, `location_lat`, `location_lng`, `visibility`, `attributes` (JSONB) | **Compatível 100%** sem necessidade de migration destrutiva; novos campos estruturados (`organizers`, `access_points`, `sections`, `gallery_images`, `host_entity_type`, `timezone`) são persistidos em `attributes` e liberados em `CLASSIFIED_PUBLIC_ALLOWLIST_EXTRA`. |
| `classified_applications` | Armazena inscrições, bilhetes criptográficos WCTS-1, votos de enquetes e depoimentos de eventos | `id`, `classified_id`, `applicant_id`, `name`, `phone`, `email`, `candidate_role`, `cover_letter`, `status` | **Compatível 100%**; integrado com `checkoutClassifiedEventTicket`, `verifyClassifiedTicketByCode` e `getClassifiedEventPublicWall`. |
| `events` | Armazena eventos nativos do Workspace | `id`, `store_id`, `title`, `description`, `event_date`, `end_date`, `location`, `cover_image`, `capacity`, `status` | **Unificado** com `classifieds` em `_listAdminEvents` e `_getEventWithLots`. |
| `ticket_lots` & `tickets` | Lotes e bilhetes criptográficos WCTS-1 de eventos do Workspace | `event_id`, `lot_id`, `price_cents`, `capacity`, `sold_count`, `qr_hash`, `human_code`, `hmac_signature`, `status` | **Mantido e Integrado** com `checkAndRolloverEventLots`. |
| `leads_crm` | Funil comercial da loja/organizador | `store_id`, `full_name`, `phone`, `email`, `title`, `tags`, `notes` | Sincronizado automaticamente a cada emissão de ingresso em eventos vinculados a lojas. |
