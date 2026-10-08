# Inventário de remediação — W11 turismo, documentos, propostas, vouchers e contratos

**Data da auditoria:** 2026-10-07  
**Repositório/branch observados:** `EduardoChapeco/waesy`, `audit/full-remediation-20261007`  
**HEAD auditado:** `fc8f9fc348389029d6e2ac84c5f37a06b0347f30`  
**Base local declarada pela especificação:** R6 `fc8f9fc3`; `origin/main` em `919c8688`  
**Método:** leitura somente; código, migrations, testes, masterplan, spec, histórico local e branches remotas foram comparados. Não houve edição de código, commit, migration aplicada, acesso ao Supabase/produção, browser E2E, CI remoto ou deploy.

## 1. Veredito e escopo

Há uma **inconsistência de nomenclatura que precisa ser registrada**: no masterplan, `W11` é formalmente a unidade “WhatsApp: webhooks e outbox duráveis” (`docs/audits/WAESY_HOLISTIC_REMEDIATION_MASTERPLAN_2026-10-06.md:211-221`). A frente solicitada aqui é a frente de **turismo/documentos/propostas/vouchers/contratos**, que no masterplan aparece principalmente nos findings `PERSIST-F07`–`PERSIST-F10`, nas ondas de travel R6/R7/R12/R14 e nos commits locais P0. Portanto, este relatório usa “W11 turismo” como o identificador operacional solicitado, mas não atribui indevidamente os requisitos de WhatsApp a estes fluxos.

**Estado:** remediação ativa, não certificada. O HEAD contém duas ondas locais relevantes (`fe0417ae` e `fc8f9fc3`) com correções substanciais e testes sintéticos, mas não há prova de migration aplicada, RLS efetiva, Postgres representativo, provider/Storage, browser ou produção. O status correto continua sendo **planejado/em andamento; produção não comprovada**, conforme masterplan/spec.

## 2. Evidência de governança, baseline e isolamento

### Confirmado no repositório

- `AGENTS.md` e `skills/waesy-integrity-auditor/SKILL.md` foram lidos. A regra operacional é auditoria adversarial, distinção de evidência e não declarar resolução por commit/typecheck/build isolados.
- `docs/specs/SPEC-20261007-FULL-REMEDIATION-EXECUTION.md` exige baseline/reprodução/causa/teste negativo/gate antes de editar, microfases isoladas, validação server-side de tenant/ator, transação/idempotência, estados honestos de UI e separação de labels local/Postgres/browser/provider/CI/produção.
- A árvore está na branch `audit/full-remediation-20261007`, com HEAD `fc8f9fc3`; `origin/main` aponta para `919c8688`.
- A árvore já possuía artefatos não rastreados antes deste relatório (`docs/audits/LEDGER-20261007-FULL-REMEDIATION.md`, `docs/audits/full-remediation-inventory/`, `docs/specs/SPEC-20261007-FULL-REMEDIATION-EXECUTION.md`). Não foram tocados neste trabalho, exceto a criação do relatório solicitado.
- `git diff --check origin/main...HEAD` detecta trailing whitespace no spec P0 (`docs/specs/SPEC-20261007-P0-ATOMIC-VOUCHER-APPLY.md:3-5`), um problema de higiene documental, não prova funcional.

### Histórico confirmado, não equivalente a estado verificado

- `fe0417ae` (“audit: harden public travel acceptance and voucher flow”) adicionou/alterou handlers, rotas, testes e migrations de aceite público, contrato público, conversão staff e acesso público a voucher.
- `fc8f9fc3` (“audit: make voucher document apply atomic”) alterou `travel-canonical-pipeline.functions.ts`, `travel-lifecycle.functions.ts`, adicionou `travel-voucher-atomic-apply.test.ts` e a migration `20270119000000_p0_atomic_voucher_apply.sql`.
- O diff local contra `origin/main` inclui 26 arquivos e aproximadamente 4.353 inserções/2.118 remoções na área travel/P0. Isso confirma mudança local; não confirma que as migrations foram executadas nem que o runtime em produção corresponde ao SHA.

## 3. Findings do masterplan reconciliados com o HEAD

### PERSIST-F07 — isolamento de tenant no apply de voucher

**Baseline/masterplan:** `docs/audits/WAESY_HOLISTIC_REMEDIATION_MASTERPLAN_2026-10-06.md:2302-2318` descreve aplicação usando `tripId` de outra loja, ausência de validação de ownership e mistura de linhas. O requisito de saída é falhar antes de writes e garantir que todos os filhos pertençam à mesma loja/viagem.

**Estado atual confirmado:** o HEAD adiciona `supabase/migrations/20270119000000_p0_atomic_voucher_apply.sql`, com a função `apply_operator_voucher_atomic(...)` e grants restritos a `service_role` (fim da migration, linhas 350-358); o serviço foi reduzido/alterado no commit `fc8f9fc3` para delegar o apply à operação atômica. Há teste em `src/services/travel-voucher-atomic-apply.test.ts`.

**Limite de prova:** o teste observado é unitário/mocking de chamada e contrato; não prova execução da função em PostgreSQL, RLS, constraints, grants efetivos, concorrência ou que o banco remoto tenha a migration. O gate de tenant deve ser exercitado diretamente no RPC com ator/store A e trip/voucher B, além de teste de rollback de cada filho.

**Classificação:** correção proposta e parcialmente coberta por teste sintético; **não verificado em banco**. Severidade residual potencial: crítica/alta até o gate Postgres/RLS.

### PERSIST-F08 — aplicação parcial marcando OCR como `applied`

**Baseline/masterplan:** `:2319-2336` registra que o helper ignorava erros de writes de trip, passageiros, confirmation items e vouchers, enquanto o caller marcava `travel_document_ingestions.extraction_status='applied'` e gravava timeline.

**Estado atual confirmado:** `fc8f9fc3` adiciona a migration atômica e remove grande parte da sequência anterior de writes em `src/services/travel-lifecycle.functions.ts`; `src/services/travel-canonical-pipeline.functions.ts` foi alterado para chamar a operação atômica. Existe `travel-voucher-atomic-apply.test.ts` cobrindo propagação de falha/replay em nível de mocks.

**Risco residual:** a transação só é fato se a função existir no banco efetivo e tiver o mesmo contrato do código. A auditoria não aplicou migration. Não foi demonstrado que todo caminho de ingestão (incluindo falha após algum write, timeout, retry e estado `needs_review/processing`) deixa de marcar `applied`; também não foi executado teste com constraint violada em child table.

**Classificação:** remediação local confirmada por diff; **comportamento transacional não verificado**.

### PERSIST-F09 — RPC sem `store_id`/tenant seguro

**Baseline/masterplan:** `:2337-2352` exige tenant/ator no servidor e falha para aplicação cross-store.

**Estado atual confirmado:** a assinatura da migration P0 inclui UUIDs de operação e IDs de trip/voucher; o serviço usa identidade server-side e a operação é restringida a `service_role`. O teste novo verifica contratos de chamada, mas não substitui chamada autenticada ao Postgres/RLS.

**Risco:** `service_role` bypassa RLS por definição; logo o isolamento precisa estar implementado explicitamente dentro do RPC e em todos os lookups/updates, não apenas depender de policies. Não há evidência observada de uma execução com store A/B, nem de auditoria de cada caminho de leitura de proposal/trip/voucher. A aceitação pública e a projeção pública usam RPCs separados e precisam de matriz de ownership para evitar que a correção de um fluxo abra outro.

**Classificação:** mitigação aparente no código/migration; **tenant isolation ainda não provado**.

### PERSIST-F10 — idempotência de ingestão OCR por `content_sha256`

**Baseline/masterplan:** `:2354-2370` informa que o hash era salvo, mas cada retry fazia INSERT novo; faltava unique `(store_id, source_kind, content_sha256)` e retomada do ingestion existente.

**Estado atual confirmado:** a migration `20261006120000_canonical_travel_document_pipeline.sql` e o serviço foram lidos no baseline; o HEAD P0 não demonstra, pelos arquivos alterados, uma migration explícita que introduza a chave composta de idempotência da ingestão. O novo RPC de apply é diferente de deduplicar a criação do ingestion.

**Conclusão:** o finding permanece aberto/pendente salvo evidência posterior não presente no snapshot. Deve-se testar duas submissões idênticas, timeout/retry e mesmo hash em `source_kind` diferente.

**Classificação:** **pendente confirmado por ausência de evidência/correção no diff auditado**; não assumir que atomic apply resolve ingestão duplicada.

## 4. Propostas, aceite público e conversão

### O que o HEAD efetivamente cobre

- `src/services/travel-proposal.functions.ts` foi alterado no commit `fe0417ae`; `src/services/travel-proposal-public-acceptance.test.ts` testa que aceite persiste via `record_public_travel_proposal_acceptance`, propaga falha do RPC, rejeita snapshot/opção inválida e preserva replay idempotente reportado pelo RPC (linhas observadas 95-219).
- A migration `20270114000000_p0_public_travel_proposal_acceptance.sql` adiciona o contrato de aceite público; o teste garante que aceite não chama conversão automaticamente.
- `src/services/travel-proposal-conversion-flow.test.ts` cobre a separação staff/conversão e chamadas RPC em mocks.
- Rotas e UI alteradas: `src/routes/_store.proposta.$token.tsx`, `src/routes/workspace.turismo.propostas.$id.tsx`, `src/routes/workspace.turismo.propostas.index.tsx` e `src/components/tourism/studio/travel-proposal-checkout-modal.tsx`.

### Riscos e lacunas

- Não há browser E2E no gate: `vitest.config.ts` usa ambiente Node e inclui `src/**/*.test.ts`; `.github/workflows/ci.yml` executa Vitest, não Playwright/Cypress/Chromium. Portanto loading/error/sucesso/foco/reload e navegação pública não estão provados.
- Os testes mockam Supabase/RPC e não demonstram constraints, isolamento, concorrência de aceite, replay após timeout, ou leitura de dados redacted no banco.
- O masterplan registra um stub ainda relevante para capa de proposta (`generateProposalCoverAI`, `:2395-2405`): o handler recebe prompt/proposalId, mas historicamente retornava `/brand-logo.png`, sem provider/Storage/ownership. A árvore atual deve ser rechecada antes de considerar esse finding encerrado; este inventário não encontrou evidência de provider/Storage real no diff P0.

**Classificação:** aceite/conversão têm implementação e contratos de teste locais; **integração, UI e capa de proposta permanecem não verificadas/possivelmente abertas**.

## 5. Contratos, documentos e vouchers públicos

- `src/services/travel-contract.functions.ts` e `src/services/travel-contract-public-access.test.ts` mostram o desenho atual: leitura pública por `get_public_travel_contract_by_token`, assinatura por `sign_public_travel_contract`, consentimento explícito, user-agent/IP e criação staff por RPC. O teste (linhas 112-285) verifica que não há SELECT direto anon, consentimento é obrigatório e a migration remove policies amplas/revoga privilégios.
- `supabase/migrations/20270115000000_p0_secure_public_contract_access.sql` e `20270117000000_p0_secure_public_voucher_access.sql` são artefatos fortes de intenção de segurança, mas não evidência de aplicação. O contrato público precisa de teste direto com token de outro tenant, token revogado/expirado, versão/hash alterado, replay de assinatura e rate limit/retention.
- O acesso por token em `travel-lifecycle.functions.ts` contém buscas em `tourism_vouchers`, `travel_proposals` e `travel_contracts` (linhas observadas aproximadamente 1230-1374). Como o server client usa `service_role`, cada filtro de token/estado/store e cada retorno de PII deve ser validado por RPC/DB, não por confiança em RLS.
- Para documentos OCR, `travel-canonical-pipeline.functions.ts` recebe conteúdo, calcula hash e cria ingestion; a existência de `content_sha256` sem unique/ON CONFLICT permanece risco de duplicidade. Não foi verificado Storage, MIME, tamanho, malware scanning, retenção ou vínculo de objeto à loja.

**Classificação:** segurança de contrato/voucher melhorada no código e em migrations/testes sintéticos; **não certificada sem Postgres representativo e jornada browser pública**.

## 6. Dependências e riscos de mistura com branches remotas

Branches remotas vistas:

- `origin/feat/waesy-canonical-travel-evolution` (`05ee9845`), descrita como refinamento de editores/sheets de turismo.
- `origin/audit/recursive-p0-remediation` (`c1f9615b`).
- `origin/chore/recover-waesy-task-2026-10-06` (`8e1b2c49`).
- `origin/docs/waesy-holistic-remediation-2026-10-06` (`a57eda21`).
- `origin/main` (`919c8688`).

Não foi feito merge/cherry-pick. O spec proíbe incorporar essas branches sem comparação de paths, commits e ownership. Há risco alto de sobreposição em `travel-lifecycle.functions.ts`, `travel-proposal.functions.ts`, rotas tourism, migrations `202701...` e artefatos de ledger. Antes de qualquer integração, gerar `git diff --name-status`, `git log --left-right --cherry-pick`, detectar migrations com prefixo/ordem conflitante e executar testes sobre uma árvore limpa; nunca usar `git add -A`.

## 7. Matriz de evidência

| Item | Estado | Nível de evidência | Próva ausente |
|---|---|---|---|
| RPC atômico de voucher existe no HEAD | Confirmado | Diff/migration local | Aplicação/execução em Postgres |
| Serviço delega apply e propaga falhas | Confirmado no código | Leitura de fonte + teste mock | Constraint/rollback real |
| Tenant cross-store é bloqueado | Hipótese forte | Contrato/migration/teste sintético | Teste direto RPC com A/B e grants |
| Aceite público é separado de conversão | Confirmado no teste | Teste unitário | Browser, DB e concorrência |
| Contrato público exige consentimento e RPC | Confirmado no código/teste | Teste unitário + migration textual | Banco, token adversarial, replay/rate limit |
| OCR é idempotente por conteúdo | Pendente | Ausência de unique/ON CONFLICT demonstrada no baseline | Segunda submissão/retry no banco |
| OCR nunca marca applied em falha parcial | Hipótese/remediação local | RPC proposto + mock | Falha de child write em transação real |
| Produção/staging está corrigida | Não verificado | Nenhuma evidência observada | SHA publicado, migration history, smoke/rollback |

## 8. Microfases atômicas e gates de saída

1. **W11-T1 — Rebaseline e congelamento de ownership**  
   Paths: somente este relatório, ledger e matriz de findings. Registrar SHA `fc8f9fc3`, baseline `origin/main`, migrations P0 e paths remotos sobrepostos. Gate: `git status`/worktrees limpos ou explicitamente listados; nenhuma alteração de código.

2. **W11-T2 — Provar RPC atômico e tenant do voucher**  
   Paths permitidos: migration `20270119000000...`, serviço/teste atomic apply e documentação P0. Em Postgres efêmero, aplicar migrations em ordem e executar store A/B, trip inexistente, child constraint failure, retry/replay e concorrência. Gate: atomicidade (zero estado parcial), actor/store mismatch falha antes de writes, replay idempotente e grants mínimos.

3. **W11-T3 — Fechar ingestão OCR**  
   Paths: `travel-canonical-pipeline.functions.ts`, migration canonical pipeline, teste dedicado e ledger. Decidir/documentar chave `(store_id, source_kind, content_sha256)`; adicionar ON CONFLICT ou retomada equivalente. Gate: mesmo input devolve o mesmo ingestion, no máximo uma extração, retry não duplica draft e source_kind segue regra explícita.

4. **W11-T4 — Contrato público e voucher projection adversarial**  
   Paths: migrations públicas, `travel-contract.functions.ts`, projeção voucher e testes. Gate: token cross-tenant/revogado, consentimento ausente, versão/hash divergente, replay e PII redaction; nenhum SELECT anon direto; todas as funções com grants explícitos.

5. **W11-T5 — Aceite/conversão e UI real**  
   Paths: proposal functions/routes/components/testes. Gate browser com Chromium (public proposal, aceite, replay, falha, conversão staff), estados loading/empty/error/success honestos, foco e reload; confirmar que aceite não converte sozinho e que conversão valida staff/tenant no servidor.

6. **W11-T6 — Documentos, Storage e capa de proposta**  
   Paths: ingestion/document services, Storage policies/provider adapter, `generateProposalCoverAI` e testes. Gate provider/Storage fake e, depois, ambiente representativo: MIME/ownership/proveniência, falha sem mutação, URL não estática, retry idempotente e limpeza/retention. Se provider não estiver disponível, erro explícito sem `cover_image_url` falso.

7. **W11-T7 — Integração final sem mistura**  
   Comparar cada branch remota e migrations por path/ownership; executar `npm run typecheck`, `npm test`, lint/design/build, Postgres/RLS, browser, CI e smoke/rollback em labels separados. Gate global somente com matriz 100% classificada, SHA final, migrations aplicadas em ambiente representativo, checks verdes e deploy observado; até então não declarar pronto.

## 9. Conclusão

O HEAD representa uma remediação importante de aceite público, contratos públicos e aplicação atômica de voucher, mas a prova é predominantemente **estática/unitária**. `PERSIST-F10` permanece aberto; PERSIST-F07/F08/F09 têm mitigação local sem validação de banco/tenant; a jornada de documentos, Storage, provider, UI e produção permanece não verificada. A frente deve avançar em microfases isoladas, começando por Postgres/RLS e idempotência, e não por novos merges de branches paralelas.
