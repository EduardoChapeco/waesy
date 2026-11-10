# SPEC-20261108 — Remediação Definitiva de Persistência de Sessão, Escrita Diferencial de Chunks SSR e Ciclo de Vida Auth

## 1. Diagnóstico Forense e Causas Raízes Isoladas

A auditoria ponta a ponta do subsistema de autenticação (`@supabase/ssr` v0.12.1, `@supabase/auth-js`, `h3-v2`, TanStack Start Server Functions e hidratação de cliente) isolou seis falhas determinísticas que impediam a persistência do login:

1. **Destruição Imediata do Chunk `waesy-auth-token.0` por Escrita Diferencial do `@supabase/ssr` (`src/lib/supabase-ssr.server.ts`, `src/lib/supabase.ts`):**
   - No `@supabase/ssr` v0.12.1 (`applyServerStorage` em `cookies.js:454`), o servidor filtra os chunks a gravar comparando com os cookies atuais da requisição: `setCookiesToWrite = setCookies.filter(({ name, value }) => currentByName.get(name) !== value)`.
   - Quando o usuário realiza login (`signInWithPassword`) e o navegador chama `getBrowserClient().auth.setSession(...)`, o evento `SIGNED_IN` dispara `syncSessionToCookies` (`ssrClient.auth.setSession`). Como o campo `expires_in` fica no final do JSON codificado em base64url (dentro de `waesy-auth-token.1`), os primeiros 3180 bytes (`waesy-auth-token.0`, contendo `access_token`, `refresh_token` e `user`) permanecem idênticos ao cookie já presente na requisição.
   - Assim, `applyServerStorage` envia para `setAll(cookiesToSet)` apenas `[{ name: "waesy-auth-token.1", value: "..." }]`.
   - O loop de limpeza em `supabase-ssr.server.ts` (linhas 173-187) e `supabase.ts` (linhas 259-279) verificava `if (!namesBeingSetWithValue.has(candidateName))` e emitia `Set-Cookie: waesy-auth-token.0=; Max-Age=0; Path=/`, deletando o chunk `.0` do navegador ~100ms após o login e corrompendo a sessão na primeira navegação ou reload.
   - O mesmo loop apagava todos os cookies `waesy-auth-token*` quando `signInWithOAuth` gravava `waesy-auth-token-code-verifier`.

2. **Sobrescrita de `Set-Cookie` no `signOut` (`src/services/auth.functions.ts`):**
   - Em `signOut` (linha 632), a chamada `setResponseHeader("Set-Cookie", guestClearCookie)` invocava `event.res.headers.set("Set-Cookie", ...)`, sobrescrevendo e descartando todos os cabeçalhos `Set-Cookie` de expiração recém-emitidos por `supabase.auth.signOut()`.

3. **Perda de Contexto Assíncrono e Ausência de Sessão no Retorno de `signUpWithPassword` (`src/services/auth.functions.ts`, `src/routes/_store.entrar.tsx`, `src/routes/_store.cadastro.tsx`, `src/routes/painel.tsx`):**
   - `signUpWithPassword` não capturava `resHeaders` antes dos múltiplos `await`s administrativos, não inicializava os cookies de contexto Zero-Trust Civil (`waesy_active_context=civil`), não invalidava `clearIdentityCache()` e não retornava `session` (`access_token`, `refresh_token`, `expires_at`) para sincronização imediata do `getBrowserClient()`.

4. **Tempestade de `syncSessionToCookies` em Todo Carregamento de Página (`src/routes/__root.tsx`, `src/services/auth.functions.ts`):**
   - O `@supabase/auth-js` emite `SIGNED_IN` em todo carregamento de página durante `_recoverAndRefresh()`. O listener em `__root.tsx` disparava `syncSessionToCookies` mesmo quando o `access_token` já estava persistido de forma idêntica em `document.cookie`, gerando corrida concorrente de escrita de cookies durante a execução dos loaders de rota.

5. **Falha de Renovação (`refreshSession`) em `getServerIdentity` Após `_removeSession` (`src/lib/identity.server.ts`):**
   - Quando `ssrClient.auth.getUser()` falha com `AuthSessionMissingError`, o `GoTrueClient` executa `this._removeSession()`, marcando `removedItems["waesy-auth-token"] = true` na memória do `ssrClient`. Em seguida, `ssrClient.auth.refreshSession()` chamado sem argumentos lia `storage.getItem("waesy-auth-token")` (que retornava `null`) e falhava sistematicamente mesmo com um `refresh_token` válido presente no cookie da requisição.

6. **Captura Tardia de `getResponseHeaders()` em Rotas de Callback OAuth e Confirmação (`src/routes/api.auth.callback.ts`, `src/routes/api.auth.confirm.ts`):**
   - Os handlers de rota capturavam `getResponseHeaders()` apenas após múltiplos `await`s de rede (`exchangeCodeForSession`, `verifyOtp`, `mergeGuestCartLogic`), arriscando perda do contexto H3 e não acionando `clearIdentityCache()`.

## 2. Requisitos em Sintaxe EARS

- **REQ-01 (Ubiquitous):** The cookie sanitizer (`src/lib/auth-cookie-sanitizer.ts`) SHALL provide a deterministic function `resolveOrphanAuthCookiesToExpire(rawCookies, cookiesToSet)` that preserves all chunks belonging to the active canonical session when `@supabase/ssr` performs partial/differential chunk writes (`setAll` receiving only modified chunks) or writes PKCE code-verifier cookies, expiring only proven orphan cookies rejected by `resolveCanonicalAuthCookies` or explicitly removed chunks.
- **REQ-02 (Event-Driven):** WHEN `setAll(cookiesToSet)` is invoked on the server (`src/lib/supabase-ssr.server.ts`) or browser (`src/lib/supabase.ts`), the system SHALL expire only the orphan cookie names returned by `resolveOrphanAuthCookiesToExpire`, never expiring unchanged chunks of the active session.
- **REQ-03 (Event-Driven):** WHEN `signInWithPassword`, `signUpWithPassword`, `syncSessionToCookies`, or `signOut` is executed in `src/services/auth.functions.ts`, the system SHALL synchronously capture `resHeaders = getResponseHeaders()` and instantiate `getSSRClient(resHeaders)` before any asynchronous `await`, clear the server identity memo cache (`clearIdentityCache()`), and never call `setResponseHeader("Set-Cookie", ...)` which overwrites existing `Set-Cookie` headers.
- **REQ-04 (Event-Driven):** WHEN `signUpWithPassword` completes in `src/services/auth.functions.ts`, the system SHALL initialize Zero-Trust Civil context cookies and return the `session` (`access_token`, `refresh_token`, `expires_at`) and `user` objects so that client registration flows (`_store.entrar.tsx`, `_store.cadastro.tsx`, `painel.tsx`) immediately synchronize `getBrowserClient().auth.setSession(...)`.
- **REQ-05 (Event-Driven):** WHEN `onAuthStateChange` fires in `src/routes/__root.tsx`, the system SHALL invoke `syncSessionToCookies` only when `event === "TOKEN_REFRESHED"` or when the active `session.access_token` differs from the canonical access token already stored in `document.cookie`, preventing redundant post-load write races.
- **REQ-06 (Event-Driven):** WHEN `ssrClient.auth.getUser()` returns no user in `src/lib/identity.server.ts` and the incoming request cookie contains a valid canonical `refreshToken`, the system SHALL pass `{ refresh_token: cookieSessionMeta.refreshToken }` to `ssrClient.auth.refreshSession(...)` using a pre-captured `resHeaders` reference, bypassing guest refresh calls when no auth cookie is present.
- **REQ-07 (Event-Driven):** WHEN navigating within storefront and account routes (`src/routes/_store.tsx`, `src/routes/_store.conta.tsx`, `src/routes/_store.conta.index.tsx`, `src/routes/_store.criar-negocio.tsx`) or mutating tenant contexts / logging out (`src/services/identity.functions.ts`, `src/components/shell/AccountSwitcherDrawer.tsx`, `src/components/shell/global-menu-hub.tsx`, `src/components/workspace/workspace-shell.tsx`, `src/components/admin/admin-shell.tsx`), the system SHALL hydrate and synchronize client/server sessions reactively, pre-capture `resHeaders` before async database calls, and clear both browser and server auth states on logout.

## 3. Escopo Atômico Autorizado
- `docs/specs/SPEC-20261108-AUTH-PERSISTENCE-CONSOLIDATION.md`
- `src/lib/auth-cookie-sanitizer.ts`
- `src/lib/__tests__/auth-cookie-sanitizer.test.ts`
- `src/lib/supabase-ssr.server.ts`
- `src/lib/supabase.ts`
- `src/lib/identity.server.ts`
- `src/services/auth.functions.ts`
- `src/services/identity.functions.ts`
- `src/routes/__root.tsx`
- `src/routes/_store.tsx`
- `src/routes/_store.conta.tsx`
- `src/routes/_store.conta.index.tsx`
- `src/routes/_store.criar-negocio.tsx`
- `src/routes/_store.entrar.tsx`
- `src/routes/_store.cadastro.tsx`
- `src/routes/painel.tsx`
- `src/routes/api.auth.callback.ts`
- `src/routes/api.auth.confirm.ts`
- `src/components/shell/AccountSwitcherDrawer.tsx`
- `src/components/shell/global-menu-hub.tsx`
- `src/components/workspace/workspace-shell.tsx`
- `src/components/admin/admin-shell.tsx`
- `docs/design/DECISIONS.md`
