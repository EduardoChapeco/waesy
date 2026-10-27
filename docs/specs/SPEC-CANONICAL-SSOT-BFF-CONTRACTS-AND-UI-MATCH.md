# SPEC-CANONICAL-SSOT-BFF-CONTRACTS-AND-UI-MATCH — Alinhamento Integral de UI, BFF, Schemas e Banco de Dados

## 0. Metadados e Controle
- **ID da Spec:** SPEC-302-SSOT-BFF-CONTRACTS-UI-MATCH
- **Título:** Alinhamento Ponta a Ponta de UI, Server Functions (BFF), Schemas Zod e Banco de Dados Físico
- **Autor / Agente Responsável:** spec-writer / design-system-architect
- **Data de Aprovação:** 2026-10-24
- **Status:** APROVADO

---

## 1. Missão, Escopo e Não-Objetivos
- **Missão:** Garantir que todo componente de UI se alimente exclusivamente de fontes de dados canônicas, assegurando correspondência exata entre telas, funções BFF (`*.functions.ts`), schemas Zod, unicidade estrita de tipos (SSOT) e tabelas físicas do PostgreSQL em `supabase/migrations/`, eliminando qualquer dado sintético ou tipo concorrente.
- **Escopo Incluído:**
  * `docs/specs/SPEC-CANONICAL-SSOT-BFF-CONTRACTS-AND-UI-MATCH.md` (Criação da spec EARS)
  * `src/types/corporate-travel.ts` (Desambiguação e unificação de tipos concorrentes com a SSOT)
  * `scripts/check-bff-table-contracts.mjs` (Resiliência nativa com verificação das 577 tabelas referenciadas pelo BFF)
  * `docs/design/DECISIONS.md` (Registro da decisão arquitetural DEC-302)
- **Não-Objetivos:**
  * Não renomear tabelas físicas no banco de dados sem migração estruturada.
  * Não alterar DTOs de pagamento de alto impacto fora do escopo atômico de tipagem.

---

## 2. Requisitos EARS (Easy Approach to Requirements Syntax)
- **Ubíquo (EARS-01):** Toda tabela referenciada por qualquer Server Function BFF através de `.from("...")` DEVE possuir declaração física prévia em `supabase/migrations/*.sql`, garantindo integridade relacional absoluta.
- **Ubíquo (EARS-02):** Todo tipo ou interface exportado em `src/` DEVE ser único no repositório, sendo expressamente vedada a declaração concorrente de tipos com o mesmo identificador em múltiplos arquivos.
- **Orientado a Estado (EARS-03):** ENQUANTO uma rota estiver exibindo dados operacionais ou cadastrais, o sistema DEVE consumir propriedades validadas a partir do DTO canônico do BFF, sendo terminantemente proibido o uso de mocks ou fallbacks sintéticos no cliente.
- **Exceção (EARS-04):** SE uma Server Function BFF tentar consultar uma tabela ou relação não declarada no catálogo de migrations, ENTÃO o validador de contratos (`check-bff-table-contracts.mjs`) DEVE abortar o processo com falha de integração.

---

## 3. Matriz de Contratos e Verificação
- [x] 532 migrations analisadas com 730 tabelas declaradas.
- [x] 577 tabelas referenciadas por BFF com 0 ausências locais (100% de correspondência).
- [x] 0 duplicidades de tipos concorrentes em `src/` (Unicidade SSOT 100%).
- [x] Grafo de dependências vertical estritamente acíclico (0 ciclos).
- [x] 0 arquivos órfãos / código morto na árvore de roteamento.

---

## 4. Arquivos Impactados e Limites de Alteração
| Arquivo | Ação Prevista | Justificativa Técnica |
| :--- | :--- | :--- |
| `docs/specs/SPEC-CANONICAL-SSOT-BFF-CONTRACTS-AND-UI-MATCH.md` | Criar | Especificação formal EARS do alinhamento de dados e contratos |
| `src/types/corporate-travel.ts` | Modificar | Resolução de duplicidade de tipos (`TravelerDocumentType`, `TravelTaskStatus`, `TravelTaskPriority`) |
| `scripts/check-bff-table-contracts.mjs` | Modificar | Resiliência nativa sem dependências externas para auditoria das 577 tabelas |
| `docs/design/DECISIONS.md` | Modificar | Registro canônico DEC-302 |

---

## 5. Critérios de Aceite e Evidências Esperadas
1. `node scripts/check-bff-table-contracts.mjs` aprovado com 577 tabelas mapeadas e 0 ausentes.
2. `node scripts/check-type-duplications.mjs` aprovado com 0 duplicidades em 2.236 arquivos.
3. `node scripts/check-schema-consolidation.mjs` aprovado com 532 migrations e versões únicas.
4. `node scripts/check-circular-deps.mjs` aprovado com 0 dependências circulares.
5. `node scripts/dead-code-detector.mjs` aprovado com 0 arquivos órfãos.
6. Registro de DEC-302 em `docs/design/DECISIONS.md`.
