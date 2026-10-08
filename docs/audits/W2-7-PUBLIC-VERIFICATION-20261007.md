# Ledger de evidências — W2.7: verificação pública de documentos

**Data/hora:** 2026-10-07 19:10 -03:00  
**Repositório:** `EduardoChapeco/waesy`  
**Branch de continuidade:** `audit/full-remediation-continuation-20261007`  
**HEAD/base inicial:** `919c86881db1ce83de3feae7fcf7df5aadb58b7d` (`origin/main`)  
**Worktree inicial:** limpo; sem alterações preexistentes no clone.  
**PR:** ainda não existe para esta branch.

## Preflight e proveniência

- Foram lidos `AGENTS.md`, a skill `waesy-integrity-auditor`, o template de ledger, o masterplan, a spec relacionada, os relatórios existentes e os arquivos de implementação/rota/componente pertinentes.
- O GitHub contém o masterplan W0–W18 e relatórios de outras ondas, mas **não** contém a branch `audit/full-remediation-20261007` nem os relatórios W2.1–W2.6 dessa retomada. Os relatórios W2.1–W2.6 foram recuperados como artefactos da tarefa referenciada; as alegações históricas de testes serão reproduzidas nesta branch antes de as declarar verificadas.
- PRs abertas observadas em `main`: #5, #6, #7, #18 e #19. Nenhuma é a branch desta continuação. Não foi feito push, PR, merge nem deploy.
- A numeração W2.1–W2.7 da sequência microfase desta retomada é um ledger local e **não substitui** a numeração oficial W2.1–W2.5 do masterplan (identidade, `service_role`, RLS, grants e quotas).

## Finding confirmado na baseline

A baseline `main` seleciona os campos privados `dispatch_settings`, `observers`, relação do criador, e-mail/telefone dos signatários e `signature_fields` em `verifyDocumentPublic`; devolve o objeto de versão completo e, no fallback turístico, propaga `metadata.signatures` sem allowlist. A página `/verify/document/$code` lê e fornece e-mail, telefone e observadores ao manifesto. A verificação é pública por desenho e usa `getServerClient()`/`service_role`, portanto a minimização deve ser aplicada explicitamente no BFF; RLS não é a barreira deste endpoint.

## Snapshot de implementação

| Onda/microfase | Paths lidos antes da mudança | Hash inicial | Ação delimitada | Estado |
|---|---|---|---|---|
| W2.7 (ledger desta continuidade) | `contracts.functions.ts`, rota pública, `ContractAuditManifest`, cliente Supabase, callers/esquema relacionados | `919c86881db1ce83de3feae7fcf7df5aadb58b7d` | Allowlist de resposta pública, fallback seguro, remoção de PII, lookup sem colisões, versão hash exata e serial validado | Código corrigido localmente; validação de estado público segue em W2.7.1 |

## Prova prevista e resultados

| Verificação | Estado inicial | Resultado final |
|---|---|---|
| Regressão contra baseline (campos privados/fallback) | Reproduzida: teste executado antes da correção; 4 dos 6 casos falharam, incluindo query, fallback e rota | Confirmado |
| Positivo: campos públicos preservados | Unit test da projeção passa | PASS |
| Negativo: email/telefone/documento/IP/user-agent/biometria/metadados removidos | Testes da allowlist normal e turística passam | PASS |
| Rate/input/query segura para código público | Zod limita a entrada; filtros usam chaves fixas e `.filter(..., "eq", codeOrHash)`, sem `.or(...)` textual | PASS em teste estático |
| Typecheck e testes focados | `npm run typecheck`: exit 0 após W2.2/W2.3.1/W2.6.1/W2.7; 6 ficheiros, 26 testes | PASS local |
| Design lint ratchet | `node scripts/design-lint.mjs --ratchet`: exit 0; nenhum baseline atualizado | PASS local |
| Build | `npm run build` após os patches W2.3.1: exit 0 | PASS local |
| Supabase/Postgres/RLS real | Não disponível/não tentado | Não verificado |
| Browser/produção/deploy | Não autorizado/não tentado | Não verificado |

## Revisão adversarial e follow-up semântico

- A revisão independente confirmou que a resposta anterior dizia `isValid: true` mesmo sem versão selada/hash e que a UI afirmava “Documento Autêntico e Verificado” com placeholder de hash. Esse finding permanece aberto até W2.7.1.
- Os findings adversariais de hash SHA-256 que não alcançava o fallback, seleção da versão errada e alias `metadata.certificate_serial` não validado foram cobertos por correções e regressões posteriores; a suite atual passou, sem Postgres real.
- O utilizador determinou que assinatura ainda não concluída, inclusive envelopes `rejected`/`expired`, deve ser apresentada como **pendente**, não como falha; depois escolheu `completed` + todos os envelopes assinados como critério de conclusão. A microfase [W2.7.1](W2-7-1-CANONICAL-SIGNATURE-COMPLETION-20261007.md) implementa localmente a distinção autenticidade/conclusão, promoção transacional e UI pendente. A migration continua não aplicada e sem validação de Postgres real.

## Limites

A microfase não autoriza aplicar a migration, alterar dados de banco/provedor, mudar política de branch ou fazer deploy. O endpoint permanece público; a allowlist não fecha a auditoria transversal de `service_role`, RLS ou grants. W2.7.1 está implementada apenas localmente, sem push, PR, merge, aplicação de migration ou deploy.
