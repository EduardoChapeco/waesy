# SPEC-WAVE4 — Visualização pública canônica

## Escopo
Corrigir transição genérica e acessibilidade das miniaturas em `canonical-listing-view.tsx`.

## Invariantes
Props, callbacks, dados reais do anúncio, seleção de imagem, compra, contato e reserva permanecem inalterados.

## Critérios
- Miniaturas usam transição específica e suporte a movimento reduzido.
- Controles preservam `aria-label`, foco e alvos existentes.
- Nenhuma mídia, dado ou fallback sintético é criado.
- Typecheck, lint direcionado e `git diff --check` passam.
