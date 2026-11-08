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
