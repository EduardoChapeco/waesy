# SPEC-PARALLEL2-05 — Listing Modifiers

## Escopo

- **Base:** `b27deabffa771d734dbae5322278bba9f6ae05de`
- **Branch/worktree:** `paralelo2/listing-modifiers` / `/home/ubuntu/waesy-parallel2-listing-modifiers`
- **Arquivo de implementação autorizado:** `src/components/ad-engine/editor/sections/listing-modifiers-section.tsx`
- **Artefato autorizado:** este documento em `docs/specs/`.
- **Objetivo:** remediar os achados P1 de alvos táteis compactos nos campos e ações da seção, sem alterar o contrato funcional do editor.

A inspeção determinística isolada do arquivo reproduziu quatro ocorrências **DL-14 (P1)**: `h-8` na ação de criar grupo (linha 105), `size-8` na remoção de grupo (linha 149), `size-8` na remoção de opção (linha 179) e `h-8` na ação de adicionar opção (linha 191). A mesma revisão identificou overrides explícitos `h-9` nos dois `Input` e no `CurrencyField`, abaixo do piso canônico de campos de 44px; eles serão removidos para que as primitivas canônicas mantenham `h-11 min-h-11`.

## Invariantes

1. Não alterar interfaces, tipos, props, `niche`, ids, valores padrão, rótulos, rotas ou dados sintéticos.
2. Não alterar `onChange`, callbacks, índices, ordem das coleções, regras de adição/remoção/atualização ou qualquer mutação existente.
3. Preservar as primitivas `Input`, `CurrencyField`, `Button` e `Switch`, seus `variant`/`size`, ícones, títulos e semântica de botão.
4. Manter o comportamento de teclado, foco, `focus-visible`, disabled states e `motion-reduce` fornecidos pelas primitivas; não introduzir estilos literais, classes arbitrárias ou exceções de lint.
5. Corrigir somente os overrides de dimensão comprovadamente compactos: campos devem herdar o piso `h-11 min-h-11`; ações `Button` devem manter piso `min-h-11 min-w-11`/`size-11` das variantes canônicas.
6. O estado vazio e toda a estrutura JSX fora das dimensões dos controles permanecem inalterados.

## Critérios de aceite (EARS)

- **Quando** a seção renderizar um campo de nome ou preço, **então** o campo deverá manter área mínima de 44px usando a dimensão canônica da primitiva, sem mudar seu valor ou callback.
- **Quando** a seção renderizar criar, adicionar ou remover, **então** a ação deverá possuir alvo mínimo de 44x44px e manter o mesmo `type`, `variant`, `size`, label, ícone e callback.
- **Quando** o usuário editar, adicionar ou remover grupos/opções, **então** a sequência e o payload emitido por `onChange` deverão permanecer idênticos aos da baseline.
- **Quando** a validação for executada, **então** `git diff --check`, `npm run typecheck` e o lint determinístico do arquivo deverão passar; o arquivo não poderá apresentar violações P1/P0 novas.
- **Quando** o commit for criado, **então** somente o componente autorizado e esta spec poderão estar no commit, sem push ou merge.
