# SPEC-DESIGN-WAVE2 — Shell administrativo acessível

**Status:** Em execução
**Escopo:** `src/components/admin/admin-shell.tsx`

O shell administrativo é uma superfície compartilhada e concentra violações P0/P1 de foco, toque e valores arbitrários. A onda normaliza apenas a camada visual e de interação, sem alterar rotas, permissões ou dados.

## Requisitos

| Regra | Critério |
|---|---|
| Foco | Links com mudança de estado e ações devem exibir `focus-visible:ring-2`. |
| Toque | Logout, retorno de módulo, navegação mobile e navegação inferior devem ter pelo menos 44px. |
| Tokens | Substituir classes arbitrárias de viewport, largura, altura, tipografia e largura máxima por tokens existentes. |
| Movimento | Remover `transition-all` da superfície compartilhada. |
| Conteúdo | Manter rótulos curtos e sem jargão interno. |

## Evidência

Typecheck, testes focados de shell, build, design lint e `git diff --check`.
