# SPEC-WAVE4 — Seção de variantes

## Escopo
Corrigir foco visível, alvos táteis e alturas de campos em `listing-variants-section.tsx`.

## Invariantes
Props, tipos, callbacks, valores padrão, dados de partidas e variações, mutações e ordem de renderização permanecem inalterados.

## Critérios
- Ações e campos usam piso de 44px.
- Controles de ícone mantêm título e recebem foco visível.
- Nenhuma classe arbitrária ou transição genérica é introduzida.
- Typecheck, lint direcionado e `git diff --check` passam.
