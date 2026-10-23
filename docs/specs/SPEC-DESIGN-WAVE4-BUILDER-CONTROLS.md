# SPEC-DESIGN-WAVE4 — Controles do Builder

**Status:** Em execução
**Escopo:** `MediaUploader.tsx` e `ArrayBuilder.tsx`

Os dois componentes formam a base dos editores de conteúdo. A onda elimina superfícies decorativas e classes arbitrárias, garante foco e toque mínimo e preserva upload, presets, ordenação e edição dos campos.

## Critérios

| Área | Critério |
|---|---|
| Upload | Área vazia deve ser acionável por mouse e teclado, com foco visível. |
| Ações | Trocar, remover, presets e excluir item terão área mínima de 44px. |
| Campos | Input, select e textarea usarão alturas e dimensões tokenizadas. |
| Superfície | Sem gradiente radial, cores branco/preto literais ou `transition-all`. |
| Dados | Nenhuma mudança em callbacks, payloads, presets ou ordem dos itens. |

## Evidência

Typecheck, testes do Builder, build, design lint e `git diff --check`.
