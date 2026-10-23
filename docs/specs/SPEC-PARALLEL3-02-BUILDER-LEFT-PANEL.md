# SPEC-PARALLEL3-02 — Remediação do Builder Left Panel

## 1. Identificação e controle

- **ID:** `SPEC-PARALLEL3-02-BUILDER-LEFT-PANEL`
- **Título:** Remediação de foco, toque, títulos e tokens do painel lateral do Builder
- **Data:** 2026-10-23
- **Status:** Aprovada para implementação
- **Base:** `37cd62754b1a5c049a44fe747e9f684702053b2a`
- **Branch:** `paralelo3/builder-left-panel`
- **Arquivo de implementação autorizado:** `src/components/admin/builder/builder-left-panel.tsx`
- **Artefato autorizado:** este documento

## 2. Escopo e não-objetivos

A remediação é limitada aos achados determinísticos comprovados no painel lateral do Builder. O objetivo é elevar o piso de acessibilidade e tokenização sem alterar navegação, seleção, catálogo ou dados.

- **Incluído:** anéis `focus-visible` nos controles nativos e no item de camada acionável; alvos táteis mínimos de 44px; nomes/títulos acessíveis dos controles de ícone; substituição de classes arbitrárias e transições genéricas por tokens canônicos.
- **Preservado:** tipos, props, callbacks, argumentos, rotas, ordem dos painéis, categorias, blocos, rótulos visíveis, títulos existentes e dados provenientes de `builderRegistry`.
- **Não-objetivos:** não criar dados sintéticos; não mudar a navegação entre `layers`/`blocks`; não mudar `selectedNodeId`, `blockCategory`, inserção, movimentação, exclusão ou reordenação; não alterar `DECISIONS.md`, lockfiles, relatórios gerados ou arquivos fora do escopo.

## 3. Diagnóstico comprovado da baseline

O lint determinístico isolado do arquivo na base registrou 20 achados:

- **DL-15 / P0:** 8 controles com `onClick` ou `<button>` sem anel `focus-visible`.
- **DL-14 / P1:** 2 CTAs com `h-10`, abaixo do piso de 44px.
- **DL-02 / P1:** 4 classes de tipografia arbitrárias (`text-[11px]`/`text-[10px]`).
- **DL-27 / P3:** 6 usos de `transition-all`, substituíveis por propriedades específicas sem alterar callbacks ou estados.

Não foi encontrado dado faltante que justifique inventar títulos, rótulos, callbacks ou itens de catálogo. Os títulos `title` dos controles de mover/excluir são contratos de acessibilidade existentes e devem permanecer.

## 4. Requisitos EARS

- **REQ-UBI-01 — Contrato:** O componente DEVE preservar `LeftPanelTab`, `BuilderLeftPanelProps`, `BLOCK_CATEGORIES`, props, callbacks, tipos e os mesmos argumentos e ordem de chamada.
- **REQ-UBI-02 — Navegação:** A troca entre os painéis DEVE continuar chamando somente `setActivePanel("layers")` ou `setActivePanel("blocks")` nos mesmos controles.
- **REQ-UBI-03 — Seleção:** A ativação de uma camada ou categoria DEVE preservar `setSelectedNodeId(node.id)` e `setBlockCategory(cat.id)` sem estado ou dado novo.
- **REQ-UBI-04 — Dados:** A lista de camadas, categorias e blocos DEVE continuar sendo renderizada a partir de `treeNodes`, `BLOCK_CATEGORIES` e `builderRegistry`, sem itens sintéticos ou alteração de ordem.
- **REQ-A11Y-01 — Foco:** QUANDO qualquer controle receber foco por teclado, O elemento DEVE expor `focus-visible:ring-2` com token de anel, sem depender de hover ou estado adicional.
- **REQ-A11Y-02 — Toque:** ENQUANTO o painel estiver em viewport compacto, todo botão ou controle acionável DEVE manter alvo mínimo de 44x44px por meio de `h-11`/`min-h-11` e, quando necessário, `min-w-11`.
- **REQ-A11Y-03 — Títulos:** Os controles de ícone DEVEM manter seus títulos existentes e nomes acessíveis; nenhum rótulo visível, `title` ou `aria-label` pode ser removido ou trocado por texto inventado.
- **REQ-TOKEN-01 — Classes:** O arquivo NÃO DEVE conter classes arbitrárias entre colchetes; tipografia, espaçamento e dimensões DEVEM usar tokens/utilitários canônicos.
- **REQ-TOKEN-02 — Movimento:** Onde houver transição, o componente DEVE declarar a propriedade específica e respeitar `motion-reduce:transition-none`, sem introduzir gradientes ou novas animações.

## 5. Invariantes e critérios de aceite

1. O diff contém somente `src/components/admin/builder/builder-left-panel.tsx` e este documento.
2. `git diff --check` retorna código 0.
3. `npm run typecheck` retorna código 0; qualquer falha de infraestrutura/dependência deve ser registrada separadamente, sem mascarar diagnóstico TypeScript.
4. O lint determinístico isolado do componente retorna zero violações P0/P1 e zero violações totais após a remediação.
5. A busca final confirma ausência de classes `-[...]`, `transition-all` e controles nativos/acionáveis sem `focus-visible:ring-2`.
6. A inspeção do diff confirma que rotas, props, tipos, callbacks, argumentos, seleção, navegação, catálogo, títulos existentes e dados permanecem semanticamente inalterados.
7. O commit final usa exatamente `fix(design): remediate builder-left-panel`; não fazer push nem merge.
