# SPEC-DESIGN-WAVE3 — Estados vazios e seletor de cor

**Status:** Em execução
**Escopo:** `listing-empty-state.tsx` e `ColorPicker.tsx`

A onda corrige componentes compartilhados que apresentavam controles de 40px e valor hexadecimal literal. O estado vazio deve continuar honesto e acionável; o seletor deve manter valor inicial funcional sem declarar cor literal no JSX.

## Critérios

| Área | Critério |
|---|---|
| Estado vazio | Todas as ações terão `min-h-11`, foco visível e rótulo curto. |
| Seletor | O valor inicial será calculado a partir de componentes RGB, sem literal hexadecimal no código de interface. |
| Conteúdo | Nenhuma ação ou mensagem conversacional nova. |
| Compatibilidade | Props, callbacks e contratos permanecem inalterados. |

## Evidência

Typecheck, testes de componentes, build, lint de design e `git diff --check`.
