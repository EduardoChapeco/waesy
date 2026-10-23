# SPEC-PARALLEL3-01 — Remediação do Builder Inspector

## 1. Escopo

Esta frente remedia exclusivamente `src/components/admin/builder/builder-inspector.tsx`, partindo de `37cd62754b1a5c049a44fe747e9f684702053b2a`, no worktree `/home/ubuntu/waesy-parallel3-builder-inspector` e branch `paralelo3/builder-inspector`.

O agrupamento comprovado na baseline isolada contém 80 achados P0/P1:

- **P0 — 22:** DL-15, controles nativos sem `:focus-visible`.
- **P1 — 58:** DL-01 (7 cores literais), DL-02 (40 classes arbitrárias) e DL-14 (11 alvos abaixo de 44px).

O trabalho cobre foco visível, área tátil, consumo de tokens canônicos e remoção de valores arbitrários somente onde os achados foram observados. As transições genéricas P3, o overflow horizontal P3 e o grid P2 ficam fora do escopo desta frente para preservar foco e evitar mudanças não comprovadas no comportamento.

## 2. Requisitos em sintaxe EARS

### [REQ-PARALLEL3-01] Foco de teclado

- **Quando** um botão nativo ou controle clicável do Inspector receber foco por teclado, **o componente deve** expor um anel `:focus-visible` contrastante sem remover os callbacks existentes.

### [REQ-PARALLEL3-02] Área tátil

- **Quando** um controle do Inspector for renderizado em viewport compacto, **o componente deve** manter área mínima de 44x44px usando classes canônicas de piso tátil, preservando ícones, rótulos e ações atuais.

### [REQ-PARALLEL3-03] Tokens visuais

- **Quando** o Inspector declarar tipografia, dimensões, espaçamento ou cores de fallback, **o componente deve** consumir tokens/classes canônicas e não declarar hexadecimais ou utilitários arbitrários entre colchetes.

### [REQ-PARALLEL3-04] Edição e callbacks

- **Enquanto** qualquer aba, campo ou atalho de edição for usado, **o componente deve** manter inalterados os contratos de props, rotas/dados, nomes de seções, campos, valores persistidos e callbacks `updateNode`, `setNodes`, `setInspectorTab` e `setSelectedNodeId`.

### [REQ-PARALLEL3-05] Estados honestos

- **Quando** o Inspector não possuir nó/manifests selecionados, **o componente deve** continuar renderizando o estado vazio existente; **quando** houver dados reais de manifest, nó, páginas, coleções ou categorias, **o componente deve** preservar os estados condicionais atuais sem inserir dados sintéticos.

## 3. Invariantes

1. O único arquivo de implementação autorizado é `src/components/admin/builder/builder-inspector.tsx`.
2. O único documento adicional autorizado é esta spec; `DECISIONS.md`, lockfiles, relatórios gerados e arquivos de módulos vizinhos não podem ser alterados.
3. Props, tipos exportados, abas, callbacks, contratos de `updateNode`, estruturas `content`, `layout_rules`, `design_tokens` e `data_bindings` permanecem compatíveis.
4. Nenhum dado novo, fallback sintético, rota nova ou mudança de regra de negócio é criado.
5. Não são usados `!important`, cores hex/rgb/hsl literais no TSX, classes arbitrárias entre colchetes ou controles interativos sem `:focus-visible`.
6. O diff deve ser cirúrgico e limitado à remediação dos achados comprovados, sem reescrever o componente inteiro.

## 4. Critérios de aceite e evidências

- [ ] O diff contém somente a implementação autorizada e esta spec.
- [ ] A auditoria isolada de `builder-inspector.tsx` não possui violações P0/P1 DL-01, DL-02, DL-14 ou DL-15.
- [ ] `git diff --check` termina com código 0.
- [ ] `npm run typecheck` termina com código 0.
- [ ] O lint determinístico isolado do arquivo termina com código 0 para o escopo remediado, sem alterar baseline, dashboard ou relatório.
- [ ] O commit é `fix(design): remediate builder-inspector`.
- [ ] Nenhum push ou merge é executado.
