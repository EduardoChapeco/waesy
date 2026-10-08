# Ledger de evidências — W2.7.1: conclusão canónica de assinaturas

**Data/hora:** 2026-10-07 20:35 -03:00  
**Repositório:** `EduardoChapeco/waesy`  
**Branch local:** `audit/full-remediation-continuation-20261007`  
**HEAD/base:** `919c86881db1ce83de3feae7fcf7df5aadb58b7d` / `origin/main`  
**GitHub:** sem PR para esta branch; PRs abertas #5, #6, #7, #18 e #19 são de outras branches. Não foi feito push, commit, PR, merge nem deploy.  
**Worktree no preflight:** já continha alterações locais recuperadas de W2.1–W2.7 e respetivos relatórios/specs. Paths preexistentes foram preservados; nenhuma limpeza/reset ou staging global foi executado.  
**Ambiente:** Sandbox; dependências npm instaladas. `psql` e CLI `supabase` não estão disponíveis e não há base efémera acessível.

## Decisão e escopo

Às 20:15:27 -03:00, o utilizador escolheu promover o contrato a `completed` e exigir `completed` mais todos os envelopes assinados. Também confirmou que qualquer estado sem assinatura concluída — incluindo `rejected` e `expired` — deve ser apresentado como pendente, não como erro/falha.

Foi lido o protocolo do repositório, a skill e template `waesy-integrity-auditor`, o masterplan, specs/ledgers W2.7 e W2.7.1, DESIGN/DESIGN-LINT e as rotas, serviços, projetores, tipos, testes e migrations relevantes. A spec W2.7.1 foi registada antes da implementação.

| Microfase | Hash inicial | Ação autorizada | Estado |
|---|---|---|---|
| W2.7.1 | `919c86881db1ce83de3feae7fcf7df5aadb58b7d` | Estados públicos separados; RPC transacional para evidência+assinatura+promoção; UI honesta; migration e testes locais | Código local implementado; gates locais quase concluídos; integração real pendente |

Fora de escopo: aplicar migration, aceder ou alterar Supabase, push/PR/merge, CI, deploy e validação Gov.br/browser real. O fallback turístico com assinaturas em metadata não tem envelopes canónicos e permanece pendente de reconciliação.

## Finding e causa-raiz

| ID | Severidade | Finding baseline | Causa-raiz | Correção local |
|---|---|---|---|---|
| W2.7.1-F1 | Alta | O BFF podia devolver `isValid: true` sem versão selada/hash; a página afirmava autenticidade e usava texto substituto para hash; a rota de assinatura podia sugerir conclusão global após uma assinatura individual. | Autenticidade do registo, assinatura de envelope e conclusão global eram tratadas como um único estado. Os writers não promoviam o contrato e não existia transação comum. | `isAuthentic` requer versão exata selada, data de selagem válida e hash SHA-256 de 64 hexadecimais. `isFullySigned` e alias conservador `isValid` requerem autenticidade, `contracts.status = completed`, pelo menos um envelope canónico e todos `signed` com `signed_at` válido. Não concluídos, inclusive `rejected`/`expired`, são pendentes. |
| W2.7.1-F2 | Alta | Gravação da evidência, transição do envelope e promoção do contrato podiam falhar separadamente ou produzir falso sucesso ambíguo. | Writes distribuídos em chamadas independentes e ausência de uma operação transacional serializada por versão/contrato. | Nova migration cria RPCs `finalize_contract_signature` e `promote_contract_after_signatures`; a primeira grava evidência, assina o envelope e promove `signing → completed` quando todos os envelopes exigidos têm evidência. Locks usam ordem versão→contrato→envelope; trigger bloqueia novos envelopes em contrato concluído e torna imutável o vínculo de versão. Backfill é estrito. |

### Reprodução antes da correção

- Na baseline local W2.7, as regressões novas foram executadas antes dos patches W2.7.1: **10 falharam e 16 passaram (26 no total)**. As falhas expuseram a falta de classificação autenticidade/conclusão, de RPC comum, da promoção canónica e da apresentação honesta de estado.
- A inspeção da migration inicial confirmou que `contracts.status` admite `completed` e não `signed`; os handlers manual/Gov.br não promoviam o contrato ao terminar o último envelope.

## Gates e resultados

| Gate/ambiente | Resultado | Limite do que prova |
|---|---|---|
| Testes focused W2.1–W2.7.1: `npx vitest run` em 7 ficheiros de segurança | **35/35 PASS**: extrator, contrato por pedido, OCR, Gov.br, assinatura manual, verificação pública e conclusão canónica | Inclui testes unitários/estruturais. Não executa PostgreSQL, RLS, transações ou provider real. |
| Typecheck | Execução preliminar **exit 0**; reexecução final após a última alteração de apresentação iniciada e ainda pendente no momento deste registo | O resultado final será anexado sem extrapolar para integração. |
| `node scripts/design-lint.mjs --ratchet` | **exit 0**; dívida global reportada 13.756, redução do débito de 536; baseline não atualizado | Gate visual do repositório; não substitui validação de browser. Relatórios gerados foram restaurados. |
| `npm run build` | **exit 0**; avisos conhecidos do bundler sobre `sideEffects` no pacote e runtime foram emitidos | Build local, sem deploy/smoke em Cloudflare. |
| `git diff --check` | **PASS** | Verifica whitespace, não correção funcional. |
| Migration/Postgres/Supabase/RLS | **Não executado**; sem `psql`, CLI ou DB efémera disponível; migration não aplicada | A RPC ainda não está comprovada no banco remoto. Aplicá-la é pré-requisito para deploy do código chamador. |
| Browser, Gov.br real, CI, deploy | **Não executado** | Continua por validar. |
| Revisão adversarial independente | Em curso no momento deste registo; não se antecipa o resultado | Deve ser atualizada antes do fecho final. |

## Paths e limites

Alterações específicas desta microfase incluem `supabase/migrations/20270114000000_contract_signature_completion.sql`, `src/lib/contracts/public-verification-projection.ts`, `src/services/contracts.functions.ts`, `src/routes/verify.document.$code.tsx`, `src/routes/assinar.$token.tsx`, `src/components/contracts/contract-audit-manifest.tsx`, `src/integrations/supabase/types.ts`, testes focused, `docs/specs/SPEC-W2-7-1-CANONICAL-SIGNATURE-COMPLETION-20261007.md` e `docs/design/DECISIONS.md`. Alguns desses paths já continham alterações W2 anteriores; a implementação não os apresenta como diff isolado.

A migration tem de ser aplicada e validada em ambiente Postgres autorizado antes de publicar/deployar o código que invoca as RPCs. A classificação pública não fecha a auditoria ampla de `service_role`, RLS, grants ou autorização. Permanecem sem prova de integração: lock/concorrência real, transação/rollback, trigger/backfill, callback Gov.br, UX em browser e CI.

**Estado:** concluído em código local e gates disponíveis; não integrado nem publicado. Revisão independente e typecheck final pendentes à hora do registo.
