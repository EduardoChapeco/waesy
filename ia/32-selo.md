# ia/32-selo.md — Selo de Entrada e Congelamento do Estado (Prompt 32)

> Data de Emissão: 2026-09-30T21:42:00-03:00  
> Prompt Mestre Ativo: PROMPT 32 — Recuperação End-to-End, Conformidade e Escala  
> Referência de Conformidade: AGENTS.md, DESIGN.md, DESIGN-LINT.md

---

## 1. Identificação do Repositório e Commit
- **Commit Atual:** `c0a95b7b73f406f491527c6335dc8eb74d594f04`
- **Branch:** `main`
- **Total de Rotas em `src/routes`:** 385 rotas (.tsx e .ts)
- **Total de Migrations em `supabase/migrations`:** 412 arquivos .sql
- **Total de Arquivos sob Inspeção em `src/`:** 1.515 arquivos

---

## 2. Resultado dos Portões de Verificação (Zero Tolerância)
| Portão de Verificação | Comando de Execução | Resultado | Status |
| :--- | :--- | :--- | :--- |
| **TypeScript Typecheck** | `cmd /c npm run typecheck` | 0 erros em 1.461 arquivos | **APROVADO (Exit Code 0)** |
| **Testes Nucleares Vitest** | `node ./node_modules/vitest/vitest.mjs run` | 835/835 testes aprovados (125 suítes) | **APROVADO (Exit Code 0)** |
| **Suíte Normativa Design Lint** | `node scripts/design-lint.test.mjs` | 44/44 testes normativos aprovados | **APROVADO (Exit Code 0)** |
| **Catraca de Design (Ratchet)** | `node scripts/design-lint.mjs --ratchet` | 0 regressões visuais | **APROVADO (Exit Code 0)** |
| **Compilação de Produção** | `npm run build` | Assets Vite + Worker Nitro | **HOMOLOGADO** |

---

## 3. Baseline Congelada de Débito Visual (`design-lint.baseline.json`)
| Severidade | Descrição Normativa | Contagem Congelada | Ação do Gate de CI |
| :--- | :--- | :--- | :--- |
| **P0** | Falhas Críticas / `!important` / A11y Visible Focus | 7.407 | Bloqueia Entrega se aumentar |
| **P1** | Tokens / Spacing / Touch Target < 44px / Empty-Loading | 19.155 | Bloqueia Merge se aumentar |
| **P2** | Z-index / Raios / Grids / Duração > 300ms / Emojis | 12.042 | Fila de Correção Contínua |
| **P3** | Transições Genéricas (`transition-all`) | 1.599 | Polimento Progressivo |
| **TOTAL** | Débito Total Catalogado | **40.203** | **Catraca Ativa (Delta <= 0)** |

---

## 4. Distribuição do Débito Visual por Módulo
| Módulo Arquitetural | Total | P0 | P1 | P2 | P3 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `components/app` | 13.598 | 2.189 | 7.241 | 3.564 | 604 |
| `routes/workspace` | 10.095 | 1.980 | 4.068 | 3.748 | 299 |
| `routes/store` | 7.692 | 1.248 | 3.503 | 2.509 | 432 |
| `components/tourism` | 2.828 | 446 | 1.522 | 785 | 75 |
| `routes/admin` | 2.745 | 458 | 1.423 | 741 | 123 |
| `services` | 905 | 584 | 239 | 80 | 2 |
| `components/ui` | 900 | 127 | 585 | 157 | 31 |
| `routes/other` | 560 | 78 | 238 | 230 | 14 |
| `components/builder` | 370 | 109 | 139 | 105 | 17 |
| `lib` | 257 | 76 | 105 | 76 | 0 |
| `components/chat` | 133 | 20 | 74 | 37 | 2 |
| `styles` | 68 | 62 | 0 | 6 | 0 |
| `hooks` | 27 | 13 | 10 | 4 | 0 |
| `routes/api` | 21 | 15 | 6 | 0 | 0 |
| `core` | 4 | 2 | 2 | 0 | 0 |

---

## 5. Compromissos e Leis da Sessão (Prompt 32)
1. **L1:** Diagnóstico e correção em fases separadas.
2. **L2:** Proibido remendar (sem catch vazio, sem timeout ampliado, sem dado padrão mascarando falta).
3. **L3:** Proibido reduzir capacidade para funcionar (preservar 100% dos recursos avançados).
4. **L4:** Toda afirmação termina em `arquivo:linha`, comando com saída ou captura verificada.
5. **L5:** Migrações 100% aditivas e idempotentes.
6. **L6:** Uma unidade de trabalho por vez, com prova antes e depois.
7. **L7:** Memória persistida em disco (`ia/`, `docs/design/`).
8. **L8:** Veto do conselho executivo respeitado.
