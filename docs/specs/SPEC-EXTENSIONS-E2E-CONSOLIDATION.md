# SPEC-EXTENSIONS-E2E-CONSOLIDATION

**Código:** `SPEC-EXTENSIONS-E2E-CONSOLIDATION`  
**Data:** 2026-11-11  
**Status:** Aprovada para Execução  
**Escopo:** `tools/infotravel-extension/*`, `tools/whatsapp-extension/*`, `tools/infotravel-miner/*`, `scripts/build-extensions-bundle.mjs`, `src/generated/extensions-bundle.server.ts`, `src/services/extensions-distributor*`, `src/services/whatsapp-group-ingest*`, `src/services/travel-operator-sync*`, `src/services/travel-quote-capture*`, `src/routes/api.v1.extensions.download.ts`, `src/routes/api.v1.ingest.*`, `src/components/extensions/ExtensionWebStoreModal.tsx`, `src/components/admin/infotravel-integration-panel.tsx`, `src/components/commercial/whatsapp-group-ingest-modal.tsx`, `src/routes/admin-master.modulos.tsx`, `supabase/migrations/20270327000000_extensions_e2e_consolidation.sql`.

---

## 1. Requisitos em Sintaxe EARS

1. **UBIQUITOUS (Empacotamento Build-Safe em Cloudflare Pages):**  
   O sistema DEVE empacotar e distribuir os pacotes ZIP de `infotravel_extension`, `whatsapp_extension` e `infotravel_miner` a partir de um bundle estático gerado em build time (`src/generated/extensions-bundle.server.ts`), sem depender de `node:fs` ou `process.cwd()/tools` no runtime do Worker, excluindo integralmente diretórios sensíveis (`output/`, `.chrome-session/`, `node_modules/`, `.git/`).

2. **UBIQUITOUS (Autenticação Zero-Trust de Ingestão):**  
   Todas as rotas de ingestão externa (`/api/v1/ingest/whoami`, `/api/v1/ingest/whatsapp-contacts`, `/api/v1/ingest/infotravel-quotes`, `/api/v1/ingest/infotravel-reservations`) DEVEM validar o Bearer token SHA-256 em `ingest_tokens` (derivando `store_id` exclusivamente do token no servidor) ou sessão SSR autenticada quando aplicável, nunca confiando em `x-waesy-store-id` ou `body.storeId` sem autenticação.

3. **EVENT-DRIVEN (Sincronização Bilateral de Governança):**  
   QUANDO o Admin Master aprovar, conceder ou revogar o acesso de uma loja às extensões em `admin-master.modulos`, o servidor DEVE atualizar simultaneamente `stores.settings.authorized_extensions`, `extension_access_requests` e `workspace_feature_grants` (`whatsapp_group_ingest` e `infotravel_sync`), verificando explicitamente erros PostgREST.

4. **UBIQUITOUS (Cobertura Universal Infotravel — Orinter, FRT, Incomum, Schultz e Qualquer Portal Infotravel):**  
   A extensão `Waesy Sync` (`tools/infotravel-extension`) DEVE detectar e extrair reservas, passageiros, financeiro e cotações em qualquer portal Infotravel (domínios explícitos de Orinter, Incomum, FRT, Schultz, New Age, Personal, Visual, Trend, Ancoradouro, Infotravel, URLs contendo `infotravel`, bem como domínios customizados ativados sob demanda via `chrome.scripting` + `optional_host_permissions`), isolando a leitura ao painel/modal ativo PrimeFaces (`.ui-tabs-panel` visível ou `.ui-dialog` visível), detectando o `operatorSlug` dinamicamente pelo hostname/título e enviando reservas e cotações autenticadas por Bearer token ao Waesy Cloud com fila de retentativa e espelho opcional local.

5. **EVENT-DRIVEN (Varredura Completa de Grupos WhatsApp Web):**  
   QUANDO o usuário acionar "Escanear Participantes do Grupo" na extensão `Waesy Ingest` (`tools/whatsapp-extension`), o content script DEVE percorrer a lista virtualizada do painel de dados do grupo e do modal de membros com auto-scroll incremental para coletar todos os participantes (telefone/JID + nome), dividir o envio em lotes `<= 500` itens, interpretar corretamente o payload de `whoami` (`store`) e os contadores reais da RPC `ingest_group_contacts` (`created`, `merged`, `skipped_customer`, `skipped_opted_out`, `invalid`, `duplicate_in_batch`, `replayed`).

6. **UBIQUITOUS (Contrato Canônico CSV/JSON, Coletor Local e Persistência SQL Real):**  
   `infotravel-extension`, `coletor.mjs`, `miner.mjs` e `InfotravelIntegrationPanel.tsx` DEVEM compartilhar o mesmo contrato canônico CSV de 23 colunas e protocolo de status local (`http://127.0.0.1:3333/api/status` e `/status`). No servidor, `ingestOperatorSyncBatch` e `ingestTravelQuoteCapture` DEVEM persistir exclusivamente em colunas reais do schema PostgreSQL (`customers_crm`, `tourism_trips`, `trip_passengers`, `travel_departures_kanban`, `travel_sale_financial_sheets`, `travel_opportunities`).

7. **UNWANTED BEHAVIOUR (Tratamento Honesto de Erros e UI Acessível):**  
   O endpoint `/api/v1/extensions/download` NÃO DEVE mascarar erros internos (`500`) como bloqueio de permissão (`403`). As extensões Chrome e modais React NÃO DEVEM usar `alert()`/`confirm()` bloqueantes nem aninhar `<Dialog>` dentro de `<Dialog>`, preservando alvos táteis `>= 44px` e `:focus-visible`.

---

## 2. Critérios de Aceite & Evidências

- [ ] `scripts/build-extensions-bundle.mjs` gera `src/generated/extensions-bundle.server.ts` sem PII (`output/*.csv`) e é executado automaticamente no `npm run build`.
- [ ] `buildExtensionZip` gera ZIPs válidos mesmo quando `tools/` não existe no `process.cwd()`.
- [ ] Ícones PNG (16, 48, 128px) presentes e referenciados em ambos `manifest.json` para carregamento imediato via `chrome://extensions` ("Carregar sem compactação").
- [ ] `tools/infotravel-extension` opera em Orinter, FRT, Incomum, Schultz e qualquer site Infotravel, sincroniza reservas + cotações via Bearer token, recebe logs em tempo real no popup e exporta CSV canônico de 23 colunas.
- [ ] `tools/whatsapp-extension` escaneia listas virtualizadas com scroll, envia em lotes `<= 500`, e exibe métricas reais da RPC e nome real da loja.
- [ ] `tools/infotravel-miner/coletor.mjs` e `miner.mjs` alinhados no CSV de 23 colunas, gravação JSON e sync opcional via Bearer token.
- [ ] Reconciliação SQL de `ingestOperatorSyncBatch` e `travel-quote-capture` alinhada com migrations/schema real.
- [ ] `npm run typecheck`, `npm test` (suíte focada + completa), `npm run build` (`check-client-server-leak`) e `node scripts/design-lint.mjs --ratchet` aprovados com Exit Code 0.
