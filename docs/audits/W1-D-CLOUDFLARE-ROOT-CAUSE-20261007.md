# W1-D — Causa raiz Cloudflare Pages

**Data:** 2026-10-07  
**Projeto:** `usewaesy`  
**Conta:** `starble`  
**Branch de trabalho:** `audit/full-remediation-20261007`  
**Tipo de ação:** somente leitura no Cloudflare; nenhuma configuração externa foi alterada.

## Causa confirmada

Os logs de deployment do Cloudflare Pages retornaram:

```text
Error: Failed to publish your Function. Got error: Binding name 'SUPABASE_URL' already in use. Please use a different name and try again.
```

Isso ocorreu nos deployments `235e8721` (2026-10-06), `ce03dba9` (2026-10-06) e, para a variante pública, `f77ae8ce`, que reportou o mesmo conflito para `SUPABASE_ANON_KEY`. O conflito ocorre na publicação da Function, antes de build/deploy funcional, porque variáveis já configuradas no Pages eram redeclaradas como bindings `[vars]` no `wrangler.toml`.

## Estado atual

O `wrangler.toml` presente nesta branch não possui seção `[vars]`; ele mantém somente `name`, `pages_build_output_dir`, `compatibility_date` e `nodejs_compat`. O projeto Pages `usewaesy` está conectado ao repositório GitHub `EduardoChapeco/waesy`, branch de produção `main`, comando `npm run build` e destino `dist`. O deployment de produção mais recente consultado (`a2482b5a`, SHA `919c8688`) terminou com `queued`, `initialize`, `clone_repo`, `build` e `deploy` em `success`.

Portanto, **a causa histórica está provada e a correção de configuração está presente no código**. O HEAD desta branch (`54d2dbe5`) ainda não tem deployment Cloudflare próprio; não é correto afirmar que este SHA foi publicado.

## Pendências W1-D/W1-E

- executar/observar um novo deployment do SHA candidato por fluxo autorizado;
- confirmar que não há duplicidade entre variáveis Pages e qualquer configuração de build;
- obter URL/HTTP smoke do deployment do SHA candidato;
- não alterar variáveis, secrets ou projeto Pages automaticamente.
