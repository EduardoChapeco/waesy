# SPEC-20261103-DESIGN-LINT-FULL-REMEDIATION

## 1. Contexto
Inventário `docs/audits/DESIGN_LINT_INVENTORY_2026-11-03.md`: 2.921 violações (P1 2.238, P2 406, P3 277), 673 arquivos. O linter não mede contraste (DL-16/17) nem paleta Tailwind crua (amarelo/âmbar no módulo de turismo).

## 2. Requisitos (EARS)

- [REQ-LINT-01] O sistema DEVE verificar, em script determinístico (`scripts/contrast-audit.mjs`), a razão de contraste WCAG dos pares de tokens semânticos de `src/styles.css` nos modos light e dark (texto >= 4.5:1; primário contra fundo >= 3:1) e falhar com Exit 1 em regressão.
- [REQ-LINT-02] O linter DEVE detectar paleta Tailwind crua de aviso (`amber|yellow|lime`) como DL-33 (P1) e o código DEVE consumir os tokens `warning` e `warning-strong`.
- [REQ-LINT-03] QUANDO uma classe de espaçamento usar meio-passo (`0.5|1.5|2.5|3.5`), o código DEVE usar o passo inteiro de 4px mais próximo acima (DL-03).
- [REQ-LINT-04] O código NÃO DEVE usar `transition-all` (DL-27); DEVE usar `transition`.
- [REQ-LINT-05] Todo elemento interativo com altura/largura menor que 44px DEVE declarar `min-h-11 sm:min-h-0` (e `min-w-11 sm:min-w-0` para `size-*`/`w-*`), preservando o tamanho compacto >= 600px (DL-14, B.26).
- [REQ-LINT-06] Sombras decorativas (`shadow-sm|md|lg|xl|2xl`) DEVEM ser removidas de superfícies de aplicação; overlays DEVEM usar `shadow-overlay`.
- [REQ-LINT-07] Overflow horizontal DEVE usar a classe canônica `scroll-area-carousel` (DL-30).
- [REQ-LINT-08] Classes arbitrárias com colchetes DEVEM ser substituídas por utilitários nativos do Tailwind v4 ou utilitários canônicos de `styles.css` quando houver equivalente exato ou na grade de 4px (DL-02).
- [REQ-LINT-09] A baseline DEVE ser rebaixada ao final; nenhuma etapa PODE elevar o teto, exceto a inclusão declarada de DL-33.

## 3. Fora do escopo desta execução (exige decisão de produto/design)
DL-01 (hex em motores gráficos e templates), DL-05 (cores dinâmicas de marca por tenant), DL-18 (overlays sobre mídia), DL-11/12/13 (estados por tela).

## 4. Evidência
`node scripts/design-lint.mjs --ratchet` Exit 0 com total menor que 2.921; `npm run typecheck` sem novos erros além da baseline preexistente; `vitest` e `npm run build` Exit 0.
