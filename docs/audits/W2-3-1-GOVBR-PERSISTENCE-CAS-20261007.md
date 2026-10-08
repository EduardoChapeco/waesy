# Ledger W2.3.1 — Persistência/CAS da assinatura Gov.br

**Data/hora:** 2026-10-07 19:38 UTC−03:00  
**Repositório:** `EduardoChapeco/waesy`  
**Branch/HEAD:** `audit/full-remediation-continuation-20261007` / `919c86881db1ce83de3feae7fcf7df5aadb58b7d`  
**Base:** `origin/main` no mesmo SHA observado.  
**PRs:** PRs abertos #19, #18, #7, #6 e #5 em outras branches; nenhum para esta branch.  
**Worktree:** já sujo por relatórios/specs e código da continuidade W2 anterior; alterações listadas no relatório de continuidade, preservadas sem reset/stage.

## Preflight por microfase

| Microfase | Leituras obrigatórias | Implementação real lida | Baseline | Ação autorizada | Antes de editar |
|---|---|---|---|---|---|
| W2.3.1 (follow-up da sequência Gov.br recuperada; não é W2.3 RLS oficial) | `AGENTS.md`, skill/template de integridade, masterplan, spec W2.3.1, `DESIGN.md`, `DESIGN-LINT.md`, relatório W2.3 recuperado | `signContractWithGovBr`, callback `/api/auth/govbr/callback`, teste Gov.br, migration `20260813211000_contracts_engine_schema.sql` | `919c86881db1ce83de3feae7fcf7df5aadb58b7d`; branch e dirty status registados no preflight | Corrigir falsos sucessos de insert/update, exigir estado/expiração e CAS; sem alteração de schema ou integração externa | Sim |

## Finding

| ID | Severidade | Estado inicial | Evidência | Reprodução inicial | Causa-raiz | Correção prevista |
|---|---|---|---|---|---|---|
| GOVBR-PERSIST-01 | Alta | Confirmado no snapshot recuperado; não provado em DB real | Handler `signContractWithGovBr` e schema `signature_envelopes.status/expires_at`; callback em `src/routes/api.auth.govbr.callback.ts:171-180` | Nova regressão executada antes da correção: 2 falhas (estado/expiração ausentes; writes/CAS sem confirmação), 2 testes existentes aprovados | `.insert` e `.update` ignoravam `error/data`; update não filtrava estado; sem guarda de expiração; handler sempre devolvia sucesso | Validar envelope pending/não expirado; verificar ID de evidência; CAS com expiração e uma linha; em falha reler estado, limpar quando seguro e lançar erro |
| GOVBR-PERSIST-02 | Alta | Finding adversarial confirmado no código anterior; correção local aplicada | Antes, insert/update retornavam apenas `id`; re-leitura não consultava evidência por ID+digest | Regressão fortalecida falhou antes da implementação por ausência de `signature_digest` verificado | Resposta de sucesso não comparava o retorno com o estado esperado, e ramo incerto não ligava estado à evidência desta tentativa | Insert retorna/verifica digest+campos; CAS retorna/verifica estado/timestamp/Gov.br; erro re-lê estado e evidência por ID/envelope/digest; cleanup exige ID retornado |
| GOVBR-ID-01 | Alta | Finding adversarial confirmado; política de produto pendente | CPF recebido agora exige 11 dígitos e CPF esperado presente precisa ser válido e igual; `signer_cpf` continua nullable | Teste estrutural exige validação dos dois CPFs; não exercita callback/DB | Envelope sem CPF esperado continua aceitando qualquer identidade Gov.br válida que apresente o token | **Em aberto** até decidir se Gov.br deve exigir CPF previamente ligado; não alegar binding de identidade completo |

## Matriz de evidência

| Prova | Estado inicial | Estado depois |
|---|---|---|
| Envelope `pending` e não expirado | Ausente | Guard de estado e `Date.parse(expires_at)`; teste estrutural PASS |
| Erro/ausência de evidência inserida | Ignorado pelo código | Verifica `error` e ID devolvido pelo insert; teste estrutural PASS |
| CAS `pending → signed` e `expires_at > signedAt` | Ausente | Update condicional por estado/expiração e `select().maybeSingle()`; teste estrutural PASS |
| Falha/zero rows, re-leitura e cleanup | Parcial | No-code zero-row tenta cleanup; retorno de delete não era verificado; erro de update não confirmava estado/evidência desta tentativa |
| Retorno positivo de status/timestamp/nível + evidência por digest | Ausente | Comparações locais no retorno; reconciliação por ID/envelope/digest em erro; teste estrutural PASS, sem mock/DB real |
| Formato CPF de Gov.br e CPF esperado malformado | Sem validação de formato | Agora valida 11 dígitos; CPF esperado, quando existe, deve ser válido e igual; teste estrutural PASS |
| Binding CPF quando envelope não tem CPF | Não provado | Política pendente; a coluna nullable ainda permite Gov.br sem identidade esperada associada |
| Provider Gov.br staging / token / `id_token` / nonce/state | Não exercitado | Fora desta microfase |
| Postgres/Supabase real e atomicidade transacional | Não exercitado | Não verificado; atomicidade transacional fora desta microfase |
| Typecheck | PASS antes da validação final de CPF | `npm run typecheck`: exit 0 após o gate CPF/CAS |
| Testes focados | Regressões originais 2/2 sem cobertura de retorno | Gov.br 4/4; suite de seis ficheiros 26/26 PASS após o último gate CPF |
| Build/design-lint/diff check | Build anterior PASS, antes dos patches de retorno e CPF | `npm run build`: exit 0; ratchet PASS após remover DL-02 falso positivo; `git diff --check` PASS |

## Fecho

- Findings fechados com prova completa: nenhum; a correção está verificada apenas em testes estruturais/local e typecheck.
- Findings corrigidos localmente: `GOVBR-PERSIST-01` e `GOVBR-PERSIST-02`; CPF malformado é agora rejeitado. Prova em testes estruturais, não comportamento DB.
- Finding aberto/bloqueado: `GOVBR-ID-01` aguarda decisão sobre exigir CPF esperado previamente persistido em envelopes Gov.br.
- Gates locais concluídos: typecheck, 26 testes focados, design-lint ratchet, build e `git diff --check`.
- Sem staging Gov.br, Postgres efémero, JWT real, browser, CI desta branch ou deploy.
- Não atualizar artefactos gerados do lint como baseline; preservar worktree pré-existente.
