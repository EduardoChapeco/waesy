# SPEC-20261106 — Estabilização End-to-End de Sessão, Autenticação SSR/Client e Blindagem Contra Quedas

## 1. Contexto e Diagnóstico Forense
Usuários enfrentam desconexões espontâneas, quedas imediatas após o login ("eu logo ele cai novamente") e loops de redirecionamento entre `/entrar`, `/workspace`, `/admin-master` e a vitrine (`/`).
A auditoria forense ponta a ponta no código e nos logs de produção do Supabase (`system_audit_logs`, `system_error_logs`, `session_audit_logs`, `auth.users`) isolou cinco causas raízes determinísticas:
1. **Colisão de Escopo de Domínio de Cookie (`Host-Only` vs `.waesy.com.br`) e Corrupção de Chunks (`src/lib/supabase-ssr.server.ts`, `src/lib/supabase.ts`):** Cookies antigos sem `Domain` coexistem no navegador com cookies novos com `Domain=.waesy.com.br`. Além disso, sessões `< 3180 bytes` (como a conta Master `meuwider@gmail.com`, com `3060 bytes`) geram cookie unchunked `waesy-auth-token`, que era descartado pela condição `if (hasChunks && c.name === "waesy-auth-token") continue;` quando existia um `.0` legado no navegador, ou tinha seus chunks `.0` e `.1` misturados por comparação de tamanho de string (`c.value.length > existing.length`).
2. **Leitura de Cookie Expirado pelo `createBrowserClient` (`src/lib/supabase.ts`):** O parser padrão do `@supabase/ssr` no navegador lia a primeira ocorrência em `document.cookie` (o cookie host-only expirado), falhava ao renovar o refresh token e disparava `SIGNED_OUT`, apagando o cookie válido recém-criado.
3. **Queda de Contexto Assíncrono `unctx` e Tempestade de Refresh Concorrente (`src/lib/identity.server.ts`, `src/routes/api.auth.callback.ts`, `src/routes/api.auth.confirm.ts`):** Leitura de `getRequestHeader("cookie")` após múltiplos `await`s e ausência de deduplicação de Promises em voo (`inflight`) para chamadas simultâneas a `getServerIdentity()`.
4. **Prerender Irrestrito (`Speculation Rules`) + Purga Colateral de Tenant (`src/routes/__root.tsx`, `src/routes/_store.tsx`, `src/routes/_store.entrar.tsx`):** O bloco `<script type="speculationrules">` (`prerender: /*`) em `__root.tsx` pré-renderizava rotas públicas em background, acionando o `useEffect` de `_store.tsx` que apagava `waesy_active_tenant` enquanto o lojista usava o `/workspace`.
5. **Crash P0 em `/workspace/atendimento` (`src/routes/workspace.atendimento.index.tsx`):** Registrado 20 vezes em `system_audit_logs` (`Cannot read properties of undefined (reading 'id')`) ao avaliar `activeThread.id` dentro do `<Sheet>` sem guarda condicional.

## 2. Requisitos em Sintaxe EARS

- **REQ-01 (Ubiquitous):** The authentication cookie layer (`src/lib/auth-cookie-sanitizer.ts`, `src/lib/supabase-ssr.server.ts`, `src/lib/supabase.ts`) SHALL decode and validate all candidate session cookies (unchunked and chunked) and select the intact session with the highest JWT expiration timestamp (`exp`), never mixing chunks from distinct cookies or discarding a newer unchunked session in favor of an older chunk.
- **REQ-02 (Event-Driven):** WHEN the browser or server writes or deletes authentication cookies, the system SHALL operate with canonical host-only cookies (`path=/; SameSite=Lax`) AND proactively expire any legacy domain-scoped duplicates (`.waesy.com.br`, `waesy.com.br`, `.usewaesy.com`, `usewaesy.com`, `sb-*-auth-token*`) and unused chunk indices (`.0`..`.4`).
- **REQ-03 (Event-Driven):** WHEN `getServerIdentity()` is invoked concurrently by multiple Server Functions or loaders, the system SHALL capture HTTP request headers synchronously before the first `await` and deduplicate in-flight identity resolution Promises per request key.
- **REQ-04 (State-Driven):** WHILE the user navigates or preloads public storefront routes (`/_store`), the system SHALL NOT purge `waesy_active_tenant` or `waesy_store_id` from `document.cookie`, and `__root.tsx` SHALL NOT inject unrestricted `prerender: /*` Speculation Rules.
- **REQ-05 (Event-Driven):** WHEN an already authenticated user visits `/entrar`, the loader SHALL redirect to `returnUrl` (if valid), `/workspace` (if user has store membership), `/admin-master` (if platform admin), or `/` (if civil user without store), preventing redirect bounce loops.
- **REQ-06 (State-Driven):** WHILE `/workspace/atendimento` renders with no active thread selected (`activeThread === undefined`), the Customer 360 `<Sheet>` SHALL guard all references to `activeThread` to prevent `TypeError: Cannot read properties of undefined (reading 'id')`.

## 3. Escopo Atômico Autorizado
- `src/lib/auth-cookie-sanitizer.ts` (Novo)
- `src/lib/__tests__/auth-cookie-sanitizer.test.ts` (Novo)
- `src/lib/supabase-ssr.server.ts`
- `src/lib/supabase.ts`
- `src/lib/identity.server.ts`
- `src/lib/tenant.server.ts`
- `src/lib/session-audit.server.ts`
- `src/services/auth.functions.ts`
- `src/routes/__root.tsx`
- `src/routes/_store.tsx`
- `src/routes/_store.entrar.tsx`
- `src/routes/painel.tsx`
- `src/routes/workspace.tsx`
- `src/routes/admin-master.tsx`
- `src/routes/api.auth.callback.ts`
- `src/routes/api.auth.confirm.ts`
- `src/routes/workspace.atendimento.index.tsx`
- `docs/design/DECISIONS.md`
