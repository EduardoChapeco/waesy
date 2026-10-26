# SPEC-BIDIRECTIONAL-MOBILE-STACKS-AND-HIG-CONVERGENCE — Consolidação de Design Bidirecional, Stacks Mobile-First e Governança Apple HIG

## 0. Metadados e Controle
- **ID da Spec:** SPEC-301-BIDIRECTIONAL-HIG-CONVERGENCE
- **Título:** Consolidação do Design Bidirecional, Stacks Mobile-First Native App, Anti-Jank e Governança Visual Apple HIG
- **Autor / Agente Responsável:** spec-writer / design-system-architect
- **Data de Aprovação:** 2026-10-24
- **Status:** APROVADO

---

## 1. Missão, Escopo e Não-Objetivos
- **Missão:** Consagrar no corpus normativo (`AGENTS.md`, `DESIGN.md`, `apple-design`, `design-foundations`) a regra soberana de Design Bidirecional (CMS Master ⇄ Vitrine ⇄ Workspace), a metodologia de frontend mobile-first baseado em stacks nativas (iOS/Android HIG), as travas anti-jank/anti-sanfona (CLS < 0.01 com skeletons isomórficos 1:1), a erradicação de AI-smell, a inteligência anti-truncate em squircles e a disciplina anti-chunks de orçamento web.
- **Escopo Incluído:**
  * `docs/specs/SPEC-BIDIRECTIONAL-MOBILE-STACKS-AND-HIG-CONVERGENCE.md` (Criação da spec EARS)
  * `AGENTS.md` e `.agents/AGENTS.md` (Adição da Invariante B.48: Design Bidirecional, Stacks Mobile e Anti-Chunks)
  * `docs/design/DESIGN.md` (Seção C.20 e saneamento de classes de safe-area com colchetes)
  * `.agents/skills/apple-design/SKILL.md` (Expansão da matriz de tradução Apple HIG para o stack Waesy)
  * `.agents/skills/design-foundations/SKILL.md` (Inclusão de gates de bidirecionalidade e anti-jank)
  * `docs/design/DECISIONS.md` (Registro da decisão arquitetural DEC-301)
- **Não-Objetivos:**
  * Não refatorar endpoints de banco de dados ou schemas Zod de domínios não correlacionados.
  * Não alterar o comportamento da catraca de design lint já estabilizada em DEC-300.

---

## 2. Requisitos EARS (Easy Approach to Requirements Syntax)
- **Ubíquo (EARS-01):** Todo bloco de vitrine pública, hero, atalho rápido ou carrossel DEVE possuir espelho bilateral de configuração no Admin Master (`admin-master.*`) e no Workspace (`workspace.*`), proibindo dados e imagens estáticos hardcoded.
- **Ubíquo (EARS-02):** Todo contêiner de mídia assíncrona DEVE declarar proporção canônica fixada no CSS antes do carregamento dos dados, garantindo Cumulative Layout Shift nulo (CLS < 0.01).
- **Orientado a Estado (EARS-03):** ENQUANTO uma rota estiver em estado de carregamento de dados, o sistema DEVE renderizar skeletons geometricamente isomórficos (proporção 1:1 em relação à casca final populada), sendo expressamente vedado o uso de spinners soltos.
- **Orientado a Estado (EARS-04):** ENQUANTO a viewport for móvel (<600px), a interface DEVE operar sob o Mobile Native App Shell, concentrando controles na Thumb Zone inferior, convertendo diálogos em Bottom Sheets deslizantes de 100dvh e aplicando as classes canônicas `pt-safe-modal`, `top-safe-notch`, `px-mobile-edge` e `pb-safe`.
- **Opcional (EARS-05):** ONDE a viewport for expandida (>=840px), o sistema DEVE renderizar o Desktop Native App System com alta densidade informacional (split-views, sidebars de 280px, tabelas monoespaçadas com `tabular-nums` e atalhos de teclado).
- **Exceção (EARS-06):** SE um cartão squircle contiver textos extensos (títulos, preços, especificações), ENTÃO o sistema DEVE acomodar o conteúdo na íntegra através de escala tipográfica proporcional e quebra orgânica (`break-words text-wrap leading-tight`), utilizando truncamento estruturado multilinha (`line-clamp-2`) apenas onde o grid exigir controle rigoroso de altura, proibindo reticências cegas de linha única (`truncate`).

---

## 3. Matriz de Estados e Acessibilidade (WCAG 2.2 AA)
- [x] Bidirecionalidade garantida entre Admin Master, Vitrine e Workspace.
- [x] Stacks móveis nativas com safe-areas canônicas e sem colchetes arbitrários.
- [x] Skeletons isomórficos 1:1 com CLS < 0.01.
- [x] Zero emojis no produto; títulos de tela <= 6 palavras; botões <= 3 palavras.
- [x] Touch targets móveis >= 44x44px (`h-11`).
- [x] Zero duplicação no DOM (`block md:hidden`).

---

## 4. Arquivos Impactados e Limites de Alteração
| Arquivo | Ação Prevista | Justificativa Técnica |
| :--- | :--- | :--- |
| `docs/specs/SPEC-BIDIRECTIONAL-MOBILE-STACKS-AND-HIG-CONVERGENCE.md` | Criar | Especificação formal EARS do ciclo de consolidação |
| `AGENTS.md` | Modificar | Adição da Invariante B.48 |
| `.agents/AGENTS.md` | Modificar | Espelho estrito de `AGENTS.md` |
| `docs/design/DESIGN.md` | Modificar | Seção C.20 e higienização de colchetes de safe-area |
| `.agents/skills/apple-design/SKILL.md` | Modificar | Atualização de tradução HIG e alinhamento bidirecional |
| `.agents/skills/design-foundations/SKILL.md` | Modificar | Inclusão de gates de bidirecionalidade |
| `docs/design/DECISIONS.md` | Modificar | Registro canônico DEC-301 |

---

## 5. Critérios de Aceite e Evidências Esperadas
1. `node scripts/design-lint.test.mjs` PASS (45/45 testes).
2. `node scripts/design-lint.mjs --ratchet` PASS (0 regressões).
3. `git diff --check` PASS (código limpo sem quebras ou marcadores residuais).
4. Registro de DEC-301 em `docs/design/DECISIONS.md`.
