# SPEC-PARALLEL-01 — Builder Canvas

## Escopo

- **Base:** `2dd4aad8`.
- **Branch/worktree:** `paralelo/builder-canvas` em `/home/ubuntu/waesy-parallel-builder-canvas`.
- **Arquivos autorizados:**
  - `src/components/admin/builder/builder-canvas.tsx`
  - `docs/specs/SPEC-PARALLEL-01-BUILDER-CANVAS.md`
- **Fora de escopo:** drag, seleção de nós, persistência, props TypeScript, eventos de domínio, rotas, dados, `DECISIONS.md`, lockfiles, relatórios gerados e qualquer outro arquivo.

## Requisitos EARS

1. **Quando** o canvas ou uma ação de adicionar seção for renderizado, **o sistema deve** manter controles com área mínima de toque de 44 × 44 px, usando a escala canônica do Button (`h-11`, `min-h-11`, `min-w-11`) sem alterar seus callbacks.
2. **Quando** o elemento de descarte de seleção receber foco visível, **o sistema deve** expor um anel `focus-visible` de 2 px, preservando o descarte por clique e a propagação existente dos frames internos.
3. **Quando** o canvas for estilizado, **o sistema deve** usar utilitários tokenizados/canônicos e o utilitário `no-scrollbar`, sem classes utilitárias com valores arbitrários entre colchetes.
4. **Enquanto** o componente renderizar os modos desktop, mobile e story, **o sistema deve** preservar as três ramificações, as dimensões semânticas dos previews, os rótulos, os dados de tema e todos os eventos existentes.

## Invariantes

- `BuilderCanvasProps`, `ViewportMode`, defaults e assinaturas de callbacks permanecem inalterados.
- `setSelectedNodeId(null)` continua sendo disparado pelo clique no canvas; os frames continuam interrompendo a propagação; `ExperienceRenderer` continua recebendo os mesmos nós, modo de edição, dados transitórios e seleção.
- `onAddSection` continua sendo usado nos estados vazio e no rodapé dos modos que já o exibiam.
- Nenhum estado novo, dado sintético, persistência, rota ou regra de negócio é introduzido.
- Somente violações comprovadas DL-02, DL-14 e DL-15 neste arquivo serão removidas; outras superfícies do builder permanecem fora do escopo.

## Evidência da baseline

- **DL-02 (P1):** `builder-canvas.tsx` continha classes com valores arbitrários nas molduras (`max-w-[1440px]`, `min-h-[calc(...)]`, `w-[390px]`, `min-h-[844px]`, `w-[360px]`, `min-h-[640px]`) e nos seletores de scrollbar (`[scrollbar-width:none]`, `[-ms-overflow-style:none]`, `[&::-webkit-scrollbar]:hidden`).
- **DL-14 (P1):** os `Button` de estado vazio/rodapé declaravam `h-9` ou `h-8` no uso, abaixo do piso normativo de 44 px apesar do primitivo já possuir piso próprio.
- **DL-15 (P0):** o `<main>` possui `onClick` para limpar a seleção, mas não declarava `focus-visible`; a correção é apenas de affordance de foco, sem trocar o evento ou a seleção.
- O primitivo `Button` já fornece foco visível e piso base; os usos locais serão explicitamente compatíveis com o contrato para que o lint estático reconheça o piso no próprio componente.

## Critérios de aceite

- [ ] Nenhum utilitário entre colchetes permanece em `className` de `builder-canvas.tsx`.
- [ ] Nenhum `Button` do arquivo usa `h-8` ou `h-9`; ações recebem `h-11 min-h-11 min-w-11`.
- [ ] O elemento com `onClick` de limpeza de seleção declara `focus-visible:ring-2`.
- [ ] As props, os callbacks, a seleção, os frames e as ramificações de viewport permanecem semanticamente equivalentes.
- [ ] `git diff --check` passa.
- [ ] `npm run typecheck` passa; se houver falha preexistente, ela será registrada explicitamente com a saída e a ausência de relação com o diff.
- [ ] O commit é criado com a mensagem exata `fix(design): remediate builder-canvas`.

## Evidência esperada

- Diff restrito aos dois arquivos autorizados.
- Saída de `git diff --check` sem diagnóstico.
- Saída e exit code de `npm run typecheck` no worktree.
- Hash do commit final e `git status --short` limpo, sem push ou merge.
