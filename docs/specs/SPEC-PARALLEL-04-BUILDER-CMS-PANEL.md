# SPEC-PARALLEL-04: Remediação do Painel CMS do Builder

## 1. Escopo

Esta microfase altera exclusivamente `src/components/admin/builder/builder-cms-panel.tsx` e cria esta especificação. O objetivo é remover violações comprovadas de design no painel de coleções CMS, sem modificar suas operações.

### Incluído

- Substituir classes tipográficas arbitrárias e controles menores que o piso tátil canônico.
- Adicionar foco visível aos controles interativos do painel.
- Remover sinais de texto genérico ou prolixo de interface somente quando a substituição preservar o significado operacional existente.
- Remover imports sem uso no arquivo quando não houver impacto no contrato.

### Excluído

- Alteração de props, tipos, valores padrão, rotas, URLs de gerenciamento, `blockType`, `bindingSource`, contagens, callbacks, toast ou sequência de eventos.
- Criação de estados, dados CMS, queries, fallbacks, componentes novos ou alterações em módulos vizinhos.
- Alteração de `DECISIONS.md`, lockfiles, relatórios gerados, configuração de lint ou qualquer arquivo fora do escopo autorizado.

## 2. Requisitos em Sintaxe EARS

### [REQ-PARALLEL-04-01] Contrato CMS

- **EARS (Ubíquo):** O componente deve manter a interface `BuilderCmsPanelProps`, os valores padrão existentes, as coleções e seus dados, as rotas `managementUrl`, o callback `onInsertDynamicBlock`, o callback `onClose` e a chamada de toast sem alteração semântica.

### [REQ-PARALLEL-04-02] Alvos táteis

- **EARS (Quando):** Quando o usuário visualizar ou alcançar por toque qualquer `Button` ou `Link` interativo deste painel, o controle deve possuir dimensão mínima de 44 px (`h-11` ou `min-h-11`, e `size-11` quando aplicável), sem remover a ação correspondente.

### [REQ-PARALLEL-04-03] Foco de teclado

- **EARS (Quando):** Quando um `Button` ou `Link` receber foco por teclado, o controle deve expor anel visível com `focus-visible:ring-2` e token de anel, sem depender de hover.

### [REQ-PARALLEL-04-04] Conteúdo e anti-AI-smell

- **EARS (Ubíquo):** A interface deve usar rótulos concisos e humanos, sem emojis, subtítulos autoexplicativos desnecessários ou linguagem promocional genérica, mantendo a identificação das coleções e das ações CMS.

### [REQ-PARALLEL-04-05] Tokenização

- **EARS (Ubíquo):** Classes de fonte, espaçamento, cor e foco devem consumir tokens/utilitários canônicos já disponíveis, sem valores arbitrários, cores literais ou novos tokens.

## 3. Invariantes

1. O componente continua renderizando as quatro coleções existentes na mesma ordem.
2. Cada ação de inserção continua chamando `onInsertDynamicBlock(col.blockType, col.bindingSource, col.title)` uma única vez e exibindo o toast de sucesso correspondente.
3. Cada link de gerenciamento continua apontando para o mesmo `managementUrl`.
4. Nenhuma prop, evento, rota, dado, tipo ou contrato TypeScript é removido ou renomeado.
5. Nenhuma solução adiciona estados assíncronos, estados vazios, carregamento, erro ou dados sintéticos não existentes.
6. O escopo de arquivos permanece limitado ao componente autorizado e a esta spec.

## 4. Evidência de baseline

- Base: `2dd4aad8bc0fcdbee34499f4384db5f4b74bccf4`.
- O relatório de design lint na base registra no alvo classes arbitrárias `text-[10px]` e `text-[11px]` (DL-02) e o CTA com `h-7` (DL-14).
- A inspeção do código comprova `Link` sem classe `focus-visible:ring-2` e `Button` com `onClick` sem foco explícito (DL-15), além do CTA com `h-7`.
- Os rótulos de ação tinham quatro palavras e o bloco "Live Data Binding" repetia, em jargão, o funcionamento da tela; ambos foram reduzidos sem tocar nos valores CMS ou na sequência de eventos.
- A inspeção manual não encontrou emojis no arquivo; portanto nenhuma substituição de emoji será inventada.
- Não há chamadas `useQuery` ou outra origem assíncrona no componente; DL-11 a DL-13 não fazem parte desta mudança.

## 5. Critérios de aceite

- [ ] O diff altera somente `src/components/admin/builder/builder-cms-panel.tsx` e cria esta spec.
- [ ] `git diff --check` passa no worktree exclusivo.
- [ ] `npm run typecheck` passa; qualquer falha preexistente deve ser registrada explicitamente na validação.
- [ ] A busca no diff não encontra emojis, classes de alvo abaixo de 44 px ou controles sem `focus-visible:ring-2`.
- [ ] Props, eventos, rotas, dados e sequência operacional permanecem equivalentes à baseline.
- [ ] O commit é `fix(design): remediate builder-cms-panel`.

## 6. Evidência de fechamento

No worktree exclusivo, `git diff --check` passou, `npm run typecheck` passou com Exit Code 0 e a função `lintSource` foi executada em memória somente para o componente, retornando zero violações. A busca de emojis no componente e nesta spec também retornou zero ocorrências.
