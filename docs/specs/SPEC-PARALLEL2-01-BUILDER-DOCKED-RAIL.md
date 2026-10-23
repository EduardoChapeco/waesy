# SPEC-PARALLEL2-01 — Builder Docked Rail

- **Data:** 2026-10-23
- **Branch:** `paralelo2/builder-docked-rail`
- **Base:** `b27deabf`
- **Arquivos autorizados:** `src/components/admin/builder/builder-docked-rail.tsx` e esta spec

## Escopo

Remediar somente os achados comprovados no rail acoplado do Builder relacionados a:

- **DL-15/P0:** ausência de foco visível nos dois controles interativos;
- **DL-14/P1:** os cinco controles de ferramentas usam `size-9` (36px), abaixo do piso tátil de 44px;
- **DL-02/P1:** tooltips usam `text-[10px]`, classe arbitrária;
- **Elevação:** sombras decorativas no rail e nos tooltips, sem alterar o docking.

A implementação deve manter a estrutura JSX, o conjunto e a ordem das ferramentas, os rótulos, ícones, props, tipos, callbacks, rotas e dados existentes. Não haverá criação de dados sintéticos nem alteração de seleção de painel.

## Requisitos EARS

1. **Quando** qualquer controle do rail receber foco por teclado, **o sistema deve** exibir um anel de foco visível de 2px, com tokens semânticos e sem depender de hover.
2. **Enquanto** os controles de ferramentas forem renderizados, **o sistema deve** manter cada alvo interativo com pelo menos 44x44px, sem reduzir o ícone visual nem alterar a largura do rail.
3. **Quando** os tooltips forem renderizados, **o sistema deve** usar somente classes tipográficas canônicas, sem valores arbitrários entre colchetes.
4. **Enquanto** o rail estiver montado, **o sistema deve** preservar `activePanel`, `onTogglePanel`, `nodesCount`, o fechamento por alternância e o estado local de `showShortcutHint` exatamente como no contrato atual.
5. **Quando** o arquivo for analisado pelo lint determinístico, **o sistema deve** produzir zero violações P0/P1 no arquivo e não introduzir transição genérica, sombra decorativa ou valor fora da grade no trecho alterado.

## Invariantes

- O `aside` continua sendo o rail acoplado de largura `w-12`, com `z-30`, posição e agrupamento atuais.
- Permanecem os IDs `add`, `layers`, `pages`, `design` e `cms`, seus rótulos, ícones e a contagem real de `nodesCount`.
- `onTogglePanel` continua recebendo o mesmo ID ou `null` conforme o estado ativo; nenhuma regra de seleção é reescrita.
- O botão de ajuda continua alternando apenas `showShortcutHint` e anunciando o mesmo texto acessível.
- Somente tokens utilitários existentes serão usados; nenhuma cor, dado, callback ou contrato novo será declarado.

## Critérios de aceite e evidências

- [ ] Especificação registrada antes da implementação.
- [ ] `git diff --check` retorna código 0.
- [ ] `npm run typecheck` retorna código 0.
- [ ] Lint determinístico executado em memória exclusivamente para `src/components/admin/builder/builder-docked-rail.tsx`, sem gerar ou alterar relatórios; resultado com zero P0/P1.
- [ ] `git status` contém apenas o componente autorizado e esta spec.
- [ ] Commit criado como `fix(design): remediate builder-docked-rail`.
- [ ] Não fazer push, merge, alteração de `DECISIONS.md`, lockfiles ou relatórios gerados.
