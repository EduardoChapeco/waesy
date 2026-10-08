

## Plano pós-Onda 6 — revisão de completude recursiva

A auditoria seguinte identificou que a integração está conectada ao produto, porém ainda não deve ser considerada completa em nível operacional. O sync manual ainda não aplica o payload normalizado à persistência; a importação atualiza a raiz e arrays, mas não fecha passageiros e localizadores em uma transação; e existem duas famílias estruturais de turismo (`tourism_trips` e `trips`) que exigem decisão canônica antes de ampliar writes.

O próximo trabalho aprovado é a **Onda 7 — canonização e persistência transacional InfoTravel**, seguida por contrato real do provider, wiring de cotação/proposta/voucher/embarque, jobs idempotentes, observabilidade e homologação. O plano executável completo está em `docs/audits/POST_WAVE6_EXECUTION_PLAN_2026-10-08.md`.

Até os gates de migration, RLS, payload real, replay idempotente, browser E2E e rollback serem comprovados, o status correto permanece **implementação conectada e parcialmente operacional; produção não comprovada**.

## Onda 7 — RPC transacional InfoTravel implementada

A importação e a sincronização agora convergem para `apply_infotravel_booking`, com lock da viagem, validação de tenant, projeções InfoTravel separadas de dados manuais, passageiros, itens de confirmação e contadores sanitizados. A mudança resolve o gap de persistência parcial no código, mas a prova final ainda exige migration e testes SQL/RLS em ambiente autorizado.
