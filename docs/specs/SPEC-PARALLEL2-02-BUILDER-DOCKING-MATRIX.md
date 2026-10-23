# SPEC-PARALLEL2-02-BUILDER-DOCKING-MATRIX — Remediação de Docking

## 1. Identificação

- **ID:** SPEC-PARALLEL2-02-BUILDER-DOCKING-MATRIX
- **Data:** 2026-10-23
- **Status:** Aprovado para implementação
- **Base:** `b27deabf`
- **Branch:** `paralelo2/builder-docking-matrix`
- **Arquivo de implementação autorizado:** `src/components/admin/builder/builder-docking-matrix.tsx`
- **Artefato desta especificação:** `docs/specs/SPEC-PARALLEL2-02-BUILDER-DOCKING-MATRIX.md`

## 2. Escopo e diagnóstico comprovado

Esta especificação limita a remediação aos achados determinísticos P0/P1 comprovados no componente de matriz de docking:

- **DL-15 (P0):** o botão de cada posição não declara anel de foco visível `focus-visible:ring-2`.
- **DL-14 (P1):** cada botão usa `size-6`, abaixo do piso tátil de 44px.
- **DL-02 (P1):** o valor textual usa a classe arbitrária `text-[10px]`.

O escopo não altera regras de posicionamento, a ordem ou os IDs de `POSITIONS`, o valor padrão, os tipos, as props, o callback `onChange`, rotas, contratos ou dados. Achados P2/P3 não fazem parte desta remediação atômica.

## 3. Requisitos EARS

### 3.1 Requisitos sempre ativos

- **REQ-UBI-01 — Contrato:** O componente DEVE preservar `DockingPosition`, `BuilderDockingMatrixProps`, `value`, `onChange`, o valor padrão `center` e a tabela canônica de nove posições.
- **REQ-UBI-02 — Posicionamento:** A matriz DEVE continuar renderizando as nove posições na mesma ordem e cada ativação DEVE chamar `onChange` com o mesmo `pos.id`.
- **REQ-UBI-03 — Tokens:** O componente NÃO DEVE conter classes arbitrárias de tipografia nem cores literais; o valor exibido DEVE consumir classe tipográfica canônica existente.
- **REQ-UBI-04 — Acessibilidade:** Todo botão de posição DEVE possuir área mínima de toque de 44x44px e anel de foco de teclado com `focus-visible:ring-2` e token de anel.

### 3.2 Requisitos orientados a evento

- **REQ-EVT-01 — Foco:** QUANDO um botão receber foco por teclado, O sistema DEVE exibir um anel de foco visível sem depender de `onFocus` ou estado adicional.
- **REQ-EVT-02 — Seleção:** QUANDO um botão for ativado, O sistema DEVE manter exatamente o callback existente com a posição correspondente, sem introduzir dados ou efeitos colaterais.

### 3.3 Requisitos de estado

- **REQ-STA-01 — Seleção:** ENQUANTO `value` corresponder a uma posição, O botão correspondente DEVE manter o estado visual selecionado; posições não selecionadas DEVEM manter o estado visual não selecionado.
- **REQ-STA-02 — Fallback:** ENQUANTO `value` for omitido, O componente DEVE continuar selecionando `center` por meio do default existente.

## 4. Invariantes e não escopo

- A grade permanece 3x3, com os mesmos contêineres, classes de posicionamento, IDs e labels.
- Não criar dados sintéticos, alterar a tabela de posições, modificar rotas ou ampliar APIs.
- Não alterar `DECISIONS.md`, lockfiles, relatórios gerados ou qualquer outro arquivo estrutural.
- Não corrigir achados fora dos P0/P1 listados nesta especificação.

## 5. Critérios de aceite e evidências

1. `git diff --check` retorna código 0.
2. `npm run typecheck` retorna código 0.
3. Lint determinístico direcionado ao arquivo retorna zero violações P0/P1, incluindo DL-14, DL-15 e DL-02.
4. A inspeção do diff confirma que tipos, props, callbacks, rotas, contratos, dados e regras de posicionamento permanecem inalterados.
5. O commit final usa a mensagem exata `fix(design): remediate builder-docking-matrix` e contém somente os dois arquivos autorizados.
