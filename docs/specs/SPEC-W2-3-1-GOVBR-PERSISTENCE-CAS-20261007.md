# Spec — W2.3.1: persistência/CAS da assinatura Gov.br

**Data:** 2026-10-07 (UTC−03:00)  
**Repositório:** `EduardoChapeco/waesy`  
**Branch:** `audit/full-remediation-continuation-20261007`  
**Base/HEAD inicial:** `origin/main` — `919c86881db1ce83de3feae7fcf7df5aadb58b7d`

## Enquadramento

Este follow-up corrige a microfase Gov.br recuperada da conversa (relatório histórico `W2-3-GOVBR-20261007.md`), sem a confundir com **W2.3 oficial do masterplan**, que é revisão de policies RLS. A revisão adversarial encontrou que `signContractWithGovBr` ignorava erro de `signature_evidence.insert` e de `signature_envelopes.update`, atualizava sem compare-and-set e não rejeitava envelope expirado/terminal. O callback só redireciona `signed=true` se a função retornar, logo a fronteira de sucesso é a persistência server-side.

## Requisitos EARS

- **Quando** a selagem Gov.br for solicitada, **o sistema deve** exigir um envelope existente no estado `pending` e com `expires_at` válido, futuro e parseável.
- **Quando** o CPF recebido de Gov.br for validado, **o sistema deve** exigir exatamente 11 dígitos após normalização; se o envelope contiver CPF esperado, este também deve normalizar para 11 dígitos e corresponder exatamente ao recebido.
- **Quando** a evidência de assinatura for inserida, **o sistema deve** verificar erro e obter o ID/digest persistidos antes de tentar a transição do envelope.
- **Quando** o envelope for atualizado, **o sistema deve** executar compare-and-set `pending → signed` com `expires_at > signedAt`, exigir exatamente uma linha retornada e verificar status, timestamp, verificação e nível Gov.br devolvidos.
- **Quando** o CAS falhar ou retornar erro, **o sistema deve** re-ler os campos de estado e a evidência desta tentativa por ID/envelope/digest; somente pode devolver sucesso se status, timestamp, nível Gov.br e evidência correspondente estiverem persistidos.
- **Quando** uma re-leitura confirmar que esta tentativa não venceu o CAS, **o sistema deve** remover e confirmar a remoção da evidência que ela criou, depois lançar erro. Se a leitura não permitir distinguir entre resultado confirmado e concorrência, **o sistema deve** preservar a evidência para reconciliação, lançar erro explícito e nunca afirmar sucesso.
- **Quando** ocorrer retry/replay após estado terminal, envelope expirado ou assinatura concorrente, **o sistema deve** rejeitar a tentativa e não afirmar sucesso por idempotência não demonstrada.

## Paths autorizados

- `src/services/contracts.functions.ts`
- `src/services/contracts-govbr-security.test.ts`
- `docs/specs/SPEC-W2-3-1-GOVBR-PERSISTENCE-CAS-20261007.md`
- `docs/audits/W2-3-1-GOVBR-PERSISTENCE-CAS-20261007.md`
- `docs/audits/20261007-W2-CONTINUITY-REVALIDATION.md`

Sem alteração de schema, migration, callback, credenciais, branches protegidas, PR, push, merge ou deploy nesta microfase.

## Critérios de aceitação

1. Um teste de regressão falha no snapshot inicial por falta de estado/expiração/CAS e de verificação do resultado das duas escritas.
2. Testes positivos/negativos comprovam CPF normalizado com 11 dígitos, `pending` não expirado, erro de insert, CAS sem linha, erro de update, conferência de campos devolvidos, confirmação por re-leitura desta evidência e erro de cleanup.
3. `npm run typecheck`, testes Gov.br e regressões W2 focadas, `git diff --check`, design-lint ratchet e build passam no SHA final desta execução.
4. O ledger classifica resultados como locais/código; sem Gov.br staging/Postgres/browser, não reivindicar integração, atomicidade transacional ou produção.

## Exclusões e limites

- Não implementar nem alegar validação criptográfica completa de `id_token`, nonce/state ou integração de staging Gov.br.
- A sequência REST de insert + CAS + compensação continua sem atomicidade garantida perante crash do processo; uma transação/RPC exigiria microfase/schema separada.
- Um CPF esperado malformado é rejeitado; a política de identidade quando `signature_envelopes.signer_cpf` é nulo continua pendente e requer decisão específica. Este follow-up não força CPF previamente ligado em envelopes sem CPF.
- Não alterar semântica de validade pública de contratos; a decisão solicitada ao utilizador permanece pendente.
