# Waesy — Registro de bloqueios do release e merge

**Data:** 2026-10-12  
**PR:** [#29](https://github.com/EduardoChapeco/waesy/pull/29)  
**Branch:** `chore/production-remediation-5d8fdbe`  
**Estado:** `BLOCKED`

## Evidência atual

| Check | Estado | Evidência |
|---|---|---|
| CI Unificado — 5 Quality Gates | `SUCCESS` | [run 38280092955](https://github.com/EduardoChapeco/waesy/actions/runs/38280092955/job/114915019723) |
| Cloudflare Pages | `FAILURE` | [deployment Pages](https://dash.cloudflare.com/?to=/696c624373c7b4b57bb681bd299f4aa8/pages/view/usewaesy/a967fc1a-a209-43f3-b404-6e1c030bae3f) |
| Proteção de `main` | merge bloqueado | PR obrigatório + checks obrigatórios |

O estado `MERGEABLE` do GitHub indica que não há conflito textual; não significa que o candidato foi aprovado para merge. O status geral permanece `BLOCKED` porque o Pages é um check obrigatório e falhou.

## Fases adicionais para desbloqueio

### R1 — Diagnóstico do Pages

- Abrir o log do deployment exatamente vinculado ao SHA do PR.
- Classificar a falha: instalação, lockfile, versão Node, build, variável ausente, binding duplicado, comando de output, limite de recurso ou erro de runtime.
- Não alterar código funcional antes de capturar a mensagem original e o timestamp.

**Aceite:** causa raiz registrada com trecho do log, owner e ação corretiva mínima.

### R2 — Reprodução determinística

- Executar localmente no mesmo Node/pnpm e com `npm ci`/comando oficial do Pages.
- Confirmar `package-lock`/`pnpm-lock`, diretório de saída e bindings sem duplicidade.
- Garantir que segredos sejam somente variáveis configuradas, nunca adicionados ao repositório.

**Aceite:** build local reproduz a falha ou demonstra divergência explícita entre ambiente local e Pages.

### R3 — Correção isolada e nova evidência

- Fazer apenas a correção mínima necessária em commit próprio.
- Executar novamente Quality Gates e Pages no mesmo SHA.
- Registrar deployment ID, SHA, duração, output e smoke de preview.

**Aceite:** Quality Gates e Pages `SUCCESS` no mesmo commit, sem warnings críticos não avaliados.

### R4 — Merge protegido

- Conferir que os dois checks são os do head SHA atual.
- Confirmar branch limpa e PR sem mudanças não revisadas.
- Efetuar merge somente após a proteção liberar.

**Aceite:** PR `MERGED`, SHA de merge registrado e branch base atualizada.

### R5 — Pós-merge sem promoção automática

- Criar candidato de release a partir do merge.
- Reexecutar checks no SHA de merge, não no SHA da branch anterior.
- Só depois avaliar staging, migrations remotas e produção conforme o backlog P0–P21.

**Aceite:** release record contendo SHA, CI, Pages, staging, smoke, aprovação e rollback.

## Possibilidades que devem permanecer no backlog

- Falha causada por `SUPABASE_URL`/binding duplicado ou variável ausente.
- Divergência entre `npm`, `pnpm`, lockfile e versão do Node no Pages.
- Build passando localmente, mas falhando por limite de memória/tempo no Pages.
- Output directory incorreto ou função Worker não gerada.
- Import bare/runtime tratado de forma diferente no bundler remoto.
- Secrets presentes em preview mas ausentes em produção, ou vice-versa.
- Reexecução usando SHA diferente do candidato revisado.
- Migration/deploy iniciado apesar do Pages vermelho.
- Smoke HTTP passando enquanto SSR, Worker, Storage ou bindings falham.
- Falha pós-merge diferente da falha do PR por mudança de SHA.

## Regra de segurança

Enquanto R1–R4 não estiverem concluídas, não fazer merge forçado, não ignorar o check, não executar deploy de produção e não aplicar migrations remotas. O PR continua sendo um candidato documental e técnico, não uma autorização operacional.
