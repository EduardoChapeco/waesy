# Waesy — Ledger de execução holística W0–W17

## Snapshot e escopo

- Data/hora: 2026-10-07T03:16:00Z
- Repositório: `EduardoChapeco/waesy`
- Branch de execução: `execute/waesy-holistic-waves`
- HEAD inicial da execução: `96dfd321` (merge do pacote metodológico do PR #7 sobre `90e40782`)
- Base remota comparada: `origin/main` em `90e40782187ae77030d11b05f46856bb8ddf9b1c`
- PRs observados: #1–#4 merged; #5, #6 e #7 abertos no início; #8 merged.
- Estado do worktree: limpo antes da branch de execução; worktrees `/home/ubuntu/waesy-pr5`, `/home/ubuntu/waesy-pr6` e `/home/ubuntu/waesy-pr7` preservados para comparação.
- Ambiente: Node 22.13.0, npm 10.x, Ubuntu 24.04, Vitest 4.1.10.
- Escopo: execução integral do masterplan `docs/audits/WAESY_HOLISTIC_REMEDIATION_MASTERPLAN_2026-10-06.md`, W0–W17, com microfases e prova por níveis.
- Regra: documentação, código, teste, CI, deployment e runtime são evidências independentes.

## Preflight por onda

| Onda.microfase | Leituras obrigatórias | Estado inicial | Ação | Resultado |
|---|---|---|---|---|
| W0.1–W0.3 | `AGENTS.md`, skill de integridade, masterplan, template de ledger, package.json, CI | `90e40782`, worktree main limpo, PR7 não mesclado | Criar branch de execução, preservar worktrees e registrar baseline | Em execução |
| W1.1–W1.4 | masterplan W1, `.github/workflows/ci.yml`, API GitHub, checks PR | `main` sem proteção; rulesets vazio; checks históricos contraditórios | Aplicar proteção e exigir gates no mesmo SHA | Bloqueado até confirmação da API |

## Gates e resultados da baseline

| Comando/ambiente | SHA | Resultado | Evidência | Não prova |
|---|---|---:|---|---|
| `npm ci --no-audit --no-fund` | `90e40782` | PASS / 0 | `/tmp/waesy-w0-install.log` | não prova runtime |
| `npm run typecheck` | `90e40782` | PASS / 0 | `/tmp/waesy-w0-typecheck.log` | não prova persistência |
| `npm test -- --reporter=dot` | `90e40782` | PASS / 0 | `/tmp/waesy-w0-test-correct.log` | não prova provider/RLS/browser |
| `npm run build` | `90e40782` | PASS / 0 | `/tmp/waesy-w0-build.log`; client-leak OK | não prova navegação/produção |
| `npm test -- --runInBand` | `90e40782` | FAIL / opção inválida | Vitest rejeitou `--runInBand` | não é falha de aplicação; comando incorreto |
| GitHub protection | `90e40782` | FAIL / não protegido | `GET /branches/main/protection` = 404; rulesets = [] | não prova permissões de runtime |
| Cloudflare Pages | `90e40782` | deployment em execução/validar | projeto correto `usewaesy`; build `npm run build`, output `dist` | não prova todos os fluxos |

## Bloqueios e decisões

- W1 bloqueador confirmado: `main` não estava protegido e não havia ruleset.
- A configuração Cloudflare incorreta em `wider` foi desligada; `usewaesy` aponta para `EduardoChapeco/waesy`, preservando `waesy.com.br`.
- Não aplicar migrations em produção por inferência; W3/W12 exigem banco de teste/efémero e evidência de schema/RLS.
- Não tratar PR5/PR6 como concluídos enquanto não houver merge e gates no SHA final.
- Testes Vitest com `--runInBand` não devem ser usados; o comando canônico é `npm test`.

## Fechamento provisório

- Findings fechados com prova completa: nenhum ainda; W0 baseline local fechado parcialmente.
- Findings abertos/bloqueados: W1 governança; todas as ondas W2–W17 aguardam execução ordenada.
- Paths alterados nesta fase: documentação de auditoria e pacote metodológico; nenhum runtime alterado.
- Revisão adversarial: pendente após cada microfase; não declarar produção antes de CI, provider e smoke público.


## W2 — Segurança e advisories (execução delta)

- Preflight: branch `execute/w2-security-advisories`, base `origin/main` em `75b7177f`; worktree limpa; scope: `docs/specs/SPEC-W2-SECURITY-ADVISORIES.md`, migration `20270113000000_security_advisory_remediation.sql` e este ledger.
- Baseline runtime: 24 tabelas com RLS sem policy; `unified_listings_view` security definer; `dispatch_mining_cron` e `touch_document_artifact` com search_path mutável; 53 RPCs security-definer executáveis por anon; 509 FKs sem índices.
- Decisão: fechar primeiro os findings determinísticos de segurança P0/P1 com deny-by-default e sem tocar no contrato público de checkout/telemetry; a indexação de FKs fica para W3/PERF após plano gerado a partir do catálogo real.
- Migration: criada localmente; não aplicada diretamente em produção nesta sessão, conforme o protocolo de integridade. Nenhum finding é declarado fechado antes da evidência pós-migration.


## W3.3 — Tipos reais derivados do Supabase

- Preflight: branch `execute/w2-security-advisories`, SHA `cd5c3298`; scope ampliado explicitamente para `src/integrations/supabase/types.ts`, `docs/specs/SPEC-W3-SUPABASE-TYPES.md` e este ledger.
- Finding confirmado: `src/integrations/supabase/types.ts:9` continha `export type Database = any`.
- Ação: gerado o contrato pelo projeto Supabase Waesy `jfuebqmltksyznovhlwa` através da ferramenta autorizada `generate_typescript_types`; resultado persistido com 45.635 linhas e 1.426.638 bytes.
- Estado: typecheck de consumidores ainda pendente após a substituição; não declarar W3 fechado até validar typecheck, testes, build e revisão do diff.


## W3.2 — Drift de migrations

- Inventário local: 468 ficheiros de migration; colisões de prefixo em `20270106000000`, `20270107000000` e `20270109000000`.
- Estado: finding aberto; não renomear nem reordenar histórico aplicado sem Postgres efémero e replay completo.
- Evidência: `docs/audits/W3_SCHEMA_DRIFT.md`.


## W2 — Aplicação e validação em produção

- Migration `security_advisory_remediation_w2` aplicada com sucesso no projeto Supabase `jfuebqmltksyznovhlwa`.
- Evidência pós-aplicação: `policyless_rls=0`, `w2_policies=24`, `search_path_mutable=0`, `invoker_view=1`, `public_execute_restricted=0`.
- Advisories remanescentes: extensões `pg_trgm`/`btree_gist` em `public` e 50 funções SECURITY DEFINER ainda executáveis por `anon`; são contratos públicos/legados e ficam para uma matriz dedicada, não foram revogados por inferência.

## W4 — Persistência e idempotência do Copilot

- Finding alvo: retry gerava novo UUID, inseria outra mensagem e podia executar IA/cobrança novamente; o BFF não fazia replay da resposta persistida.
- Ação na branch `execute/w4-persistence-idempotency`: retry reutiliza a chave original; BFF procura `(thread_id, client_message_id, sender_id)` antes do pipeline; resposta persistida inclui a chave e o ID da mensagem de origem; mensagens falhadas podem ser reabertas sem novo registo.
- Estado: implementação local passou typecheck, testes e build; aguarda revisão de diff e gates remotos. Nenhum finding W4 é declarado fechado antes do CI/Cloudflare.
