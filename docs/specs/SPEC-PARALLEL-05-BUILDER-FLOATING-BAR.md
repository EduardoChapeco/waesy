# SPEC-PARALLEL-05 — Builder Floating Bar

## Identificação e preflight

- **Frente:** `paralelo/builder-floating-bar`
- **Base:** `2dd4aad8` (`HEAD` de `/home/ubuntu/waesy-design-remediation`)
- **Worktree:** `/home/ubuntu/waesy-parallel-builder-floating-bar`
- **Escopo autorizado:** `src/components/admin/builder/builder-floating-action-bar.tsx`
- **Documento autorizado adicional:** este arquivo
- **Preflight:** worktree limpo antes da mutação; `AGENTS.md`, `docs/design/DESIGN.md`, `docs/design/DESIGN-LINT.md` e o componente foram lidos integralmente.
- **Regra de governança:** não alterar `DECISIONS.md`, lockfiles, relatórios gerados ou qualquer arquivo fora do escopo.

## Objetivo

Remediar somente as violações P0/P1 comprovadas na barra flutuante do Builder, preservando a API TypeScript, as ações existentes, a propagação controlada de eventos, as condições de renderização e os dados recebidos.

## Escopo

### Incluído

1. Garantir anel de foco visível (`:focus-visible`, 2px) no contêiner que contém o guard de clique e em todos os botões nativos da barra (DL-15, P0).
2. Elevar os alvos táteis dos seis comandos existentes para a escala canônica de 44px (`h-11`/`min-h-11` ou `size-11`) sem alterar seus callbacks (DL-14, P1).
3. Substituir a classe tipográfica arbitrária do badge por um token tipográfico canônico (DL-02, P1).

### Fora do escopo

- Não remover nem adicionar comandos, atalhos, props, callbacks, estados, rotas, dados, confirmações ou mensagens.
- Não refatorar `builderRegistry`, o Canvas ou primitivas compartilhadas.
- Não corrigir o débito P2 existente de sombra (`shadow-xl`), pois o objetivo desta frente é P0/P1 e a remoção poderia alterar a superfície visual além da correção comprovada.
- Não atualizar `docs/design/DECISIONS.md` por estar explicitamente fora da autorização desta tarefa.

## Requisitos EARS

- **R1 — Quando** a barra for renderizada para um `selectedNode` existente, **o sistema deverá** manter o contêiner inline, a interrupção de propagação de clique e o mesmo `blockName` derivado do registry ou do `block_type`.
- **R2 — Quando** o teclado focalizar qualquer controle acionável da barra, **o sistema deverá** exibir um anel `focus-visible` de 2px, sem criar ação ou estado novo.
- **R3 — Quando** qualquer ação da barra for renderizada, **o sistema deverá** oferecer área tátil mínima de 44x44px nos dois botões textuais e nos quatro botões icônicos, mantendo ícones, títulos e callbacks atuais.
- **R4 — Quando** o badge do tipo de bloco for renderizado, **o sistema deverá** usar somente escala tipográfica canônica, sem classe Tailwind arbitrária entre colchetes.
- **R5 — Se** `selectedNode` for falsy, **o sistema deverá** continuar retornando `null` sem renderizar a barra.
- **R6 — Se** `onMoveUp` ou `onMoveDown` estiver ausente, **o sistema deverá** continuar omitindo somente o respectivo comando, sem inventar fallback ou estado.

## Invariantes de contrato

- A interface `BuilderFloatingActionBarProps` permanece idêntica, inclusive `selectedNode: any`, callbacks obrigatórios e callbacks opcionais.
- `onEditContent`, `onChangeLayout`, `onDuplicate`, `onDelete`, `onMoveUp` e `onMoveDown` continuam sendo os únicos eventos acionados pelos respectivos controles.
- `onClick={(e) => e.stopPropagation()}` do contêiner permanece semanticamente equivalente para impedir a seleção/click do Canvas pai.
- A ordem e a presença condicional dos comandos permanecem: Editar, Layout, divisor, mover para cima (opcional), mover para baixo (opcional), duplicar e excluir.
- Nenhum dado, rota, registro, atalho externo ou contrato de TypeScript é criado ou alterado.
- Nenhum valor de cor literal, classe arbitrária ou modificador de força bruta é introduzido.

## Critérios de aceite

1. O diff altera somente o componente autorizado e esta spec.
2. A inspeção targeted de `lintSource` não reporta DL-15 (P0), DL-14 (P1) ou DL-02 (P1) no componente.
3. Permanecem zero `focus-visible` ausentes nos elementos acionáveis detectados pelo lint e nenhum `h-7`/`size-7` em botões da barra.
4. `git diff --check` termina com código 0.
5. `npm run typecheck` termina com código 0; se houver falha preexistente e independente do diff, ela será registrada explicitamente na validação e no retorno.
6. A revisão final confirma preservação dos props, eventos, ordem, renderização condicional e `selectedNode` guard.
7. É criado o commit `fix(design): remediate builder-floating-bar`, sem push ou merge.

## Evidência esperada

- Baseline targeted antes da edição: DL-07 P2 em `shadow-xl`; DL-02 P1 em `text-[10px]`; DL-15 P0 no guard de clique e nos seis botões; DL-14 P1 em `h-7` nos dois botões textuais e `size-7` nos quatro botões icônicos.
- Pós-edição: saída targeted do mesmo lint, `git diff --check`, `npm run typecheck`, `git status --short` e `git show --stat --oneline HEAD` no commit final.
- Relatórios automáticos do lint não serão gerados nem versionados nesta frente.

## Evidência registrada

- O lint targeted pós-edição reportou **0 P0**, **0 P1** e somente o débito P2 preexistente `DL-07` em `shadow-xl`.
- `git diff --check` passou sem achados.
- A primeira execução de `npm run typecheck` não iniciou o compilador porque este worktree não possuía `node_modules` (`MODULE_NOT_FOUND` para `typescript/bin/tsc`), condição ambiental independente do diff. A repetição do mesmo comando com link temporário, não versionado, para as dependências já instaladas no worktree base passou com código 0; o link foi removido em seguida.
