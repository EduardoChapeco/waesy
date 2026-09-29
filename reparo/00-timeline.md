# TIMELINE DE EVENTOS E ANÁLISE FORENSE (SPEC-004)

## Janela Temporal: 2026-09-28T16:00:00 a 2026-09-28T16:30:00

| Horário | Fonte | Evento Observado | Correlação e Causa Raiz |
| :--- | :--- | :--- | :--- |
| **16:05:12** | Console / Network | `POST /_server/getSignedUploadUrl` retorna status 500 com erro de validação Zod: `invalid_enum_value` para bucket `"store-assets"`. | **Q-0001 (Causa Raiz D1):** O validador Zod em `storage.functions.ts` possui lista restrita de buckets omitindo `"store-assets"`, `"destination-media"` e `"social"`. O cliente sofre fallback forçado. |
| **16:09:44** | Backend / PostgREST | `GET /rest/v1/stores?owner_profile_id=eq...` retorna erro 400: `column stores.owner_profile_id does not exist`. | **Q-0005 (Causa Raiz D5-8):** `classifieds.functions.ts` tenta validar autoridade de loja via coluna inexistente `owner_profile_id` em vez de consultar `store_members` / `workspace_members`. |
| **16:14:22** | Sessão / Cookies | Usuário conclui criação de loja em `_store.criar-negocio.tsx`. Cookie `waesy_active_tenant` é gravado, mas `waesy_active_context` permanece `"civil"`. Redireciona para `/workspace`. | **Q-0002 (Causa Raiz D2 & D3):** `identity.server.ts` lê `waesy_active_context === "civil"` e limpa `activeStoreId = null` (Zero-Trust Civil Root). As Server Functions do Workspace falham por falta de `store_id`. |
| **16:18:05** | UI / Workspace | Ao alternar de loja no `workspace-shell.tsx`, `handleSwitchStore` define `waesy_active_tenant`, mas chamadas em background mantêm headers do contexto anterior até reload completo. | **Q-0004 (Causa Raiz D4):** Divergência entre cookies de cliente e sessão do servidor. `setTenantContext` não atualizava atomicamente `waesy_active_context=store` e `waesy_active_creator=""`. |
| **16:22:30** | UI / Layout | Card de classificado na vitrine `_store.classificados.index.tsx` renderiza com `aspect-16/10`, enquanto upload gravou em `4:3` e preview usou `16:9`. | **Q-0005 (Causa Raiz D5-7):** Falta de padronização com `docs/marca/ATIVOS.md`, resultando em cortes de cabeçalho e distorção visual em mobile e desktop. |

---

## Primeiro Evento & Justificativa de Causa Raiz
O evento **16:05:12 (Q-0001)** precede todos os demais fluxos porque o upload de ativos é pré-requisito fundamental tanto para o cadastro de negócio (logo e capa) quanto para a publicação de anúncios e vitrines. Ao falhar na validação Zod do bucket, o pipeline gera cascatas de degradação e erros de RLS.
