# Waesy — Fecho do gate Cloudflare Pages

**Data:** 2026-10-07 01:02 UTC  
**Projeto:** `usewaesy`  
**Escopo:** correção do bloqueio de publicação da Function e preparação do candidato de release.

## Causa raiz confirmada

O deployment Cloudflare `235e8721-b9d8-4260-b72c-d5ad9d40bf03`, associado ao SHA `2ebb04f8188b43255e51b1c5377962aaaec1ab87`, falhou com:

```text
Error: Failed to publish your Function. Got error: Binding name 'SUPABASE_URL' already in use.
```

O projeto Pages já possuía `SUPABASE_URL` no ambiente de produção e o repositório também declarava o mesmo binding em `[vars]` de `wrangler.toml`. O mesmo risco existia para `VITE_SUPABASE_URL` e `VITE_SITE_URL`.

## Correção aplicada

- Removida a secção `[vars]` de `wrangler.toml`.
- Mantidos `pages_build_output_dir`, `compatibility_date` e `nodejs_compat`.
- Variáveis de runtime passam a ter uma única fonte de verdade: o ambiente do projeto Cloudflare Pages.
- O wrapper do worker continua a suportar variáveis fornecidas pelo ambiente de build/runtime e mantém apenas fallback local não secreto para desenvolvimento.

## Variáveis obrigatórias do ambiente Cloudflare Pages

Configurar/validar no ambiente **Production** do projeto `usewaesy`, sem valores no repositório:

- `VITE_SITE_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`

Os valores devem ser definidos pelo proprietário do ambiente no Cloudflare. Este documento não contém segredos.

## Validação exigida

1. `npm ci`
2. `npm run typecheck`
3. `npm test`
4. `npm run build`
5. Deployment Pages do SHA candidato.
6. Logs do deployment sem erro de binding duplicado.
7. Smoke test de `https://usewaesy.pages.dev` e `https://waesy.com.br`.

A correção do binding não prova, por si só, que os secrets estejam preenchidos nem que o deployment esteja ativo. Esses estados devem ser observados no provider após o novo deployment.
