# SPEC-20261116-FORENSIC-WAVES-REMEDIATION

## Status
Aprovada pelo usuário para execução sequencial completa em ondas atômicas (Ondas 0 a 4) em `2026-11-16`.

## Requisitos EARS por Onda

### Onda 0 — Higiene de Compilação, SSR, Contratos Estáticos & Testes Base
1. **REQ-O0-01 (SSR Shim Parity):** QUANDO o build SSR do TanStack Start resolver componentes client-only (`unified-proposal-workspace`, `proposal-canvas-renderer`, `contract-markdown-renderer`), O sistema DEVE mapear os subpaths exatos existentes em `vite.config.ts` para `serverClientNoopShim` evitando inclusão acidental de bundles pesados (>5k LOC) no `_worker.js`.
2. **REQ-O0-02 (Resiliência Cookie/Context Auth):** QUANDO `setClientContextCookies` executar em ambiente com `window` parcial ou SSR/Node, O código DEVE acessar `window.location?.hostname` e `window.location?.protocol` de forma defensiva sem lançar `TypeError`.
3. **REQ-O0-03 (Unificação Identity Boundary & Ingest):** QUANDO endpoints `/api/v1/ingest/*` autenticarem sessão usuário sem Bearer token, O handler DEVE importar `getServerIdentity` exclusivamente da ponte canônica `@/lib/server-access` e falhar fechado (`401`) para anônimos.
4. **REQ-O0-04 (Anti-Math.random Criptográfico):** ONDE códigos ou identificadores de passageiros/vouchers forem gerados (`applyParsedVoucherToTrip` e UI importadora), O sistema DEVE utilizar `crypto.randomUUID()` / Web Crypto em vez de `Math.random()`.
5. **REQ-O0-05 (Auditoria Estática Sem Falso-Verde):** O script `scripts/check-bff-table-contracts.mjs` DEVE validar referências `.from()` em `src/services/*.functions.ts`, `src/services/**/*.ts` e `src/registries/**/*.ts`, enquanto `src/test/setup.ts` NÃO DEVE mascarar vazamentos multi-tenant em testes unitários com `assertStoreAccess` vazio quando testado explicitamente.
6. **REQ-O0-06 (Zero Regressão Vitest + Diagnóstico Typecheck):** Todas as 9 suites Vitest falhando na baseline DEVEM ser corrigidas na causa raiz sem relaxar asserções, e `tsc` DEVE possuir verificação executável e previsível sem estourar memória/timeout.

### Onda 1 — Banco de Dados, DDL, RLS, RPCs, Índices, Vault/Realtime & `types.ts`
1. **REQ-O1-01 (Aplicação Segura de Migrations & Hardening SQL):** Aplicar as 7 migrations locais pendentes (`20270523..20270529`) no Postgres e criar migration corretiva única que: (a) restrinja `public.profiles` (`profiles_select_canonical`) expondo apenas colunas públicas via view sanitizada e bloqueando PII (`cpf`, `phone`, `pix_settings`, `pos_pin_code`, `acl_permissions`) para `{public}`; (b) remova `ALL USING (true)` em `domain_cooldowns`, `mined_products`, `crawler_sources`, `carona_waypoints`, `mobility_vehicle_sprites`; (c) defina `SET search_path = public, pg_temp` nas 3 RPCs `SECURITY DEFINER` pendentes e `security_invoker = true` em `v_customer_phones`; (d) indexe FKs críticas (`whatsapp_*`, `chat_*`, `leads_crm`, `orders`, `travel_*`, `billing_*`).
2. **REQ-O1-02 (Parity DB ⇄ `types.ts`):** Regenerar `src/integrations/supabase/types.ts` diretamente a partir do schema consolidado eliminando lacunas de tabelas e RPCs.

### Onda 2 — Segurança BFF, Webhooks, Env Runtime & Integridade de Schema
1. **REQ-O2-01 (Fail-Closed & Multi-Tenant BFF):** Toda `createServerFn` não-pública DEVE validar `getServerIdentity()` + `assertStoreAccess(...)` ou `requirePlatformAdmin()`, eliminando IDOR (`growth`, `contracts`, `promotions`, `travel-lifecycle`, `corporate-travel`, `events`, `service-packages`, `mining`, `billing-ledger`, `tokens`) e vazamento PII em `GET` (`receivables`, `legal-telemetry`).
2. **REQ-O2-02 (Preços Autoritativos & Anti-SSRF):** `quick-order`, `deals`, `travel-ecosystem-engines` DEVEM calcular preços e validar status exclusivamente pelo DB/gateway; `image-proxy` DEVE autenticar usuário e aplicar allowlist estrita anti-SSRF.
3. **REQ-O2-03 (Runtime Env Cloudflare & Zero Hardcoded Secrets):** Substituir `process.env.*` não-`NODE_ENV` em rotas/serviços por `getEnvVar()`, remover tokens fallback literais (`waesy_omni_cron_key_v2026`, `waesy-bus-hmac-secret-key-2026`) e tornar allowlist admin estritamente governada no servidor/DB.
4. **REQ-O2-04 (Reconciliação Estrita de Colunas & Tabelas):** Corrigir todas as 13 tabelas fantasmas (`mcp-tool-registry`, `whatsapp-ai-agent-tools`, `module-auditor`, `onboarding-pipeline`) e colunas inválidas verificadas em `.select` (`24`), `.insert/.update/.upsert` (`258`), `.eq/.order` (`34`) e RPC `increment_airport_view_count`, propagando erros reais em vez de `catch { return [] }`.

### Onda 3 — Fluxos End-to-End, WhatsApp Realtime & CRM Quick Actions
1. **REQ-O3-01 (WhatsApp Sync Vivo & Estado Explícito):** Cron/webhook Evolution + `timingSafeEqual` + `upsert` idempotente com fallback linha-a-linha em `whatsapp-evolution-sync.server.ts`, diferenciação visual completa (`não configurada | pendente QR | conectada | erro webhook | desativada`), e verificação real de Realtime + Vault/Cron fallback resiliente.
2. **REQ-O3-02 (CRM ⇄ WhatsApp ⇄ Ações Rápidas):** Integrar `whatsapp-leads-inbox` com `openOrCreateWhatsAppThreadForLead` (sem `wa.me` solto), corrigir `C360ContractsFinanceFormsView` (`public_token` -> `verification_code || public_token`), remover `catch { toast.success }` em `InlineSalesSpreadsheetAndGoalsPanel`, aguardar Promise antes do toast em `AtendimentoChatWorkspace`, e blindar loaders SSR (`app.$slug`, `_store.index`, `workspace.comercial`).

### Onda 4 — Design System, WCAG 2.2 AA, DOM Único & Otimização Final
1. **REQ-O4-01 (Texto/UTF-8, Ícones & Foco):** Sanear os 5 arquivos com mojibake UTF-8 (`76` ocorrências), remover `Sparkles` (`23` refs) para ícones canônicos Lucide, mover `:focus-visible` para elementos focáveis (`StoreCard`), e garantir loading/error states nas `8` rotas pendentes.
2. **REQ-O4-02 (Bifurcação Sem DOM Duplicado & Poda Limpa):** Substituir `md:hidden`/`hidden md:block` nos componentes críticos por `useEffectiveViewport()` (incluindo `_store.index`), consolidar wrappers pesados (`universal-classified-showcase`), remover funções mortas verificadas e registrar fechamento completo com evidências de Vitest, Typecheck, Build e `design-lint --ratchet`.
