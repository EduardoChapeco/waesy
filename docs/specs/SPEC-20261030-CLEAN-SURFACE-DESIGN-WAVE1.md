# SPEC-20261030 — Superfícies limpas e conteúdo direto, onda 1

## Objetivo

Padronizar a linguagem visual do Waesy para superfícies silenciosas, arredondadas e sem bordas decorativas, reduzindo aparência neon e removendo explicações conversacionais redundantes de componentes canônicos.

## Requisitos EARS

- Quando um componente for card, painel de conteúdo ou ação visual, o sistema deve usar superfície sem borda e sem sombra decorativa, separada por espaçamento, contraste tonal e raio semântico.
- Quando um botão for `default`, `outline`, `secondary` ou variante equivalente, o sistema deve manter o alvo tátil e foco visível sem desenhar borda como affordance primária.
- Quando um controle for input, select, tabela ou estado de erro, o sistema pode manter contorno funcional mínimo para comunicar edição, foco ou falha.
- Quando um modal ou sheet abrir, o sistema deve usar título direto, espaço curto e ação imediata; `DialogDescription` não deve carregar texto de boas-vindas, instruções óbvias ou promessa de produto.
- Quando uma superfície utilizar acento institucional, o sistema deve preferir cor sólida tokenizada; gradientes, glow, noise e cores elétricas não podem dominar uma superfície utilitária.

## Escopo autorizado

- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/design-system/primitives/card.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/sheet.tsx`
- `src/components/ui/choice-card.tsx`
- `src/components/ui/module-tour-modal.tsx`
- `src/components/shell/beta-explanation-modal.tsx`
- `src/components/workspace/welcome-onboarding-modal.tsx`
- `src/routes/admin-master.marca.tsx`
- `src/styles.css`
- `docs/design/DESIGN.md`
- `docs/design/DECISIONS.md`

## Invariantes

- Nenhuma capacidade de produto, CTA ou fluxo é removida.
- Arredondamento, foco visível, contraste e alvos de toque de 44px permanecem.
- Inputs, tabelas e estados de erro não perdem indicação funcional de foco ou validação.
- O primitivo não pode introduzir `border-2`, `border-4`, `shadow-*` decorativo ou gradiente neon.
- O texto funcional dos modais permanece disponível; somente redundância conversacional é eliminada em ondas posteriores.

## Evidências

- Auditoria determinística dos primitivos sem bordas decorativas nos cards e botões.
- Lint focado dos arquivos alterados sem erros.
- Testes de componentes de botão/card/modal existentes aprovados quando disponíveis.
- Registro de decisão em `docs/design/DECISIONS.md`.
