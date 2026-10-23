# RLS_SECURITY_REPORT.md — Auditoria de Segurança Server-Side, RLS e Multi-Tenant

## 1. Resumo Executivo
Auditoria de segurança server-side e isolamento multi-tenant na cadeia de persistência e leitura pública de anúncios (`classifieds`, `products`, `stores`, `workspace_members`).

---

## 2. Matriz de Controles de Segurança Verificados

| Vetor / Superfície | Vulnerabilidade Auditada | Correção / Blindagem Aplicada | Evidência |
|---|---|---|---|
| **Vínculo Multi-Tenant Indevido (`store_id` Spoofing)** | `upsertClassified` aceitava `rest.store_id` no payload de criação/atualização sem verificar se o usuário autenticado pertencia à loja informada (`BUG-08A`). | Validação Zero-Trust adicionada em `upsertClassified` (`src/services/classifieds.functions.ts`): verifica `identity.store_id`, `identity.memberships`, `stores.owner_id` ou registro ativo em `workspace_members` antes de permitir persistência com `store_id`. | `src/services/classifieds.functions.ts` |
| **Preservação de Autoria em Edição Colaborativa (`author_profile_id`)** | Quando um gestor de loja ou admin editava um anúncio existente em `upsertClassified`, `payload.author_profile_id` sobrescrevia o autor original com `identity.id` (`BUG-08B`). | Em modo de atualização (`isUpdating`), `payload.author_profile_id` preserva estritamente `existingAd.author_profile_id` após validar a autoridade de edição. | `src/services/classifieds.functions.ts` |
| **Proteção de Dados Comerciais e Fiscais Sensíveis** | Risco de exposição de `cost_cents`, `margin_percent`, `markup_percent`, `fiscal_profile`, `pix_key` e `payment_settings` para visitantes anônimos. | Em `getPublicClassifiedById` e `mapDatabaseRowToUnifiedListing(..., isPublic = true)`, todos os campos de custo, margem, perfil fiscal e chaves Pix privadas permanecem estritamente removidos para visitantes não-proprietários. | `src/services/classifieds.functions.ts`, `src/services/unified-listing.functions.ts` |
| **Privacidade Geográfica LGPD (`hide_location`)** | Risco de vazamento de coordenadas exatas (`location_lat`, `location_lng`, `neighborhood`) quando `hide_location === true`. | Blindagem server-side mantida em `getPublicClassifiedById`: zera `location_lat`, `location_lng`, `location_name`, `city`, `state` e `neighborhood` para visitantes quando `isPrivacyHidden === true`. | `src/services/classifieds.functions.ts` |
| **Visibilidade de Rascunhos e Pausados (`paused` / `archived`)** | Visitantes não-proprietários tentando acessar URL direta de anúncio pausado ou arquivado. | Bloqueio server-side retorna `classified: null, status: "not_found"` quando `(status === "paused" || status === "archived") && !canManage`. | `src/services/classifieds.functions.ts` |
| **Auditoria Forense Imutável (`audit_logs`)** | Rastreabilidade de criações e edições de anúncios. | Gravação de snapshot em `audit_logs` (`classified.create` e `classified.update`) com `store_id`, `user_id`, `entity_id` e `payload_snapshot`. | `src/services/classifieds.functions.ts` |
