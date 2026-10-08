# Spec — W2.7: projeção pública de verificação documental

**Data:** 2026-10-07 (UTC−03:00)  
**Repositório:** `EduardoChapeco/waesy`  
**Branch:** `audit/full-remediation-continuation-20261007`  
**Base:** `origin/main` — `919c86881db1ce83de3feae7fcf7df5aadb58b7d`

## Contexto

A verificação por código/hash é pública por desenho, mas o BFF usa o cliente Supabase `service_role`, que ignora RLS. Na baseline, a consulta seleciona `dispatch_settings`, `observers`, dados do criador, e-mail/telefone dos signatários e `signature_fields`; a resposta devolve a versão inteira e, no fallback turístico, `metadata.signatures` sem projeção. A página lê e fornece e-mail, telefone e observadores ao manifesto público. O escopo desta microfase é reduzir dados expostos, não rever autorização global de `service_role`, RLS, semântica de validade/selagem, nem deploy.

## Requisitos EARS

- **Quando** uma pessoa consulta um documento por código ou hash, **o sistema deve** devolver apenas os campos mínimos usados pelo certificado público: título, categoria, estado, código, data, estado de quitação, hash/data de quitação e resumo da versão selada.
- **Quando** uma versão ou assinatura é projetada para resposta pública, **o sistema deve** permitir exclusivamente versão/hash/data/estado e nome/papel/estado/data/nível de autenticação do signatário; não deve devolver `signature_fields`, `dispatch_settings`, observadores, criador, e-mail, telefone, imagem, IP, user-agent, biometria ou outros campos arbitrários.
- **Quando** o fallback turístico encontra código, série de certificado ou hash em `metadata`, **o sistema deve** aplicar a mesma allowlist aos dados e às assinaturas, sem interpolar a entrada do visitante num filtro PostgREST `or` em texto livre.
- **Quando** um hash SHA-256 de 64 caracteres não existir em `contract_versions`, **o sistema deve** continuar ao fallback turístico por `metadata.content_hash`, sem terminar prematuramente com “hash não reconhecido”.
- **Quando** a entrada corresponder a uma versão por hash, **o sistema deve** apresentar exatamente essa versão, nunca outro `sealedVersion`; um código de 64 hex deve continuar pesquisável em `verification_code` se não existir linha hash correspondente.
- **Quando** `metadata.certificate_serial` for devolvido, **o sistema deve** validar o formato canónico `CERT-XXXXXX-NNNN`; valores arbitrários de `metadata` não podem atravessar a resposta pública.
- **Quando** a página pública renderiza o manifesto, **o sistema deve** consumir apenas os campos públicos permitidos, sem tentar ler e-mail, telefone ou observadores.
- **Quando** a entrada pública está vazia ou excede o limite definido, **o sistema deve** rejeitá-la antes de consultar o banco.

## Paths autorizados

- `src/services/contracts.functions.ts`
- `src/routes/verify.document.$code.tsx`
- `src/lib/contracts/public-verification-projection.ts`
- `src/services/contracts-public-verification-security.test.ts`
- `docs/audits/W2-7-PUBLIC-VERIFICATION-20261007.md`
- `docs/audits/20261007-W2-CONTINUITY-REVALIDATION.md`
- `docs/specs/SPEC-W2-6-1-SIGNATURE-FAILURE-SEMANTICS-20261007.md`
- `docs/audits/W2-6-1-SIGNATURE-FAILURE-SEMANTICS-20261007.md`
- `docs/specs/SPEC-W2-2-ORDER-SERVICE-ROLE-RESTRICTION-20261007.md`
- `docs/audits/W2-2-ORDER-SERVICE-ROLE-RESTRICTION-20261007.md`
- `docs/audits/20261007-holistic-execution-ledger.md` (apêndice da microfase)
- `docs/design/DECISIONS.md`

## Critérios de aceitação

1. Teste de regressão demonstra que a baseline seleciona/propaga campos privados e falha antes da alteração.
2. Testes positivos e negativos provam a allowlist na projeção principal e no formato de assinatura recebido pelo fallback, inclusive entradas com PII/informação interna extra.
3. Testes verificam os campos selecionados pelo BFF, a ausência do filtro `.or(...)` com entrada não confiável e a ausência de acessos privados na página.
4. Typecheck, teste focado, suíte de testes pertinente, diff check e build passam no SHA final; validar no Postgres/Supabase ou navegador real apenas se houver ambiente autorizado.
5. Nenhuma migration, alteração de credenciais, regra de branch, PR, push, merge ou deploy é executada nesta microfase.

## Exclusões e limites

- A consulta continua a ser pública e usa um cliente `service_role`; o finding global de autorização/RLS permanece na onda W2.
- Não se altera o significado de `isValid`, quais estados podem ser certificados, nem o conteúdo jurídico do manifesto.
- Testes estáticos/unitários não provam exposição real em rede, comportamento do banco remoto ou produção.
- Os relatórios W2.1–W2.6 recuperados da conversa anterior são evidência histórica até serem reexecutados nesta branch.
