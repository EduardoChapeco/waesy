# Spec — W2.7.1: conclusão canónica de assinaturas e verificação pública

**Data:** 2026-10-07 (UTC−03:00)  
**Repositório:** `EduardoChapeco/waesy`  
**Branch:** `audit/full-remediation-continuation-20261007`  
**Base:** `origin/main` — `919c86881db1ce83de3feae7fcf7df5aadb58b7d`  
**Decisão de produto:** opção 2 confirmada pelo utilizador às 20:15:27 -03:00: promover o contrato a `completed` apenas depois da última assinatura exigida e exigir `completed` mais todos os envelopes assinados para declarar assinatura concluída.

## Contexto e baseline

A microfase W2.7 já reduziu a resposta pública por allowlist, mas o BFF ainda devolve `isValid: true` sem verificar uma versão selada/hash válido e a página mostra um cabeçalho de sucesso e um hash substituto. O fluxo canónico de assinatura manual e Gov.br atualiza apenas `signature_envelopes`; não promove `contracts.status` a `completed`. O schema permite `completed` e não permite `signed` para `contracts.status`. Logo, a página não consegue distinguir autenticidade criptográfica do registo de conclusão de todas as assinaturas.

## Requisitos EARS

- **Quando** a consulta pública encontra um registo, **o sistema deve** calcular `isAuthentic` somente se a versão exata estiver selada, tiver `sealed_at` e hash SHA-256 canónico de 64 hexadecimais; ausência de prova não deve virar erro de lookup nem sucesso fictício.
- **Quando** um certificado é apresentado, **o sistema deve** calcular `isFullySigned` somente se o registo for autêntico, `contracts.status = completed`, houver pelo menos um envelope canónico na versão e todos esses envelopes tiverem `status = signed` e `signed_at` válido. `isValid` será alias conservador de `isFullySigned`.
- **Quando** a assinatura ainda não estiver concluída, incluindo envelope `pending`, `viewed`, `rejected` ou `expired`, **o sistema deve** devolver um resultado pendente, nunca erro de verificação apenas por falta de assinatura. Se todos os envelopes já estiverem assinados mas a promoção ainda não tiver sido confirmada, a página deve dizer que a conclusão está pendente.
- **Quando** uma assinatura manual ou Gov.br é persistida, **o sistema deve** criar a evidência, transicionar o envelope e, se for o último envelope exigido da versão selada/corrente, promover o contrato a `completed` na mesma transação. O contrato não pode ser promovido antes de todas as assinaturas.
- **Quando** houver disputa entre signatários, reexecução ou erro de banco, **o sistema deve** serializar a finalização por versão/contrato, ser idempotente, confirmar o estado persistido e não devolver sucesso se a transação não for confirmada.
- **Quando** um contrato já estiver `completed`, **o banco deve** impedir a criação de novos envelopes. O vínculo `contract_version_id` de um envelope existente é imutável para serializar de forma segura a promoção e impedir reatribuição entre versões; o trigger valida locks na mesma ordem da RPC. Um backfill pode promover somente contratos `signing` cuja versão corrente esteja selada, tenha hash válido, possua envelopes e todos tenham assinatura e evidência persistidas.
- **Quando** uma versão for consultada pelo hash, **o sistema deve** manter o lookup na versão exata; status global de contrato não pode substituir a projeção da versão correspondente.
- **Quando** a UI mostra o manifesto, **o sistema deve** separar registo autêntico, assinaturas pendentes e conclusão confirmada; não deve afirmar autenticidade/assinatura concluída, exibir hash ou carimbo temporal inventado, nem mostrar quitação como autenticada quando o registo não for autêntico.
- **Quando** o resultado vier do fallback turístico legado, baseado em `metadata.signatures` sem envelopes canónicos, **o sistema deve** identificá-lo como conclusão pendente de reconciliação e não o promover a `isFullySigned` nesta microfase.
- **Quando** o signatário termina a própria ação, **a página deve** dizer que a assinatura individual foi registada; não deve sugerir que todo o contrato foi assinado se existirem outras assinaturas pendentes.

## Paths autorizados

- `src/services/contracts.functions.ts`
- `src/lib/contracts/public-verification-projection.ts`
- `src/routes/verify.document.$code.tsx`
- `src/routes/assinar.$token.tsx`
- `src/components/contracts/contract-audit-manifest.tsx`
- `src/integrations/supabase/types.ts`
- `src/services/contracts-public-verification-security.test.ts`
- `src/services/contracts-manual-sign-security.test.ts`
- `src/services/contracts-govbr-security.test.ts`
- `src/services/contracts-signature-completion-security.test.ts` (novo)
- `supabase/migrations/20270114000000_contract_signature_completion.sql` (nova; ordenada após a migration existente mais recente `20270113000000`)
- `docs/design/DECISIONS.md`
- `docs/specs/SPEC-W2-7-1-CANONICAL-SIGNATURE-COMPLETION-20261007.md`
- `docs/audits/W2-7-1-CANONICAL-SIGNATURE-COMPLETION-20261007.md`
- `docs/audits/W2-7-PUBLIC-VERIFICATION-20261007.md`
- `docs/audits/20261007-W2-CONTINUITY-REVALIDATION.md`

## Critérios de aceitação

1. Testes vermelhos reproduzem a ausência de promoção a `completed`, sucesso sem transação confirmada e `isValid` universalmente verdadeiro na baseline da branch.
2. Testes unitários positivos/negativos cobrem hash/selo, status completed, zero envelopes, assinatura ausente, `rejected`/`expired`, versão legada sem envelopes e conclusão pendente após todas as assinaturas.
3. Testes estruturais verificam locks/ordem da RPC, allowlist de execução `service_role`, evidência inserida na transação, contagem de envelopes, backfill restrito, bloqueio de novos envelopes e chamadas dos fluxos manual/Gov.br.
4. A página pública e o manifesto exibem corretamente os estados, sem placeholder de hash/data ou mensagem de erro para assinatura pendente; a rota de assinatura comunica apenas a assinatura individual.
5. Regressões W2.1–W2.7, typecheck, design-lint ratchet, `git diff --check` e build passam no estado final local.
6. A migration é revisada estaticamente; não existe `supabase`, `psql` nem base efémera configurada neste sandbox, pelo que não se afirma validação de integração/Postgres/RLS.

## Exclusões e limites

- Não aplicar a migration, alterar banco remoto/credenciais, abrir PR, fazer push, merge ou deploy; migration deve ser aplicada antes de qualquer deploy futuro do código que chama a RPC.
- Não alterar a arquitetura do fluxo turístico legado em `src/services/travel-contract.functions.ts`; os seus certificados podem provar um registo/hash, mas não provam conclusão canónica por envelopes e ficam pendentes de reconciliação.
- Não declarar o finding transversal de `service_role`, RLS ou grants como fechado.
- Não afirmar verificação em browser, Supabase/Postgres real, CI ou produção.
