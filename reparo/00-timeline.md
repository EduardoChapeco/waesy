# Linha do Tempo Forense — Queda de Sessão, Loop de Login/Logout e Instabilidade SSR (2026-11-06)

## 1. Sintoma Relatado
O usuário autentica em `/entrar` ou `/painel`, recebe confirmação visual de login, mas ao navegar para `/workspace`, `/admin-master` ou vitrine (`/`), a sessão cai imediatamente ou entra em loop de login/logout sozinho.

## 2. Sequência Cronológica dos Eventos (Causa Raiz Isolada)

1. **`t = 0ms` (Estado Pré-Existente no Navegador):**
   - O navegador possui cookies `waesy-auth-token` / `waesy-auth-token.0` / `waesy-auth-token.1` (ou `sb-*-auth-token*`) gravados como **host-only** (sem atributo `Domain`) em sessões anteriores a `2026-11-06T06:43:17-03:00` (commit `2579c644` / DEC-443).

2. **`t = 50ms` (Execução de Login em `signInWithPassword` — `src/services/auth.functions.ts:243`):**
   - O BFF autentica no Supabase Auth. Para `meuwider@gmail.com` (`2ea9f0aa-8b04-4086-9e1d-e23105560302`), o objeto `user` tem `1242 bytes` e a sessão serializada em base64 tem `~3060 bytes` (`<= 3180 bytes`, limite de chunking do `@supabase/ssr`).
   - O `@supabase/ssr` grava um cookie **unchunked** `waesy-auth-token` com `Domain=.waesy.com.br` (`src/lib/supabase-ssr.server.ts:128`).
   - Como o novo cookie possui `Domain=.waesy.com.br`, o navegador **não sobrescreve nem remove** os cookies host-only antigos (`waesy-auth-token.0`, `waesy-auth-token.1`, `waesy-auth-token` sem `Domain`). Ambos passam a coexistir no `document.cookie` e no header HTTP `Cookie:`.

3. **`t = 120ms` (Dupla Mutação no Cliente — `src/routes/_store.entrar.tsx:285`):**
   - O cliente chama `getBrowserClient().auth.setSession({ access_token, refresh_token })`.
   - O `createBrowserClient` (`src/lib/supabase.ts:108`) lê `document.cookie` usando o parser padrão do `@supabase/ssr`, que retém apenas a **primeira** ocorrência de cada nome de cookie (o cookie host-only antigo/expirado!).
   - Simultaneamente, `setSession()` dispara verificação/refresh concorrente com `router.invalidate()`.

4. **`t = 180ms` (Descarte da Nova Sessão pelo Servidor — `src/lib/supabase-ssr.server.ts:67-80`):**
   - Na requisição seguinte (`getUserSession()` em `/workspace`), o navegador envia tanto o cookie novo (`waesy-auth-token`) quanto o chunk antigo host-only (`waesy-auth-token.0`).
   - Em `src/lib/supabase-ssr.server.ts:67-75`:
     `const hasChunks = parsed.some(c => c.name.startsWith("waesy-auth-token."))` avalia como `true` por causa do `.0` antigo morto.
     A regra `if (hasChunks && c.name === "waesy-auth-token") continue;` **descarta o cookie novo válido recém-logado** e entrega apenas o chunk `.0` morto ao `@supabase/ssr`!
   - Quando ambos são chunked (`.0` e `.1`), a regra `else if (c.value.length > existing.length)` (`linha 79`) mantém o **primeiro** `.0` (pois todo `.0` tem exatamente `3180 chars`, logo `3180 > 3180` é `false`, mantendo o `.0` antigo morto) e o concatena com o `.1` mais longo (novo), gerando JSON corrompido.
   - Ao receber JSON corrompido ou token expirado, o `@supabase/ssr` executa `_removeSession()` e emite `Set-Cookie: waesy-auth-token=; Max-Age=0; Domain=.waesy.com.br`, **apagando a sessão recém-criada** enquanto o cookie host-only morto permanece intacto (pois `setAll` nas linhas `114` e `123` enviava `domain: cookieDomain` em ambas as chamadas).

5. **`t = 250ms` (Perda de Contexto Assíncrono `unctx` e Prerender em Background):**
   - Em `src/lib/identity.server.ts:210-230`, `getRequestHeader("cookie")` e `resolveTenantStoreId()` eram chamados **após** 3 `await`s de rede para o Supabase, perdendo o contexto síncrono do H3/Vinxi (`Context is not available`).
   - Em `src/routes/__root.tsx:328-341`, `<script type="speculationrules">` com `prerender: /*` pré-renderizava rotas `/_store` em background, disparando `src/routes/_store.tsx:137` (`setClientContextCookies({ context: "civil" })`), que apagava o cookie `waesy_active_tenant` enquanto o usuário operava no `/workspace`.

6. **`t = 300ms` (Crash Adicional em Produção Identificado nos Logs do Supabase):**
   - Em `public.system_audit_logs`, 20 ocorrências de `TypeError: Cannot read properties of undefined (reading 'id')` em `/workspace/atendimento` (`src/routes/workspace.atendimento.index.tsx:1933`), causado pelo acesso a `activeThread.id` sem optional chaining dentro do JSX do `<Sheet>` quando nenhuma conversa está selecionada.

---

# Linha do Tempo Forense — Auditoria de Logs Produção, RPCs Quebradas, 404/406 e Schema Drift (2026-11-15)

## 1. Sintomas Observados nos Logs (Supabase & Live Probe)
- **Supabase `edge_logs` / `postgres_logs`:** `52405` requisições analisadas com `400 Bad Request` (`878`), `404 Not Found` (`43`) e `406 Not Acceptable` (`13`).
- **`public.system_audit_logs` (2026-11-12 a 2026-11-15):** `37` ocorrências de `Error: Invariant failed` em `/workspace`, `/workspace/pedidos` e `/workspace/pedidos/frota` vindas do chunk `workspace.pedidos.gestor`, além de `TypeError: Cannot read properties of undefined (reading 'map')` em `/workspace/copilot` (`ArtifactCreativePost`).
- **Probe ao vivo (`https://waesy.com.br`):** `/lojas` retornando HTTP `404`; `/api/cron/ai-jobs` e `/api/cron/ai-scheduled-tasks` retornando `404` no deploy anterior (`3d4859e1`); `/sitemap.xml` consultando 5 tabelas inexistentes no PostgreSQL.

## 2. Causas-Raiz Isoladas e Verificadas no Banco Real (`information_schema` & `pg_proc`)
1. **RPC e Queries de Caixa (`cash_registers` / `cash_register_entries`):**
   - `public.close_cash_register` (Postgres) filtra `WHERE register_id = p_register_id` (coluna inexistente; real: `cash_register_id`) e atualiza `expected_balance_cents` / `final_balance_cents` (colunas inexistentes; reais: `expected_closing_balance_cents` / `actual_closing_balance_cents`).
   - `src/services/dashboard.functions.ts:309` executa `.eq("register_id", activeRegister.id)` em `cash_register_entries`.
   - `src/services/cash.functions.ts` modela `CashRegisterRow` e lê `expected_balance_cents` / `final_balance_cents` sem mapear `expected_closing_balance_cents` / `actual_closing_balance_cents`.
2. **Schema Drift em `order_items`, `orders` e `events` (HTTP 400):**
   - `order_items` possui `(id, order_id, variant_id, product_title, variant_sku, variant_attributes, image_url, qty, unit_price_cents, total_cents, created_at, item_type, item_id, selected_options, notes)`.
   - `src/services/order.functions.ts:86,113,534`, `src/services/event-tickets.functions.ts:289`, `src/services/kitchen-prep.functions.ts:227` e `src/services/chat.functions.ts:2546` selecionam colunas inexistentes (`metadata`, `quantity`, `product_name`, `title`, `price_cents`) e/ou `user_id`/`total_amount_cents`/`payment_method` em `orders` ou `banner_image_url` em `events`.
3. **Filtros UUID vs Slug sem Guarda em `directory_listings` e `stores` (Postgres `22P02` -> HTTP 400):**
   - `src/services/directory.functions.ts:184,342`, `src/services/catalog.functions.ts:958` e `src/services/places-detail.functions.ts:116,189` aplicam `id.eq.<slug>` ou coluna inexistente `directory_listings.slug` quando o identificador não é UUID.
4. **PostgREST `406 Not Acceptable` e Tabelas Mortas (`404`):**
   - `src/services/events.functions.ts:1371` (`_getEventWithLots`) e `:806` usam `.single()` antes do fallback de classificados/lotes, gerando HTTP `406` quando `0` linhas retornam.
   - `src/services/supermarket.functions.ts:119` consulta tabela inexistente `store_delivery_windows`.
   - `src/routes/sitemap[.]xml.ts:70-71,123,126,128` consulta `travel_destinations`, `travel_hotels`, `mined_recipes`, `links_in_bio` e `store_raffles` (reais: `destinations`, `global_hotels`, `mined_raw_extractions`, `link_in_bio` + `stores(slug)`, `raffles`).
5. **Rotas, Testes e Hardening de UI:**
   - `src/components/commerce/ifood/IFoodRecentStoresRail.tsx:26` aponta `viewMoreTo = "/lojas"` (`404`; canônico: `"/diretorio"`).
   - `src/services/__tests__/cross-tenant-rls-isolation.test.ts:88` envia `.eq('id', undefined)` quando sem pool Postgres.
   - `src/components/chat/artifacts/ArtifactCreativePost.tsx:226,232` chama `.map()`/`.join()` em `effectiveBullets` e `hashtags` sem guarda contra `null`.
   - `src/routes/workspace.pedidos.gestor.tsx` já foi isolada localmente (`GestorRoutePage` wrapper), eliminando o `Invariant failed` ativo em produção após redeploy.
