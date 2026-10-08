# Ledger de Evidências — Preflight de Release Waesy

**Data/hora:** 2026-10-08 09:51 BRT  
**Repositório:** `EduardoChapeco/waesy`  
**Microfase:** Release preflight — Supabase, Edge Functions, Cloudflare Pages e CI  
**Objetivo:** determinar se o candidato atual pode ser promovido com evidência real, sem confundir build local com deploy ou persistência remota.

## Snapshot e escopo

| Item | Evidência |
|---|---|
| Branch/HEAD | `execute/spec-master-travel-20261008` / `171fd94e` antes desta documentação |
| Base remota | `origin/execute/spec-master-travel-20261008` alinhada ao HEAD anterior |
| PR | #21 aberta; `Cloudflare Pages` verde; `5 Quality Gates` ainda `IN_PROGRESS` no momento do preflight |
| Worktree | limpa antes da documentação; nenhum diff preexistente descartado |
| Ambiente | Sandbox Ubuntu 24.04; Node 22; npm; Wrangler 4.136.3 via `npx` |
| Supabase CLI | ausente: `supabase: command not found` |
| Supabase auth | não verificada porque a CLI não está instalada; nenhum token foi lido ou criado |
| Wrangler auth | bloqueada: `You are not authenticated. Please run wrangler login.` |
| Edge Functions locais | `supabase/functions` não existe neste checkout |
| Wrangler config | `wrangler.toml` sem `[vars]`; projeto declarado como `usewaesy`, output `dist` |
| Variáveis | nenhum nome `SUPABASE_*`, `VITE_SUPABASE_*`, `CLOUDFLARE_*` ou `CF_*` disponível no ambiente do Sandbox |
| Design lint | `node scripts/design-lint.mjs --changed`: 0 arquivos sob inspeção, 0 P0/P1/P2/P3 |

## Escopo desta microfase

Incluído: baseline Git/PR, configuração declarada de Cloudflare, presença de migrations e Edge Functions, disponibilidade de autenticação local, gates de design e classificação de evidências anteriores.  
Excluído: aplicação de migrations, publicação de Edge Functions, deploy Pages, alteração de secrets, merge em `main` e testes autenticados em Supabase/Cloudflare.

## Findings

| ID | Severidade | Estado | Evidência | Causa/impacto | Próxima ação |
|---|---|---|---|---|---|
| REL-001 | P0 operacional | bloqueado | `supabase` ausente; `supabase/functions` inexistente | Não é possível aplicar migrations nem publicar Edge Functions com prova remota a partir deste checkout | Instalar/usar CLI oficial e obter autenticação do projeto; confirmar se as Functions existem em outro repositório ou se devem ser criadas sob spec própria |
| REL-002 | P0 operacional | bloqueado | `wrangler whoami`: não autenticado | Não é possível publicar Pages/Worker, alterar bindings ou verificar produção | Login Wrangler pelo fluxo autorizado; depois listar projeto `usewaesy` e ambientes sem revelar valores |
| REL-003 | P0 de governança | bloqueado | PR #21 com `5 Quality Gates` em andamento | Merge/deploy do SHA final não deve ocorrer enquanto o check obrigatório não concluir | Aguardar CI; investigar qualquer falha antes de merge |
| REL-004 | alto | não verificado | Documento Cloudflare lista bindings obrigatórios, mas provider não pôde ser consultado | Não há prova atual de que Production possui todos os bindings e secrets | Após autenticação, listar somente nomes e estado/configuração, nunca valores |
| REL-005 | alto | não verificado | Migrations `20261008090000` e `20261008093000` estão no checkout; schema remoto não foi consultado | Código e migration não provam aplicação no banco | Executar `supabase db push --dry-run`/status e aplicar somente após confirmação final |
| REL-006 | alto | não verificado | Cliente InfoTravel invoca `infotravel-connector`, mas não há Edge Function neste checkout | O fluxo real pode depender de implementação remota ou outro repositório | Identificar a origem remota da Function e auditar contrato antes de qualquer deploy |
| REL-007 | médio | confirmado | `supabase/migrations` contém arquivos com timestamps posteriores à data do ciclo | Há risco de cadeia temporal fora de ordem e migrações ainda não revisadas | Fazer inventário de ordenação/duplicidade e validar em banco efêmero antes de push |

## Não confundindo evidências

- Build local, typecheck e testes unitários **não provam** migration aplicada, RLS real, Edge Function publicada ou smoke test autenticado.
- HTTP 200 de uma página pública **não prova** sessão, persistência, tenant, storage ou integração InfoTravel.
- A existência de `wrangler.toml` **não prova** que o projeto Pages, bindings e secrets remotos estão corretos.
- Uma migration no Git **não prova** que ela está no histórico remoto do Supabase.

## Gates observados

| Comando/ambiente | Resultado | O que prova | O que não prova |
|---|---:|---|---|
| `node scripts/design-lint.mjs --changed` | exit 0 | Nenhuma violação em arquivos alterados no estado observado | Auditoria visual completa do produto |
| `npx wrangler whoami` | bloqueado | Wrangler instalado | Autorização Cloudflare |
| `supabase projects list` | bloqueado | CLI ausente | Estado Supabase |
| PR #21 / Cloudflare Pages | verde no check observado | Um deployment do provider concluiu para aquele SHA/check | Migrations, secrets, E2E ou produção completa |
| PR #21 / 5 Quality Gates | pendente no snapshot | CI ainda não finalizado | Qualidade final do SHA |

## Decisões necessárias antes da próxima microfase

1. Confirmar a origem canônica de `infotravel-connector`, pois não há `supabase/functions` no repositório.
2. Autorizar login/uso das credenciais já configuradas para Supabase e Cloudflare, sem enviar secrets na conversa.
3. Após autenticação, confirmar o payload de produção: projeto Supabase `jfuebqmltksyznovhlwa`, Pages `usewaesy`, branch/commit e lista de migrations/Functions a publicar.
4. Não fazer merge em `main` nem aplicar mudanças irreversíveis até que CI esteja verde e o payload seja confirmado.

## Status final da microfase

**MICROFASE BLOQUEADA.** O código local não foi alterado nesta microfase; somente este ledger foi criado para impedir falso positivo de release. Nenhum deploy, migration remota, alteração de secret ou merge foi executado.
