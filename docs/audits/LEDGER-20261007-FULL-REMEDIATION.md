

## Fechamento W1-D — Cloudflare Pages — 2026-10-07

A causa da falha foi confirmada diretamente nos logs Cloudflare: `Failed to publish your Function` por binding duplicado `SUPABASE_URL`; deployments anteriores também falharam por `SUPABASE_ANON_KEY`. O Pages já tinha variáveis no ambiente e o commit publicado redeclarava esses nomes em `[vars]` do `wrangler.toml`. O `wrangler.toml` atual da branch não tem `[vars]`, e o último deployment de produção consultado, `a2482b5a` no SHA `919c8688`, passou em todas as etapas. O SHA candidato atual ainda não foi publicado. Nenhuma configuração externa foi alterada.

## W2.1/W2.5 — extrator de mídia — 2026-10-07

O endpoint `parseTravelMediaAI` foi endurecido com `requireStaff()` e rate limit por `store_id:user_id` antes de `getServerClient()` e antes de qualquer chamada ao provider. A fronteira Zod agora limita base64, texto, nome, MIME e rejeita requisição sem mídia/texto. Regressão focada: 3 arquivos / 13 testes verdes; typecheck verde; diff check verde. Isso fecha somente esta microfase de código. RLS, JWT real, quota persistente, custo real, provider real e banco continuam não verificados.
