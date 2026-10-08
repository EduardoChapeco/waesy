# Continuidade da auditoria Waesy — estado de ondas e revalidação W2

**Data:** 2026-10-07  
**Repositório:** `EduardoChapeco/waesy`  
**Branch desta execução:** `audit/full-remediation-continuation-20261007`  
**Base local:** `origin/main` — `919c86881db1ce83de3feae7fcf7df5aadb58b7d`  
**Estado de publicação:** branch local, ainda sem push/PR; nenhum merge ou deploy feito.

## Resultado da verificação no GitHub

O repositório `main` contém o [plano mestre de 18 ondas/81 microfases](WAESY_HOLISTIC_REMEDIATION_MASTERPLAN_2026-10-06.md), o [ledger de execução de 07-10](20261007-holistic-execution-ledger.md), o [relatório RPC/identidade](20261007-rpc-identity-wave.md), o [inventário antifalsidade](20261007-antifake-inventory.md) e relatórios de storage/pagamentos e prontidão. O plano enumera W0–W18; a presença de uma onda no plano ou de um relatório não significa que todos os critérios de conclusão dessa onda estejam provados.

Na árvore `docs/audits` de `origin/main` **não existiam** os relatórios W2.1–W2.6 recuperados da tarefa referenciada, nem o relatório W2.7. A branch remota histórica `audit/full-remediation-20261007` também não existia no GitHub. Os snapshots de código e relatórios anteriores foram recuperados como artefactos da conversa e colocados nesta branch de continuação para validação; não foram tratados como prova atual até serem reexecutados.

### Estado de publicação/ondas observado

| Onda/área | Evidência publicada em `main` | Estado observado nesta verificação |
|---|---|---|
| W0 — baseline/inventário | Plano e artefactos de auditoria/ledger | O plano define W0.1–W0.3; não se declara aqui o fecho dos 109 findings sem reconciliação individual. |
| W1 — release/Cloudflare | [Relatório Cloudflare Pages](CLOUDFLARE_PAGES_RELEASE.md) e PRs de auditoria | PRs #5, #6 e #7: `5 Quality Gates`/CI **SUCCESS**, `Cloudflare Pages` **FAILURE**. W1 não pode ser marcado como gate de release completo com esses checks. |
| W2 oficial do plano | Masterplan W2.1–W2.5 e relatório RPC/identidade | O relatório publicado cobre identidade/RPC; não constitui prova de todas as superfícies de contratos, OCR, assinatura ou verificação pública. |
| W2.1–W2.6 da sequência recuperada | Artefactos da conversa, não `main` | Código/testes restaurados e reexecutados; follow-ups W2.2 e W2.6.1 detalhados abaixo. Integração e produção continuam em aberto. A nomenclatura histórica não substitui a sequência oficial W2.1–W2.5 do masterplan. |
| W2.2 — consulta service_role de pedidos | [Ledger corretivo](W2-2-ORDER-SERVICE-ROLE-RESTRICTION-20261007.md) nesta branch | Finding reproduzido antes: leitura ampla e sem papel staff. Agora `requireStaff()` e filtros de query por store/cliente/token; testes focused verdes. Falta Postgres/RLS real. |
| W2.3.1 — persistência/CAS Gov.br | [Spec](../specs/SPEC-W2-3-1-GOVBR-PERSISTENCE-CAS-20261007.md) e [ledger](W2-3-1-GOVBR-PERSISTENCE-CAS-20261007.md) nesta branch | Insert/CAS verifica campos retornados; erro re-lê estado/evidência por ID/digest; cleanup confirmado apenas quando a leitura prova que esta tentativa perdeu. Em estado ambíguo, preserva evidência e lança erro. Falta DB/provider real; CPF esperado nulo continua finding de política aberto. Não confundir com W2.3 oficial de RLS. |
| W2.6.1 — falha de transição de assinatura | [Ledger corretivo](W2-6-1-SIGNATURE-FAILURE-SEMANTICS-20261007.md) nesta branch | Finding reproduzido antes: erro/CAS sem row era convertido em `success:true`. Agora relê estado, verifica cleanup e só responde sucesso se status assinado; falta DB/concorrência reais. |
| W2.7/W2.7.1 — verificação pública e conclusão canónica | [W2.7](W2-7-PUBLIC-VERIFICATION-20261007.md), [W2.7.1](W2-7-1-CANONICAL-SIGNATURE-COMPLETION-20261007.md) e [spec](../specs/SPEC-W2-7-1-CANONICAL-SIGNATURE-COMPLETION-20261007.md) nesta branch | Projeção/allowlist, lookup por versão exata, serial turístico canónico, estados separados `isAuthentic`/`isFullySigned` e RPC transacional implementados localmente. Migration não aplicada; integração Postgres e browser por validar. |
| W2.7.2 — autorização atómica da selagem | [Spec](../specs/SPEC-W2-7-2-SEAL-AUTHORIZATION-AND-PROVEN-SUCCESS-20261007.md) e [ledger](W2-7-2-SEAL-AUTHORIZATION-AND-PROVEN-SUCCESS-20261007.md) nesta branch | `requireStaff()` + filtros criador/tenant e RPC com revalidação/locks/rollback; Vitest security **64/64**, suite total **1.581**, typecheck/build **exit 0**, design-lint ratchet **−537**; PostgreSQL local descartável aprovou multi-signatário, owner/store, stale baseline e rollback. Revisão adversarial: F05 writers alternativos; F06 hash não recalculado/semântica divergente; F07 DML/RLS/grants por verificar; F08 quitação sem owner/store; F09 metadados/reconciliação; F04 contrato dos campos finais por especificar. Não prova Supabase/RLS/browser/produção e impede declarar W2.7 fechada. |

## Microfases recuperadas e revalidadas

| Microfase da conversa anterior | Alteração recuperada | Prova local repetida nesta branch |
|---|---|---|
| W2.1/W2.5 — extrator turístico | Guard de staff, rate limit e limites do payload | Teste de segurança estático incluído na execução focada; não prova provider/quota persistente. |
| W2.2 — contrato a partir de pedido | Token público, staff ou cliente proprietário | Testes exigem role guard e predicados SQL no próprio query; sem banco real/RLS. |
| W2.3 — Gov.br | Callback não sela com troca/token/userinfo inválidos | Teste de callback incluído; sem integração Gov.br/staging e sem validação externa de nonce/state/id-token. |
| W2.4 — criação manual por tenant | Store derivada da identidade staff | Teste estático incluído; sem sessão/banco remoto. |
| W2.5 — OCR contratual | Staff/rate limit/limite base64 e remoção de URL controlada | Teste de segurança incluído; provider e quota reais não exercitados. |
| W2.6 — assinatura manual | Limites, expiração e compare-and-set; follow-up W2.6.1 impede falso sucesso | Teste de falha/cleanup incluído; concorrência/transação precisam ser verificadas contra banco/RPC real. |
| W2.7 — verificação pública | Allowlist de versão/assinaturas; fallback turístico projetado; UI sem contactos/observadores | Regressão positiva/negativa unitária e contratos estáticos; sem chamada real Supabase ou browser. |

## Finding W2.7 reproduzido na baseline

No SHA base `919c86881db1ce83de3feae7fcf7df5aadb58b7d`, o BFF selecionava dados de despacho, observadores, criador, contactos de signatários e campos de assinatura; o fallback turístico devolvia assinaturas de `metadata` sem allowlist e interpolava a entrada do visitante num filtro `.or(...)`; a página pública lia e-mail/telefone e observadores. O teste de regressão, executado antes da correção, falhou em quatro dos seis casos (dois casos da allowlist pura já passavam); depois da correção, a suite focada ficou verde.

## Gates locais desta branch

- Suite de segurança: **64/64 testes aprovados**, em 10 ficheiros, incluindo W2.7.2.
- `npm run typecheck`: **exit 0** após as alterações W2.7.2.
- `npm run lint:design`: **exit 0** em modo ratchet; 13.755 achados globais e débito reduzido em 537; baseline não atualizado. O ratchet não satisfaz zero P0/P1.
- `npm run build`: **exit 0**; worker Cloudflare gerado e verificação de fuga cliente/servidor aprovada; avisos de exports em rotas e `sideEffects` observados.
- PostgreSQL local `waesy_w272_test`: **PASS** em schema fixture mínimo para a RPC W2.7.2; não é aplicação de migrations from-zero, Supabase nem RLS.
- `npm test`: **243 ficheiros, 1.581 testes aprovados**; um timeout de rede é exercitado por teste negativo e não falha a suite.
- A varredura simples de segredos nos paths alterados não encontrou padrões de chave/token. O `git diff --check` dos rastreados passou; após staging completo, `git diff --cached --check` apontou espaços finais em linhas Markdown de specs/ledgers históricos (nenhum erro de whitespace em código/migration). CI da branch: ainda não executado antes da PR.

## Limites e pendências

- O cliente usado pela rota pública é `service_role`; a allowlist reduz a resposta, mas **não** fecha a auditoria sistémica de `service_role`, autorização, grants ou RLS prevista em W2.
- Foi usado PostgreSQL **local descartável com schema fixture mínimo apenas para W2.7.2**. Não houve aplicação de migrations completas from-zero, Supabase/JWT/RLS, Gov.br staging, provider OCR real, browser E2E ou deploy público. Testes, typecheck e build locais não provam essas integrações.
- O utilizador confirmou que qualquer assinatura não concluída, inclusive `rejected`/`expired`, deve aparecer como **pendente**, e escolheu promover para `completed` exigindo `completed` + todos os envelopes assinados. W2.7.1 implementa esta regra localmente por RPC transacional; migration não aplicada e sem Postgres real, concorrência, browser ou CI validados.
- A revisão adversarial independente não encontrou bypass claro após W2.2/W2.6.1, mas confirmou o finding de falso positivo da verificação pública e a falta de testes com Supabase real. Hash/código/versão e serial foram corrigidos e cobertos localmente. Em W2.3.1, a segunda revisão levou à conferência dos campos CAS/evidência; permanece o finding de identidade quando `signer_cpf` não está definido e falta prova transacional real.
- CI no SHA publicado e checks Cloudflare desta nova branch permanecem por executar; sem push/PR, merge ou deploy.
