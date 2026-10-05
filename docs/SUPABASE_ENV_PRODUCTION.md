# Configuração segura de produção — Waesy e Supabase

Este documento descreve **nomes, escopos e fontes** de variáveis. Valores reais não podem ser versionados. As credenciais anteriormente presentes neste arquivo devem ser consideradas comprometidas e precisam ser revogadas/rotacionadas no Supabase, Cloudflare, gateways e demais provedores.

## Variáveis públicas

```bash
VITE_SITE_URL=https://seu-dominio
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<Supabase anon key pública>
VITE_SUPABASE_PUBLISHABLE_KEY=<Supabase publishable key pública, se aplicável>
```

A chave anon/publishable pode ser enviada ao cliente, mas as policies RLS devem ser a autoridade de autorização. Nunca coloque service role, senha de banco ou token de gerenciamento em variáveis `VITE_*`.

## Variáveis exclusivamente server-side

Configure-as no secret manager do ambiente de deploy, nunca em Git, documentação compartilhada, `wrangler.toml` ou bundles:

```bash
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<secret manager>
SUPABASE_DB_PASSWORD=<secret manager, somente migrações administrativas>
SUPABASE_ACCESS_TOKEN=<secret manager, somente CLI administrativa>
DATABASE_URL=<secret manager, somente migrações administrativas>
MINING_WORKER_SECRET=<secret manager>
CRON_SECRET=<secret manager>
WAESY_CRON_TOKEN=<secret manager>
PIX_WEBHOOK_SECRET=<secret manager>
SHIPMENT_WEBHOOK_SECRET=<secret manager>
MARKETPLACE_WEBHOOK_SECRET=<secret manager>
```

## Cloudflare Pages

O `wrangler.toml` deve conter somente configuração não sensível. Use `wrangler secret put NOME_DA_VARIAVEL` ou o secret manager equivalente para os valores privados. Revise o painel de variáveis e remova qualquer valor que tenha sido publicado anteriormente.

## Procedimento de contenção

1. Revogue e gere novamente service role, senha do banco, access token, tokens de cron e segredos dos webhooks.
2. Remova os valores antigos do painel de deploy e dos ambientes locais compartilhados.
3. Verifique histórico Git, forks, caches de CI e logs; repositório Git não é um cofre mesmo após um novo commit.
4. Execute o scanner de segredos no CI e bloqueie novos padrões de JWT, `sbp_`, URLs PostgreSQL com senha e tokens de webhook.
5. Rode migrations apenas por pipeline autenticado e revisável; não use script manual que engole erros.

## Setup local

Crie `.env.local` a partir de um cofre local ou do secret manager autorizado. Não copie valores para issues, PRs, chats ou arquivos versionados. Valide com:

```bash
npm ci
npm run typecheck
npm test
npm run build
```
