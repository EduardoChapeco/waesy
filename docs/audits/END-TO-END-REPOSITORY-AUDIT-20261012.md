
## 11. Execução W1 — schema e contratos locais

No head de evidência `97acc3fb`, os gates locais de W1 passaram: `check:schema` encontrou 500 migrations, 621 tabelas declaradas e 213 funções, com versões únicas; `check:bff` encontrou 500 migrations, 632 tabelas declaradas, 495 tabelas referenciadas e zero contratos sem declaração local. O ledger estrutural também passou com as 18 fases presentes.

A evidência foi registrada em [`W1-LOCAL-SCHEMA-EVIDENCE-20261012.md`](./W1-LOCAL-SCHEMA-EVIDENCE-20261012.md). W1 permanece `blocked` para promoção porque ainda falta replay from-zero, segunda aplicação, catálogo efetivo, RLS/JWT/grants e testes cross-tenant em Postgres autorizado.
