# Spec — W2.2: restrição de pedido antes da leitura service_role

**Data:** 2026-10-07  
**Branch/HEAD inicial:** `audit/full-remediation-continuation-20261007` / `919c86881db1ce83de3feae7fcf7df5aadb58b7d`  
**Base:** `origin/main`  
**Preflight:** AGENTS, skill, template, cartão W2.2 oficial, relatório recuperado W2.2, rota caller, handler, teste, schema JSON do pedido e guardas de identidade relidos. Worktree contém snapshots W2.1–W2.7 e W2.6.1 da mesma execução; nenhum diff de terceiros no clone inicial limpo. PRs #5–#7: CI sucesso, Cloudflare Pages falha; branch atual sem PR.

## Requisitos EARS

- **Quando** o caller usar `publicToken`, **o sistema deve** incluir simultaneamente `orderId` e token coincidente na consulta do pedido.
- **Quando** não houver token público, **o sistema deve** rejeitar utilizador anónimo antes de consultar a tabela `orders` e exigir identidade.
- **Quando** a identidade autenticada for staff, **o sistema deve** chamar `requireStaff()` e restringir a query ao `store_id` retornado por essa guarda.
- **Quando** o staff não conseguir carregar o pedido dessa loja ou o utilizador for cliente, **o sistema deve** consultar apenas a linha cujo `customer_snapshot.profile_id` coincide exatamente com a identidade autenticada.
- **Quando** a query falhar ou não houver linha autorizada, **o sistema deve** falhar sem ler/criar contrato usando um `orderId` isolado.

## Paths autorizados

- `src/services/contracts.functions.ts` (`generateContractFromOrder`)
- `src/services/contracts-order-security.test.ts`
- caller já existente `src/routes/_store.pedido.$publicToken.confirmacao.tsx` (somente leitura; sem alteração prevista)
- `docs/audits/W2-2-ORDER-SERVICE-ROLE-RESTRICTION-20261007.md`
- `docs/audits/20261007-W2-CONTINUITY-REVALIDATION.md`

## Critério de aceitação

A regressão deve reprovar antes da mudança por falta de `requireStaff()` dentro do handler e ausência de predicados SQL de tenant/cliente. Após a mudança, testes cobrem token público, staff do tenant, cliente dono, anónimo, outro tenant e query com erro. Typecheck, suite focada, build e revisão adversarial são gates locais separados; isso não prova membership/RLS real nem resolve a proveniência de memberships auto-heal, a documentar como residual do modelo W2.1.
