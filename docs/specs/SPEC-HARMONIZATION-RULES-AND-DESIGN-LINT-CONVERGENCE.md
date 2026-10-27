# SPEC-HARMONIZATION-RULES-AND-DESIGN-LINT-CONVERGENCE — Harmonização Normativa e Convergência de Regras

## 0. Metadados e Controle
- **ID da Spec:** SPEC-300-HARMONIZATION-RULES
- **Título:** Harmonização Normativa, Resolução de Contradições e Convergência de Regras e Design Lint
- **Autor / Agente Responsável:** spec-writer / design-system-architect
- **Data de Aprovação:** 2026-10-24
- **Status:** APROVADO

---

## 1. Missão, Escopo e Não-Objetivos
- **Missão:** Erradicar as 5 contradições sistêmicas identificadas entre as regras normativas (`AGENTS.md`, `.agents/rules/`), o catálogo de design lint (`DESIGN-LINT.md`), a especificação de tokens (`tokens.json`) e os validadores mecânicos (`design-lint.mjs`), alinhando a Definition of Done ao mecanismo de catraca (`--ratchet`) e introduzindo utilitários semânticos canônicos em `src/styles.css`.
- **Escopo Incluído:**
  * `docs/specs/SPEC-HARMONIZATION-RULES-AND-DESIGN-LINT-CONVERGENCE.md` (Criação da spec)
  * `src/styles.css` (Utilitários semânticos para safe-areas, viewports e margens canônicas)
  * `AGENTS.md` e `.agents/AGENTS.md` (Eliminação de classes com colchetes nos artigos B.8/B.34, desambiguação de DoD B.9 e esclarecimento de B.26/B.38/B.44)
  * `.agents/rules/01-mobile-physics-antijank.md` (Substituição de valores entre colchetes por tokens semânticos)
  * `docs/design/DESIGN-LINT.md` (Alinhamento dos raios DL-09 com `tokens.json` e contextualização de DL-14)
  * `scripts/design-lint.mjs` (Alinhamento do regex de raios DL-09 aos tokens `xl` e `2xl` de `tokens.json`)
  * `docs/design/DECISIONS.md` (Registro da decisão arquitetural DEC-300)
- **Não-Objetivos:**
  * Não refatorar telas e rotas que não fazem parte do núcleo normativo e de estilos.
  * Não enfraquecer portões de segurança P0 de acessibilidade (`focus-visible`) ou contraste.

---

## 2. Requisitos EARS (Easy Approach to Requirements Syntax)
- **Ubíquo (EARS-01):** O sistema DEVE fornecer utilitários CSS canônicos (`pt-safe-modal`, `top-safe-notch`, `px-mobile-edge`, `min-h-screen-dvh`) para todas as necessidades de safe-area e margens móveis, erradicando a necessidade de colchetes arbitrários em código de aplicação.
- **Ubíquo (EARS-02):** Toda regra textual em `AGENTS.md` e `.agents/rules/` DEVE prescrever estritamente classes de utilitário semânticas, proibindo exemplos com colchetes arbitrários (`-[...]`).
- **Orientado a Estado (EARS-03):** ENQUANTO o repositório contiver débitos visuais legados mapeados na baseline, a catraca mecânica (`--ratchet`) DEVE barrar qualquer regressão incremental (`newViolations = 0` nos arquivos modificados e `totalViolations <= baseline`).
- **Opcional (EARS-04):** ONDE a viewport for de desktop (`>=840px`) em áreas densas do Workspace e Admin, o sistema DEVE aceitar controles compactos secundários (`h-8`, `h-9` de 32px a 36px) em linhas de tabela, toolbars e paginações, mantendo o piso de 44px (`h-11`) obrigatório para a experiência móvel (<600px) e vitrines públicas.
- **Exceção (EARS-05):** SE um módulo utilizar raios previstos no catálogo de tokens `tokens.json` (`xl` = 16px, `2xl` = 24px) ou o padrão squircle B.44, ENTÃO o motor de auditoria DL-09 NÃO DEVE apontar falso-positivo de raio não-canônico.

---

## 3. Matriz de Estados e Conformidade
- [x] Zero conflito entre B.34 e DL-02 (Classes com colchetes substituídas por utilitários semânticos).
- [x] Zero conflito entre B.44 e DL-09 (Raios `xl` e `2xl` harmonizados com `tokens.json`).
- [x] Alinhamento explícito da Definition of Done (B.9) com o sistema de catraca (`--ratchet`).
- [x] Catraca do Design Lint validada sem nenhuma regressão.

---

## 4. Arquivos Impactados e Limites de Alteração
| Arquivo | Ação Prevista | Justificativa Técnica |
| :--- | :--- | :--- |
| `docs/specs/SPEC-HARMONIZATION-RULES-AND-DESIGN-LINT-CONVERGENCE.md` | Criar | Especificação formal EARS do ciclo de harmonização |
| `src/styles.css` | Modificar | Adição dos utilitários `@utility pt-safe-modal`, `top-safe-notch`, `px-mobile-edge`, `min-h-screen-dvh` |
| `AGENTS.md` | Modificar | Correção das 5 contradições normativas (C-01 a C-05) |
| `.agents/AGENTS.md` | Modificar | Espelho estrito de `AGENTS.md` |
| `.agents/rules/01-mobile-physics-antijank.md` | Modificar | Expurgar referências com colchetes em favor de tokens |
| `docs/design/DESIGN-LINT.md` | Modificar | Harmonização do catálogo normativo (DL-02, DL-09, DL-14) |
| `scripts/design-lint.mjs` | Modificar | Ajuste determinístico de DL-09 contra `tokens.json` |
| `docs/design/DECISIONS.md` | Modificar | Registro canônico DEC-300 |

---

## 5. Critérios de Aceite e Evidências Esperadas
1. Execução de `node scripts/design-lint.mjs --ratchet` aprovada com zero regressões.
2. Débito global de violações reduzido ou mantido idêntico com catraca intacta.
3. Consistência 100% verificada entre `AGENTS.md`, `.agents/rules/` e `docs/design/DESIGN-LINT.md`.
4. Registro de DEC-300 em `docs/design/DECISIONS.md`.
