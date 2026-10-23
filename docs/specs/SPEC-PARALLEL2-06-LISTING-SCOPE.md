# Spec Listing Scope

**ID:** PARALLEL2-06
**Branch:** `paralelo2/listing-scope`
**Base:** `b27deabffa771d734dbae5322278bba9f6ae05de`
**Escopo autorizado:** `src/components/ad-engine/editor/sections/listing-scope-section.tsx`
**Documento autorizado adicional:** este arquivo

## Objetivo

Remediar os achados comprovados P0/P1 de foco visível, alvos táteis, identificação de campos e estado vazio na seção de escopo do anúncio, sem mudar o escopo funcional nem o contrato do editor.

## Entradas e saídas

- **Entradas:** `niche`, `inclusions`, `exclusions` e os callbacks já definidos em `ListingScopeSectionProps`.
- **Saídas:** os mesmos itens existentes, nas mesmas listas, por meio dos mesmos callbacks; a seção continua permitindo adicionar por sugestão ou campo personalizado e remover itens.
- **Estados de apresentação:** listas vazias recebem uma mensagem honesta de estado vazio; listas preenchidas continuam exibindo somente os valores recebidos.
- **Artefatos:** somente o componente autorizado e esta especificação podem ser alterados.

## Requisitos EARS

- **Quando** um controle nativo de sugestão receber foco por teclado, **então** deverá expor anel `:focus-visible` contrastante sem depender apenas de hover.
- **Quando** qualquer controle de sugestão, adição, remoção ou entrada de texto for exibido em viewport compacto, **então** deverá possuir área mínima de toque de 44 x 44 px (`min-h-11`/`min-w-11` ou dimensão canônica equivalente).
- **Quando** um campo de inclusão ou exclusão for renderizado, **então** deverá possuir nome acessível explícito, mantendo seu placeholder e seu fluxo de Enter atuais.
- **Quando** a coleção de inclusões ou exclusões estiver vazia, **então** deverá ser renderizado um estado vazio descritivo, sem inserir item, valor padrão ou dado sintético.
- **Quando** a coleção tiver itens, **então** os itens, a ordem, a deduplicação, a remoção e os callbacks deverão permanecer inalterados.
- **Quando** houver transição visual nos controles de sugestão, **então** deverá existir alternativa para movimento reduzido (`motion-reduce:transition-none`).

## Invariantes

1. Não alterar `ListingScopeSectionProps`, tipos, nomes de props, callbacks, rotas, dados de sugestão ou contratos de anúncio.
2. Não introduzir persistência, queries, estados assíncronos, dados sintéticos ou novas regras de negócio.
3. Não alterar a semântica de trim, deduplicação, append, remoção por índice ou limpeza dos campos após inclusão válida.
4. Preservar os caminhos de interação por clique e pela tecla Enter.
5. Usar somente tokens/classes canônicas existentes; não adicionar cores literais, valores arbitrários, `!important` ou arquivos fora do escopo.
6. Não alterar `docs/design/DECISIONS.md`, lockfiles, relatórios gerados ou qualquer outro arquivo.

## Critérios de aceite e evidências

- `git diff --check` sem erros.
- `npm run typecheck` com código de saída 0.
- Lint determinístico do arquivo com zero achados P0/P1 pertinentes ao componente, incluindo foco visível, alvo tátil e movimento reduzido.
- Diff restrito ao componente autorizado e a esta especificação.
- Commit final exatamente com a mensagem `fix(design): remediate listing-scope`.
