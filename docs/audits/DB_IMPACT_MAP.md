# DB_IMPACT_MAP.md — Mapa de Impacto em Banco de Dados, Schemas e Persistência

**Data:** 2026-10-21
**Status:** Auditado & Verificado

---

## 1. Tabelas Auditadas

| Tabela | Colunas de Template / Nicho / Configuração | Operação BFF | Diagnóstico de Schema & Migrações |
| :--- | :--- | :--- | :--- |
| `public.classifieds` | `category` (`text`), `sub_category` (`text`), `deal_type` (`text`), `delivery_mode` (`text`), `delivery_type` (`text`), `attributes` (`jsonb`), `feed_media` (`jsonb`), `payment_settings` (`jsonb`), `store_id` (`uuid`), `author_profile_id` (`uuid`) | `upsertClassified`, `getPublicClassifiedById`, `getPublicClassifieds`, `getClassifieds`, `createUnifiedListing`, `updateUnifiedListing` | Schema físico completo; não requer migration destrutiva. A falha estava na poluição do JSONB `attributes` e nos defaults incorretos de colunas (`deal_type`, `delivery_mode`, `max_guests`, `rental_period`) em `upsertClassified`. |
| `public.products` | `store_id` (`uuid`), `title` (`text`), `slug` (`text`), `price_cents` (`int4`), `metadata` (`jsonb`), `status` (`text`) | `createUnifiedListing`, `updateUnifiedListing`, `product.functions.ts` | `metadata` JSONB armazena `template_id`, `niche` e especificações técnicas. |
| `public.experience_documents` | `id` (`uuid`), `store_id` (`uuid`), `title` (`text`), `slug` (`text`), `document_type` (`text`), `settings` (`jsonb`), `published_version_id` (`uuid`), `draft_version_id` (`uuid`) | `saveOmniPageDocument`, `getOmniPageDocument`, `publishOmniPageDocument` | Operado via RPC transacional `persist_omni_document_snapshot`. |
| `public.experience_versions` | `id` (`uuid`), `document_id` (`uuid`), `version_number` (`int4`), `status` (`text`), `document_snapshot` (`jsonb`) | `persist_omni_document_snapshot`, `getOmniPageDocument` | Armazena snapshots imutáveis de rascunho (`draft`) e publicação (`published`). |
| `public.studio_template_drafts` | `store_id` (`uuid`), `user_id` (`uuid`), `template_key` (`text`), `draft_data` (`jsonb`), `schema_version` (`int4`) | `saveStudioTemplateDraft`, `getStudioTemplateDrafts`, `deleteStudioTemplateDraft` | Persistência por loja (`store_id`) e template (`template_key`) com constraint única `(store_id, template_key)`. |

---

## 2. Correções de Integridade de Persistência (Sem Migrations Desnecessárias)

Seguindo a Diretiva 0.6 e Fase 7 ("NÃO crie tabelas ou colunas novas enquanto não verificar se já existe implementação equivalente"):
1. **Colunas Top-Level de `public.classifieds`:**
   - `deal_type`: gravado apenas quando enviado explicitamente ou quando `category === "real_estate"` (default `"venda"`). Para `travel`, `service`, `job`, `event`, etc., permanece `null` para nunca vazar "Finalidade: Venda".
   - `max_guests` e `rental_period`: gravados apenas quando `category === "real_estate"` ou `hospedagem`, permanecendo `null` nos demais nichos.
   - `delivery_mode` e `delivery_type`: assumem `"pickup"` apenas para categorias de bens físicos (`sale`, `food`, `equipment`, `donation`), permanecendo `null` para `travel`, `service`, `real_estate`, `job`, `event`.
2. **JSONB `public.classifieds.attributes`:**
   - `template_style` persistido em 100% dos fluxos (`handlePublish` e `handleSaveDraft`).
   - Atributos de viagem (`destination_city`, `flight_details`, `itinerary_days`, `story_highlights`, `bio_bullets`, `lodgings`) gravados exclusivamente quando `niche.id === "viagem"`.
3. **Preservação de `author_profile_id` e Validação de `store_id`:**
   - Em atualizações (`isUpdating`), `author_profile_id` original do registro é preservado.
   - Em criações e atualizações com `store_id`, o BFF valida se o usuário autenticado possui vínculo legítimo com a loja antes de persistir.
