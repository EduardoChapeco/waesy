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
